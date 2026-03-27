from __future__ import annotations

import base64
import json
import os
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(os.environ.get("PORTAL_DATA_DIR", Path(__file__).resolve().parent / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

TALK_DB_PATH = Path(os.environ.get("TALK_DB_PATH", DATA_DIR / "talk.db"))

NEXTCLOUD_BASE_URL = os.environ.get("NEXTCLOUD_BASE_URL", "https://cloud.docdenisenko.ru").rstrip("/")
NEXTCLOUD_BOT_ID = os.environ.get("NEXTCLOUD_BOT_ID", "1")
NEXTCLOUD_BOT_NAME = os.environ.get("NEXTCLOUD_BOT_NAME", "ScheduleBot")
NEXTCLOUD_BOT_SECRET = os.environ.get("NEXTCLOUD_BOT_SECRET", "")
BOT_SERVICE_BASE_URL = os.environ.get("BOT_SERVICE_BASE_URL", "https://portal.docdenisenko.ru/talk-bot").rstrip("/")
PORTAL_CALLBACK_BEARER = os.environ.get("PORTAL_CALLBACK_BEARER", "")


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
        conn.commit()


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
) -> dict[str, Any]:
    now = _utc_now()
    with _db_connection() as conn:
        exists = conn.execute("SELECT id FROM doctors WHERE id = ?", (doctor_id,)).fetchone()
        if exists:
            conn.execute(
                """
                UPDATE doctors
                SET full_name = ?, nc_user_id = ?, is_active = ?, updated_at = ?
                WHERE id = ?
                """,
                (full_name, nc_user_id, 1 if is_active else 0, now, doctor_id),
            )
        else:
            conn.execute(
                """
                INSERT INTO doctors (id, full_name, nc_user_id, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (doctor_id, full_name, nc_user_id, 1 if is_active else 0, now, now),
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


def _nc_request(path: str, method: str = "GET", payload: dict[str, Any] | None = None) -> dict[str, Any]:
    if not NEXTCLOUD_BOT_SECRET:
        raise RuntimeError("Не настроен NEXTCLOUD_BOT_SECRET")

    url = f"{NEXTCLOUD_BASE_URL}{path}"
    data = None
    headers: dict[str, str] = {
        "Accept": "application/json",
        "OCS-APIRequest": "true",
    }

    if payload is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = urllib.parse.urlencode(payload).encode("utf-8")

    credentials = f"{NEXTCLOUD_BOT_NAME}:{NEXTCLOUD_BOT_SECRET}".encode("utf-8")
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


def _create_room(room_name: str) -> dict[str, Any]:
    return _nc_request(
        "/ocs/v2.php/apps/spreed/api/v4/room",
        method="POST",
        payload={"roomType": "1", "roomName": room_name},
    )


def _add_participant(room_token: str, participant: str, source: str = "users") -> None:
    _nc_request(
        f"/ocs/v2.php/apps/spreed/api/v4/room/{room_token}/participants",
        method="POST",
        payload={"newParticipant": participant, "source": source},
    )


def ensure_doctor_room(doctor_id: str) -> dict[str, Any]:
    doctor = get_doctor(doctor_id)
    if not doctor:
        raise ValueError("Доктор не найден")

    if doctor.get("room_token"):
        return doctor

    room_name = f"Расписание: {doctor['full_name']}"
    room_data = _create_room(room_name)
    room_token = room_data.get("token")
    if not room_token:
        raise RuntimeError("Nextcloud не вернул room token")

    _add_participant(room_token, doctor["nc_user_id"], source="users")
    _add_participant(room_token, str(NEXTCLOUD_BOT_ID), source="bots")

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

    _post_json(f"{BOT_SERVICE_BASE_URL}/api/schedule/request-confirmation", payload)

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
    schedule_id = str(payload.get("scheduleId", "")).strip()
    schedule_date = str(payload.get("date", "")).strip()
    items = payload.get("items") or []

    if not doctor_id or not schedule_id or not schedule_date or not isinstance(items, list):
        raise ValueError("doctorId, scheduleId, date и items обязательны")

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
    if not PORTAL_CALLBACK_BEARER:
        return False
    return header_value == f"Bearer {PORTAL_CALLBACK_BEARER}"
