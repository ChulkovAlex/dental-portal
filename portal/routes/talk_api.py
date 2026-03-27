from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from sqlite3 import IntegrityError

from flask import Blueprint, jsonify, request

from portal.talk import (
    create_or_update_doctor,
    delete_doctor,
    ensure_doctor_room,
    get_doctor,
    handle_schedule_response,
    init_talk_storage,
    is_callback_authorized,
    list_doctors,
    list_schedule_confirmations,
    send_schedule_confirmation_by_payload,
)

bp = Blueprint("talk_api", __name__, url_prefix="/api/talk")


@bp.before_app_request
def ensure_talk_initialized() -> None:
    init_talk_storage()


@bp.get("/doctors")
def doctors_list():
    return jsonify(list_doctors())


@bp.get("/doctors/<doctor_id>")
def doctor_get(doctor_id: str):
    doctor = get_doctor(doctor_id)
    if doctor is None:
        return jsonify({"error": "Доктор не найден"}), 404
    return jsonify(
        {
            "doctorId": doctor["id"],
            "doctorName": doctor["full_name"],
            "doctorNcUserId": doctor["nc_user_id"],
            "roomToken": doctor.get("room_token"),
            "roomName": doctor.get("room_name"),
            "isActive": bool(doctor.get("is_active", 0)),
        }
    )


@bp.post("/doctors")
def doctors_upsert():
    payload = request.get_json(silent=True) or {}
    doctor_id = str(payload.get("doctorId", "")).strip()
    doctor_name = str(payload.get("doctorName", "")).strip()
    doctor_nc_user_id = str(payload.get("doctorNcUserId", "")).strip()
    is_active = bool(payload.get("isActive", True))

    if not doctor_id or not doctor_name or not doctor_nc_user_id:
        return jsonify({"error": "doctorId, doctorName и doctorNcUserId обязательны"}), 400

    try:
        doctor = create_or_update_doctor(
            doctor_id=doctor_id,
            full_name=doctor_name,
            nc_user_id=doctor_nc_user_id,
            is_active=is_active,
        )
    except IntegrityError:
        return jsonify({"error": "doctorNcUserId уже привязан к другому доктору"}), 409

    return jsonify(
        {
            "doctorId": doctor["id"],
            "doctorName": doctor["full_name"],
            "doctorNcUserId": doctor["nc_user_id"],
            "roomToken": doctor.get("room_token"),
            "roomName": doctor.get("room_name"),
            "isActive": bool(doctor.get("is_active", 0)),
        }
    )


@bp.put("/doctors/<doctor_id>")
def doctors_update(doctor_id: str):
    payload = request.get_json(silent=True) or {}
    doctor_name = str(payload.get("doctorName", "")).strip()
    doctor_nc_user_id = str(payload.get("doctorNcUserId", "")).strip()
    is_active = bool(payload.get("isActive", True))

    if not doctor_name or not doctor_nc_user_id:
        return jsonify({"error": "doctorName и doctorNcUserId обязательны"}), 400

    if get_doctor(doctor_id) is None:
        return jsonify({"error": "Доктор не найден"}), 404

    try:
        doctor = create_or_update_doctor(
            doctor_id=doctor_id,
            full_name=doctor_name,
            nc_user_id=doctor_nc_user_id,
            is_active=is_active,
        )
    except IntegrityError:
        return jsonify({"error": "doctorNcUserId уже привязан к другому доктору"}), 409

    return jsonify(
        {
            "doctorId": doctor["id"],
            "doctorName": doctor["full_name"],
            "doctorNcUserId": doctor["nc_user_id"],
            "roomToken": doctor.get("room_token"),
            "roomName": doctor.get("room_name"),
            "isActive": bool(doctor.get("is_active", 0)),
        }
    )


@bp.delete("/doctors/<doctor_id>")
def doctors_delete(doctor_id: str):
    deleted = delete_doctor(doctor_id)
    if not deleted:
        return jsonify({"error": "Доктор не найден"}), 404
    return jsonify({"ok": True})


@bp.post("/doctors/<doctor_id>/room")
def doctor_ensure_room(doctor_id: str):
    try:
        doctor = ensure_doctor_room(doctor_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify(
        {
            "doctorId": doctor["id"],
            "doctorName": doctor["full_name"],
            "doctorNcUserId": doctor["nc_user_id"],
            "roomToken": doctor.get("room_token"),
            "roomName": doctor.get("room_name"),
            "isActive": bool(doctor.get("is_active", 0)),
        }
    )


@bp.post("/schedule/request-confirmation")
def request_schedule_confirmation():
    payload = request.get_json(silent=True) or {}

    try:
        result = send_schedule_confirmation_by_payload(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify(result)


@bp.post("/internal/send-schedule-to-talk")
def request_schedule_confirmation_internal():
    payload = request.get_json(silent=True) or {}

    try:
        result = send_schedule_confirmation_by_payload(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify(result)


@bp.post("/send-test-message")
def send_test_message():
    payload = request.get_json(silent=True) or {}
    nextcloud_url = str(payload.get("nextcloudUrl", "")).strip().rstrip("/")
    bot_token = str(payload.get("botToken", "")).strip()
    room_token = str(payload.get("roomToken", "")).strip()
    message = str(payload.get("message", "")).strip()

    if not nextcloud_url or not bot_token or not room_token:
        return jsonify({"error": "nextcloudUrl, botToken и roomToken обязательны"}), 400

    if not message:
        return jsonify({"error": "message обязателен"}), 400

    request_url = (
        f"{nextcloud_url}/ocs/v2.php/apps/spreed/api/v1/chat/"
        f"{urllib.parse.quote(room_token, safe='')}"
    )
    outgoing = urllib.request.Request(
        url=request_url,
        method="POST",
        headers={
            "Authorization": f"Bearer {bot_token}",
            "Content-Type": "application/json",
            "OCS-APIRequest": "true",
        },
        data=json.dumps({"message": message}, ensure_ascii=False).encode("utf-8"),
    )

    try:
        with urllib.request.urlopen(outgoing, timeout=30) as response:
            raw_body = response.read().decode("utf-8")
            return jsonify({"ok": True, "status": response.status, "response": raw_body})
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        return (
            jsonify({"error": f"Nextcloud Talk вернул ошибку {exc.code}: {body or 'пустой ответ'}"}),
            502,
        )
    except urllib.error.URLError as exc:
        return jsonify({"error": f"Ошибка подключения к Nextcloud Talk: {exc.reason}"}), 502


@bp.get("/schedule/confirmations")
def schedule_confirmations_list():
    limit = int(request.args.get("limit", 100))
    return jsonify(list_schedule_confirmations(limit=limit))


@bp.post("/schedule-response")
def schedule_response():
    if not is_callback_authorized(request.headers.get("Authorization")):
        return jsonify({"error": "Unauthorized callback"}), 401

    payload = request.get_json(silent=True) or {}
    try:
        updated = handle_schedule_response(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404

    return jsonify({"ok": True, "confirmation": updated})
