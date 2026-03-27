from __future__ import annotations

from sqlite3 import IntegrityError

from flask import Blueprint, jsonify, request

from portal.talk import (
    create_or_update_doctor,
    ensure_doctor_room,
    handle_schedule_response,
    init_talk_storage,
    is_callback_authorized,
    list_doctors,
    list_schedule_confirmations,
    send_schedule_confirmation,
)

bp = Blueprint("talk_api", __name__, url_prefix="/api/talk")


@bp.before_app_request
def ensure_talk_initialized() -> None:
    init_talk_storage()


@bp.get("/doctors")
def doctors_list():
    return jsonify(list_doctors())


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
    doctor_id = str(payload.get("doctorId", "")).strip()
    schedule_id = str(payload.get("scheduleId", "")).strip()
    schedule_date = str(payload.get("date", "")).strip()
    items = payload.get("items") or []

    if not doctor_id or not schedule_id or not schedule_date or not isinstance(items, list):
        return jsonify({"error": "doctorId, scheduleId, date и items обязательны"}), 400

    try:
        result = send_schedule_confirmation(
            doctor_id=doctor_id,
            schedule_id=schedule_id,
            schedule_date=schedule_date,
            items=items,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify(result)


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
