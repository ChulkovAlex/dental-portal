from __future__ import annotations

import json
import os
import sqlite3
import uuid
import base64
import ipaddress
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(os.environ.get("PORTAL_DATA_DIR", Path(__file__).resolve().parent / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

TALK_DB_PATH = Path(os.environ.get("TALK_DB_PATH", DATA_DIR / "talk.db"))

DEFAULT_BOT_SERVICE_BASE_URL = os.environ.get(
    "BOT_SERVICE_BASE_URL", "http://127.0.0.1:18081"
).rstrip("/")
DEFAULT_NEXTCLOUD_BASE_URL = os.environ.get("NEXTCLOUD_BASE_URL", "").rstrip("/")
DEFAULT_NEXTCLOUD_SERVICE_USER = os.environ.get("NEXTCLOUD_SERVICE_USER", "")
DEFAULT_NEXTCLOUD_SERVICE_PASSWORD = os.environ.get("NEXTCLOUD_SERVICE_PASSWORD", "")
DEFAULT_NEXTCLOUD_BOT_SECRET = os.environ.get("NEXTCLOUD_BOT_SECRET", "")
DEFAULT_NEXTCLOUD_BOT_ID = os.environ.get("NEXTCLOUD_BOT_ID", "1")
PORTAL_CALLBACK_BEARER = os.environ.get("PORTAL_CALLBACK_BEARER", "")
DEFAULT_PORTAL_CALLBACK_URL = os.environ.get("PORTAL_CALLBACK_URL", "").strip()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db_connection() -> sqlite3.Connection:
    TALK_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(TALK_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_talk_storage() -> None:
    with _db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS doctors (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                nc_user_id TEXT NOT NULL UNIQUE,
                room_token TEXT,
                room_name TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                last_sync_at TEXT,
                last_connection_check_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schedule_confirmations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                schedule_id TEXT NOT NULL UNIQUE,
                doctor_id TEXT NOT NULL,
                room_token TEXT,
                schedule_date TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL,
                last_comment TEXT,
                requested_at TEXT NOT NULL,
                responded_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schedule_confirmation_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                schedule_id TEXT NOT NULL,
                doctor_id TEXT NOT NULL,
                decision TEXT NOT NULL,
                comment TEXT,
                actor TEXT,
                source TEXT,
                raw_payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS integration_settings (
                id INTEGER PRIMARY KEY CHECK(id = 1),
                nextcloud_base_url TEXT NOT NULL DEFAULT '',
                nextcloud_service_user TEXT NOT NULL DEFAULT '',
                nextcloud_service_password TEXT NOT NULL DEFAULT '',
                nextcloud_bot_secret TEXT NOT NULL DEFAULT '',
                nextcloud_bot_id TEXT NOT NULL DEFAULT '',
                bot_service_base_url TEXT NOT NULL DEFAULT '',
                portal_callback_url TEXT NOT NULL DEFAULT '',
                connected INTEGER NOT NULL DEFAULT 0,
                last_connection_check_at TEXT,
                last_connection_check_result_json TEXT,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS doctor_sync_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                status TEXT NOT NULL,
                message TEXT NOT NULL,
                details_json TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        _ensure_column(conn, "doctors", "last_sync_at", "TEXT")
        _ensure_column(conn, "doctors", "last_connection_check_at", "TEXT")
        _ensure_column(conn, "integration_settings", "portal_callback_url", "TEXT NOT NULL DEFAULT ''")
        _ensure_default_settings_row(conn)
        conn.commit()


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, col_def: str) -> None:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    if any(row[1] == column for row in rows):
        return
    conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")


def _ensure_default_settings_row(conn: sqlite3.Connection) -> None:
    existing = conn.execute("SELECT id FROM integration_settings WHERE id = 1").fetchone()
    if existing:
        return
    now = _utc_now()
    conn.execute(
        """
        INSERT INTO integration_settings (
            id, nextcloud_base_url, nextcloud_service_user, nextcloud_service_password,
            nextcloud_bot_secret, nextcloud_bot_id, bot_service_base_url, portal_callback_url, connected,
            last_connection_check_at, last_connection_check_result_json, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?)
        """,
        (
            DEFAULT_NEXTCLOUD_BASE_URL,
            DEFAULT_NEXTCLOUD_SERVICE_USER,
            DEFAULT_NEXTCLOUD_SERVICE_PASSWORD,
            DEFAULT_NEXTCLOUD_BOT_SECRET,
            DEFAULT_NEXTCLOUD_BOT_ID,
            DEFAULT_BOT_SERVICE_BASE_URL,
            DEFAULT_PORTAL_CALLBACK_URL,
            now,
        ),
    )


def list_doctors() -> list[dict[str, Any]]:
    with _db_connection() as conn:
        rows = conn.execute("SELECT * FROM doctors ORDER BY full_name").fetchall()
    return [dict(row) for row in rows]


def get_doctor_by_nc_user_id(nc_user_id: str) -> dict[str, Any] | None:
    with _db_connection() as conn:
        row = conn.execute("SELECT * FROM doctors WHERE nc_user_id = ?", (nc_user_id,)).fetchone()
    return dict(row) if row else None


def create_or_update_doctor(
    doctor_id: str,
    full_name: str,
    nc_user_id: str,
    is_active: bool = True,
    room_token: str | None = None,
    room_name: str | None = None,
    last_sync_at: str | None = None,
    last_connection_check_at: str | None = None,
) -> dict[str, Any]:
    now = _utc_now()
    with _db_connection() as conn:
        exists = conn.execute("SELECT id FROM doctors WHERE id = ?", (doctor_id,)).fetchone()
        if exists:
            conn.execute(
                """
                UPDATE doctors
                SET full_name = ?, nc_user_id = ?, is_active = ?,
                    room_token = COALESCE(?, room_token),
                    room_name = COALESCE(?, room_name),
                    last_sync_at = COALESCE(?, last_sync_at),
                    last_connection_check_at = COALESCE(?, last_connection_check_at),
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    full_name,
                    nc_user_id,
                    1 if is_active else 0,
                    room_token,
                    room_name,
                    last_sync_at,
                    last_connection_check_at,
                    now,
                    doctor_id,
                ),
            )
        else:
            conn.execute(
                """
                INSERT INTO doctors (
                    id, full_name, nc_user_id, room_token, room_name, is_active,
                    last_sync_at, last_connection_check_at, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    doctor_id,
                    full_name,
                    nc_user_id,
                    room_token,
                    room_name,
                    1 if is_active else 0,
                    last_sync_at,
                    last_connection_check_at,
                    now,
                    now,
                ),
            )
        conn.commit()
        row = conn.execute("SELECT * FROM doctors WHERE id = ?", (doctor_id,)).fetchone()
    if row is None:
        raise RuntimeError("Не удалось сохранить доктора")
    return dict(row)


def get_doctor(doctor_id: str) -> dict[str, Any] | None:
    with _db_connection() as conn:
        row = conn.execute("SELECT * FROM doctors WHERE id = ?", (doctor_id,)).fetchone()
    return dict(row) if row else None


def delete_doctor(doctor_id: str) -> bool:
    with _db_connection() as conn:
        deleted = conn.execute("DELETE FROM doctors WHERE id = ?", (doctor_id,))
        conn.commit()
    return deleted.rowcount > 0


def get_integration_settings() -> dict[str, Any]:
    with _db_connection() as conn:
        row = conn.execute("SELECT * FROM integration_settings WHERE id = 1").fetchone()
    if not row:
        raise RuntimeError("Настройки интеграции не инициализированы")
    data = dict(row)
    raw_result = data.get("last_connection_check_result_json")
    data["last_connection_check_result"] = json.loads(raw_result) if raw_result else None
    data.pop("last_connection_check_result_json", None)
    return data


def update_integration_settings(payload: dict[str, Any]) -> dict[str, Any]:
    current = get_integration_settings()
    next_values = {
        "nextcloud_base_url": str(payload.get("nextcloudBaseUrl", current["nextcloud_base_url"])).strip().rstrip("/"),
        "nextcloud_service_user": str(payload.get("nextcloudServiceUser", current["nextcloud_service_user"])).strip(),
        "nextcloud_service_password": str(
            payload.get("nextcloudServicePassword", current["nextcloud_service_password"])
        ),
        "nextcloud_bot_secret": str(payload.get("nextcloudBotSecret", current["nextcloud_bot_secret"])),
        "nextcloud_bot_id": str(payload.get("nextcloudBotId", current["nextcloud_bot_id"])).strip(),
        "bot_service_base_url": str(
            payload.get("botServiceBaseUrl", current["bot_service_base_url"])
        ).strip().rstrip("/"),
        "portal_callback_url": str(
            payload.get("portalCallbackUrl", current.get("portal_callback_url", ""))
        ).strip(),
    }
    now = _utc_now()
    with _db_connection() as conn:
        conn.execute(
            """
            UPDATE integration_settings
            SET nextcloud_base_url = ?, nextcloud_service_user = ?, nextcloud_service_password = ?,
                nextcloud_bot_secret = ?, nextcloud_bot_id = ?, bot_service_base_url = ?, portal_callback_url = ?, updated_at = ?
            WHERE id = 1
            """,
            (
                next_values["nextcloud_base_url"],
                next_values["nextcloud_service_user"],
                next_values["nextcloud_service_password"],
                next_values["nextcloud_bot_secret"],
                next_values["nextcloud_bot_id"],
                next_values["bot_service_base_url"] or DEFAULT_BOT_SERVICE_BASE_URL,
                next_values["portal_callback_url"],
                now,
            ),
        )
        conn.commit()
    return get_integration_settings()


def _nc_request(
    path: str,
    settings: dict[str, Any],
    method: str = "GET",
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not settings.get("nextcloud_base_url"):
        raise RuntimeError("Не настроен Nextcloud Base URL")
    if not settings.get("nextcloud_service_user") or not settings.get("nextcloud_service_password"):
        raise RuntimeError("Не настроены учетные данные сервисного пользователя Nextcloud")

    url = f"{settings['nextcloud_base_url']}{path}"
    data = None
    headers: dict[str, str] = {
        "Accept": "application/json",
        "OCS-APIRequest": "true",
    }

    if payload is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = urllib.parse.urlencode(payload).encode("utf-8")

    credentials = (
        f"{settings['nextcloud_service_user']}:{settings['nextcloud_service_password']}".encode("utf-8")
    )
    headers["Authorization"] = f"Basic {base64.b64encode(credentials).decode('utf-8')}"

    request = urllib.request.Request(url=url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        raise RuntimeError(f"Ошибка Nextcloud ({exc.code}): {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Ошибка подключения к Nextcloud: {exc.reason}") from exc

    decoded = json.loads(body)
    if "ocs" in decoded and decoded["ocs"].get("meta", {}).get("status") == "failure":
        message = decoded["ocs"].get("meta", {}).get("message", "Неизвестная ошибка")
        raise RuntimeError(f"Nextcloud вернул ошибку: {message}")

    if "ocs" in decoded:
        return decoded["ocs"].get("data", {})
    return decoded


def _create_room(room_name: str, settings: dict[str, Any]) -> dict[str, Any]:
    return _nc_request(
        "/ocs/v2.php/apps/spreed/api/v4/room",
        settings=settings,
        method="POST",
        payload={"roomType": "1", "roomName": room_name},
    )


def _add_participant(
    room_token: str, participant: str, settings: dict[str, Any], source: str = "users"
) -> None:
    _nc_request(
        f"/ocs/v2.php/apps/spreed/api/v4/room/{room_token}/participants",
        settings=settings,
        method="POST",
        payload={"newParticipant": participant, "source": source},
    )


def ensure_doctor_room(doctor_id: str) -> dict[str, Any]:
    settings = get_integration_settings()
    doctor = get_doctor(doctor_id)
    if not doctor:
        raise ValueError("Доктор не найден")

    if doctor.get("room_token"):
        return doctor

    room_name = f"Расписание: {doctor['full_name']}"
    room_data = _create_room(room_name, settings=settings)
    room_token = room_data.get("token")
    if not room_token:
        raise RuntimeError("Nextcloud не вернул room token")

    _add_participant(room_token, doctor["nc_user_id"], settings=settings, source="users")
    bot_id = str(settings.get("nextcloud_bot_id", "")).strip()
    if bot_id:
        _add_participant(room_token, bot_id, settings=settings, source="bots")

    now = _utc_now()
    with _db_connection() as conn:
        conn.execute(
            """
            UPDATE doctors
            SET room_token = ?, room_name = ?, updated_at = ?
            WHERE id = ?
            """,
            (room_token, room_name, now, doctor_id),
        )
        conn.commit()

    refreshed = get_doctor(doctor_id)
    if not refreshed:
        raise RuntimeError("Доктор был удален во время обновления")
    return refreshed


def _post_json(url: str, payload: dict[str, Any], bearer: str | None = None) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"

    request = urllib.request.Request(
        url=url,
        method="POST",
        headers=headers,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            if not raw:
                return {}
            return json.loads(raw)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        raise RuntimeError(f"Ошибка POST {url}: {exc.code} {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Ошибка сети при POST {url}: {exc.reason}") from exc


def send_schedule_confirmation(
    doctor_id: str,
    schedule_id: str,
    schedule_date: str,
    items: list[dict[str, Any]],
) -> dict[str, Any]:
    doctor = ensure_doctor_room(doctor_id)

    payload = {
        "roomToken": doctor["room_token"],
        "scheduleId": schedule_id,
        "doctorId": doctor["id"],
        "doctorNcUserId": doctor["nc_user_id"],
        "doctorName": doctor["full_name"],
        "date": schedule_date,
        "items": items,
    }

    settings = get_integration_settings()
    bot_service_base_url = settings.get("bot_service_base_url") or DEFAULT_BOT_SERVICE_BASE_URL
    _post_json(f"{bot_service_base_url}/api/schedule/request-confirmation", payload)

    now = _utc_now()
    with _db_connection() as conn:
        conn.execute(
            """
            INSERT INTO schedule_confirmations
            (schedule_id, doctor_id, room_token, schedule_date, payload_json, status, requested_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(schedule_id) DO UPDATE SET
                doctor_id = excluded.doctor_id,
                room_token = excluded.room_token,
                schedule_date = excluded.schedule_date,
                payload_json = excluded.payload_json,
                status = excluded.status,
                requested_at = excluded.requested_at,
                responded_at = NULL
            """,
            (
                schedule_id,
                doctor["id"],
                doctor["room_token"],
                schedule_date,
                json.dumps(payload, ensure_ascii=False),
                "pending",
                now,
            ),
        )
        conn.execute(
            """
            INSERT INTO schedule_confirmation_events
            (schedule_id, doctor_id, decision, comment, actor, source, raw_payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                schedule_id,
                doctor["id"],
                "requested",
                None,
                "portal/system",
                "portal",
                json.dumps(payload, ensure_ascii=False),
                now,
            ),
        )
        conn.commit()

    return {
        "ok": True,
        "status": "pending",
        "scheduleId": schedule_id,
        "doctorId": doctor["id"],
        "roomToken": doctor["room_token"],
    }


def send_schedule_confirmation_by_payload(payload: dict[str, Any]) -> dict[str, Any]:
    doctor_id = str(payload.get("doctorId", "")).strip()
    doctor_nc_user_id = str(payload.get("doctorNcUserId", "")).strip()
    doctor_name = str(payload.get("doctorName", "")).strip() or doctor_id or doctor_nc_user_id
    schedule_id = str(payload.get("scheduleId", "")).strip()
    schedule_date = str(payload.get("date", "")).strip()
    items = payload.get("items") or []

    if not schedule_id or not schedule_date or not isinstance(items, list):
        raise ValueError("scheduleId, date и items обязательны")
    if not doctor_id and not doctor_nc_user_id:
        raise ValueError("doctorId или doctorNcUserId обязателен")

    if doctor_id and not get_doctor(doctor_id):
        if doctor_nc_user_id:
            existing_by_nc = get_doctor_by_nc_user_id(doctor_nc_user_id)
            if existing_by_nc:
                doctor_id = str(existing_by_nc["id"])
            else:
                created = create_or_update_doctor(
                    doctor_id=doctor_id,
                    full_name=doctor_name,
                    nc_user_id=doctor_nc_user_id,
                    is_active=True,
                )
                doctor_id = str(created["id"])
    elif not doctor_id and doctor_nc_user_id:
        existing_by_nc = get_doctor_by_nc_user_id(doctor_nc_user_id)
        if existing_by_nc:
            doctor_id = str(existing_by_nc["id"])
        else:
            doctor_id = f"nc-{doctor_nc_user_id}"
            create_or_update_doctor(
                doctor_id=doctor_id,
                full_name=doctor_name or doctor_nc_user_id,
                nc_user_id=doctor_nc_user_id,
                is_active=True,
            )

    return send_schedule_confirmation(
        doctor_id=doctor_id,
        schedule_id=schedule_id,
        schedule_date=schedule_date,
        items=items,
    )


def handle_schedule_response(payload: dict[str, Any]) -> dict[str, Any]:
    schedule_id = str(payload.get("scheduleId", "")).strip()
    doctor_id = str(payload.get("doctorId", "")).strip()
    decision = str(payload.get("decision", "")).strip().lower()

    if not schedule_id or not doctor_id or decision not in {"confirmed", "declined", "comment"}:
        raise ValueError("Некорректный payload callback")

    status = decision
    comment = payload.get("comment")
    responded_at = payload.get("respondedAt") or _utc_now()
    actor = payload.get("actor")
    source = payload.get("source", "nextcloud_talk")

    with _db_connection() as conn:
        existing = conn.execute(
            "SELECT * FROM schedule_confirmations WHERE schedule_id = ?", (schedule_id,)
        ).fetchone()
        if existing is None:
            raise LookupError("Запись schedule confirmation не найдена")
        if existing["doctor_id"] != doctor_id:
            raise LookupError("doctorId в callback не совпадает с записью schedule confirmation")

        conn.execute(
            """
            UPDATE schedule_confirmations
            SET status = ?, last_comment = ?, responded_at = ?
            WHERE schedule_id = ?
            """,
            (status, comment, responded_at, schedule_id),
        )
        conn.execute(
            """
            INSERT INTO schedule_confirmation_events
            (schedule_id, doctor_id, decision, comment, actor, source, raw_payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                schedule_id,
                doctor_id,
                decision,
                comment,
                actor,
                source,
                json.dumps(payload, ensure_ascii=False),
                _utc_now(),
            ),
        )
        conn.commit()

        updated = conn.execute(
            "SELECT * FROM schedule_confirmations WHERE schedule_id = ?", (schedule_id,)
        ).fetchone()

    return dict(updated) if updated else {"ok": True}


def run_connection_check() -> dict[str, Any]:
    settings = get_integration_settings()
    now = _utc_now()
    checks: list[dict[str, Any]] = []

    def run_step(name: str, fn) -> None:
        try:
            detail = fn()
            checks.append({"name": name, "ok": True, "detail": detail})
        except Exception as exc:  # noqa: BLE001
            checks.append({"name": name, "ok": False, "detail": str(exc)})

    bot_service_base = settings.get("bot_service_base_url") or DEFAULT_BOT_SERVICE_BASE_URL
    callback_url = settings.get("portal_callback_url")
    callback_bearer = (settings.get("nextcloud_bot_secret") or "").strip()

    run_step("nextcloud_base_url", lambda: _http_request(f"{settings['nextcloud_base_url']}/status.php", method="GET"))
    run_step("nextcloud_credentials", lambda: _nc_request("/ocs/v1.php/cloud/user", settings=settings))
    run_step("talk_api", lambda: _nc_request("/ocs/v2.php/apps/spreed/api/v4/room", settings=settings))
    run_step("users_list", lambda: _fetch_nextcloud_users(settings))
    run_step("bot_service_base_url", lambda: _http_request(bot_service_base, method="GET"))
    run_step("bot_health", lambda: _http_request(f"{bot_service_base}/health", method="GET"))
    run_step("bot_id", lambda: _verify_bot_id(settings))
    run_step("bot_secret", lambda: _verify_bot_secret(settings))
    run_step("room_access", lambda: _verify_room_access(settings))
    run_step("bot_schedule_request", lambda: _verify_bot_schedule_request(bot_service_base))
    run_step(
        "portal_callback",
        lambda: _verify_portal_callback(callback_url=callback_url, callback_bearer=callback_bearer),
    )

    ok = all(item["ok"] for item in checks)
    with _db_connection() as conn:
        conn.execute(
            """
            UPDATE integration_settings
            SET connected = ?, last_connection_check_at = ?, last_connection_check_result_json = ?, updated_at = ?
            WHERE id = 1
            """,
            (1 if ok else 0, now, json.dumps(checks, ensure_ascii=False), now),
        )
        conn.execute(
            "UPDATE doctors SET last_connection_check_at = ?",
            (now,),
        )
        conn.commit()
    return {"ok": ok, "checkedAt": now, "checks": checks}


def _fetch_nextcloud_users(settings: dict[str, Any]) -> list[dict[str, Any]]:
    data = _nc_request("/ocs/v1.php/cloud/users", settings=settings)
    users_raw = data.get("users", [])
    users: list[dict[str, Any]] = []
    for user_id in users_raw:
        if not user_id:
            continue
        user_data = _nc_request(f"/ocs/v1.php/cloud/users/{urllib.parse.quote(str(user_id), safe='')}", settings=settings)
        users.append(
            {
                "doctorNcUserId": str(user_id),
                "doctorName": str(
                    user_data.get("displayname")
                    or user_data.get("id")
                    or user_id
                ),
            }
        )
    return users


def _http_request(url: str, method: str = "GET", payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url=url, method=method, headers=headers, data=data)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            parsed: Any = raw
            if raw:
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    parsed = raw
            return {"status": response.status, "body": parsed}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Ошибка сети: {exc.reason}") from exc


def _verify_bot_id(settings: dict[str, Any]) -> dict[str, Any]:
    bot_id = str(settings.get("nextcloud_bot_id", "")).strip()
    if not bot_id:
        raise RuntimeError("Nextcloud Bot ID не настроен")
    room = _create_room(f"portal-bot-id-check-{uuid.uuid4().hex[:8]}", settings=settings)
    room_token = str(room.get("token", "")).strip()
    if not room_token:
        raise RuntimeError("Не удалось создать комнату для проверки Bot ID")
    _add_participant(room_token, bot_id, settings=settings, source="bots")
    return {"roomToken": room_token, "botId": bot_id}


def _verify_bot_secret(settings: dict[str, Any]) -> dict[str, Any]:
    bot_secret = str(settings.get("nextcloud_bot_secret", "")).strip()
    if not bot_secret:
        raise RuntimeError("Nextcloud Bot Secret не настроен")
    if len(bot_secret) < 16:
        raise RuntimeError("Nextcloud Bot Secret слишком короткий (минимум 16 символов)")
    return {"configured": True, "length": len(bot_secret)}


def _verify_room_access(settings: dict[str, Any]) -> dict[str, Any]:
    room = _create_room(f"portal-room-check-{uuid.uuid4().hex[:8]}", settings=settings)
    room_token = str(room.get("token", "")).strip()
    if not room_token:
        raise RuntimeError("Talk API не вернул room token")
    return {"roomToken": room_token}


def _verify_bot_schedule_request(bot_service_base: str) -> dict[str, Any]:
    return _post_json(
        f"{bot_service_base}/api/schedule/request-confirmation",
        {
            "roomToken": "connection-check",
            "scheduleId": f"healthcheck-{uuid.uuid4().hex[:8]}",
            "doctorId": "connection-check",
            "doctorNcUserId": "connection-check",
            "doctorName": "connection-check",
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "items": [],
        },
    )


def _verify_portal_callback(callback_url: str, callback_bearer: str) -> dict[str, Any]:
    if not callback_url:
        raise RuntimeError("Portal Callback URL не настроен")
    parsed = urllib.parse.urlparse(callback_url)
    host = parsed.hostname or ""
    if host in {"127.0.0.1", "localhost"}:
        raise RuntimeError("Portal Callback URL указывает на loopback и недоступен из Docker-контейнера")
    try:
        ip = ipaddress.ip_address(host)
        if ip.is_loopback:
            raise RuntimeError("Portal Callback URL указывает на loopback и недоступен из Docker-контейнера")
    except ValueError:
        pass

    if not callback_bearer:
        raise RuntimeError("Nextcloud Bot Secret пустой: callback не пройдет авторизацию")
    response = _post_json(
        callback_url,
        {"type": "connection_check", "checkedAt": _utc_now(), "source": "portal_connection_check"},
        bearer=callback_bearer,
    )
    return {"ok": True, "response": response}


def sync_doctors_from_nextcloud(
    include_only: list[str] | None = None, exclude_users: list[str] | None = None
) -> dict[str, Any]:
    settings = get_integration_settings()
    now = _utc_now()
    include = {item.strip() for item in (include_only or []) if item and item.strip()}
    exclude = {item.strip() for item in (exclude_users or []) if item and item.strip()}
    users = _fetch_nextcloud_users(settings)
    upserted: list[dict[str, Any]] = []

    for user in users:
        nc_user_id = user["doctorNcUserId"]
        if include and nc_user_id not in include:
            continue
        if nc_user_id in exclude:
            continue
        existing = get_doctor_by_nc_user_id(nc_user_id)
        if existing:
            doctor_id = existing["id"]
            room_token = existing["room_token"]
            room_name = existing["room_name"]
            is_active = bool(existing["is_active"])
        else:
            doctor_id = f"nc-{nc_user_id}"
            room_token = None
            room_name = None
            is_active = True

        doctor = create_or_update_doctor(
            doctor_id=doctor_id,
            full_name=user["doctorName"],
            nc_user_id=nc_user_id,
            is_active=is_active,
            room_token=room_token,
            room_name=room_name,
            last_sync_at=now,
            last_connection_check_at=settings.get("last_connection_check_at"),
        )
        upserted.append(doctor)

    with _db_connection() as conn:
        conn.execute(
            """
            INSERT INTO doctor_sync_logs (status, message, details_json, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                "success",
                f"Синхронизировано пользователей: {len(upserted)}",
                json.dumps({"count": len(upserted)}, ensure_ascii=False),
                now,
            ),
        )
        conn.commit()

    return {
        "ok": True,
        "syncedAt": now,
        "count": len(upserted),
        "doctors": upserted,
    }


def list_doctor_sync_logs(limit: int = 50) -> list[dict[str, Any]]:
    with _db_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM doctor_sync_logs
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def list_schedule_confirmations(limit: int = 100) -> list[dict[str, Any]]:
    with _db_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM schedule_confirmations
            ORDER BY requested_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def is_callback_authorized(header_value: str | None) -> bool:
    dynamic_secret = str(get_integration_settings().get("nextcloud_bot_secret", "")).strip()
    accepted_tokens = [token for token in (dynamic_secret, PORTAL_CALLBACK_BEARER) if token]
    if not accepted_tokens:
        return False
    return any(header_value == f"Bearer {token}" for token in accepted_tokens)
