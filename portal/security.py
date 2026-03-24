from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(os.environ.get("SECURITY_DATA_DIR", Path(__file__).resolve().parent / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

USERS_DB_PATH = Path(os.environ.get("USERS_DB_PATH", DATA_DIR / "users.db"))
ADMIN_CREDENTIALS_PATH = Path(os.environ.get("ADMIN_CREDENTIALS_PATH", DATA_DIR / "admin_credentials.json"))

DEFAULT_ADMIN_LOGIN = os.environ.get("ADMIN_LOGIN", "admin")
DEFAULT_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change_me_12345")


@dataclass
class AdminCredentials:
    login: str
    password_hash: str


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_password(password: str, salt: bytes | None = None) -> str:
    used_salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), used_salt, 150_000)
    return f"pbkdf2_sha256$150000${base64.b64encode(used_salt).decode()}${base64.b64encode(digest).decode()}"


def _verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, iterations, salt_b64, digest_b64 = encoded_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64.encode())
        expected = base64.b64decode(digest_b64.encode())
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(digest, expected)
    except Exception:
        return False


def init_security_storage() -> None:
    _init_admin_credentials()
    _init_users_db()


def _init_admin_credentials() -> None:
    if ADMIN_CREDENTIALS_PATH.exists():
        return

    ADMIN_CREDENTIALS_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "login": DEFAULT_ADMIN_LOGIN,
        "password_hash": _hash_password(DEFAULT_ADMIN_PASSWORD),
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
    }
    ADMIN_CREDENTIALS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def load_admin_credentials() -> AdminCredentials:
    _init_admin_credentials()
    payload = json.loads(ADMIN_CREDENTIALS_PATH.read_text(encoding="utf-8"))
    return AdminCredentials(login=payload["login"], password_hash=payload["password_hash"])


def update_admin_credentials(current_login: str, new_login: str | None, new_password: str | None) -> None:
    credentials = load_admin_credentials()
    if credentials.login != current_login:
        raise ValueError("Текущий логин администратора не совпадает")

    login = new_login.strip() if new_login else credentials.login
    password_hash = _hash_password(new_password) if new_password else credentials.password_hash

    payload = {
        "login": login,
        "password_hash": password_hash,
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
    }
    ADMIN_CREDENTIALS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def verify_admin_credentials(login: str, password: str) -> bool:
    credentials = load_admin_credentials()
    return credentials.login == login and _verify_password(password, credentials.password_hash)


def _db_connection() -> sqlite3.Connection:
    USERS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(USERS_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_users_db() -> None:
    with _db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                name TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def list_users() -> list[dict[str, Any]]:
    with _db_connection() as conn:
        rows = conn.execute(
            "SELECT id, email, role, name, is_active, created_at, updated_at FROM users ORDER BY id"
        ).fetchall()
    return [dict(row) for row in rows]


def create_user(email: str, password: str, role: str, name: str | None = None) -> dict[str, Any]:
    now = _utc_now()
    password_hash = _hash_password(password)

    with _db_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO users (email, password_hash, role, name, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
            """,
            (email.strip().lower(), password_hash, role.strip(), name.strip() if name else None, now, now),
        )
        user_id = cursor.lastrowid
        conn.commit()

        row = conn.execute(
            "SELECT id, email, role, name, is_active, created_at, updated_at FROM users WHERE id = ?", (user_id,)
        ).fetchone()

    if row is None:
        raise RuntimeError("Пользователь не был создан")

    return dict(row)


def update_user(user_id: int, **fields: Any) -> dict[str, Any] | None:
    allowed = {"email", "password", "role", "name", "is_active"}
    invalid = set(fields).difference(allowed)
    if invalid:
        raise ValueError(f"Недопустимые поля: {', '.join(sorted(invalid))}")

    updates: list[str] = []
    values: list[Any] = []

    if "email" in fields:
        updates.append("email = ?")
        values.append(str(fields["email"]).strip().lower())
    if "password" in fields:
        updates.append("password_hash = ?")
        values.append(_hash_password(str(fields["password"])))
    if "role" in fields:
        updates.append("role = ?")
        values.append(str(fields["role"]).strip())
    if "name" in fields:
        name_value = fields["name"]
        updates.append("name = ?")
        values.append(str(name_value).strip() if name_value is not None else None)
    if "is_active" in fields:
        updates.append("is_active = ?")
        values.append(1 if bool(fields["is_active"]) else 0)

    if not updates:
        return get_user(user_id)

    updates.append("updated_at = ?")
    values.append(_utc_now())
    values.append(user_id)

    with _db_connection() as conn:
        cursor = conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
        if cursor.rowcount == 0:
            return None
        row = conn.execute(
            "SELECT id, email, role, name, is_active, created_at, updated_at FROM users WHERE id = ?", (user_id,)
        ).fetchone()

    return dict(row) if row else None


def delete_user(user_id: int) -> bool:
    with _db_connection() as conn:
        cursor = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
    return cursor.rowcount > 0


def get_user(user_id: int) -> dict[str, Any] | None:
    with _db_connection() as conn:
        row = conn.execute(
            "SELECT id, email, role, name, is_active, created_at, updated_at FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return dict(row) if row else None
