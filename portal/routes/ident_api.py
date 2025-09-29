from flask import Blueprint, jsonify, request
from portal.integrations.ident.service import get_counts_and_last_dates, list_items
from portal.integrations.ident.db import Patient, Staff, ScheduledReception, CallCache, OnlineTicket

bp = Blueprint("ident_api", __name__, url_prefix="/api/ident")

@bp.get("/status")
def ident_status():
    return jsonify(get_counts_and_last_dates())

@bp.get("/patients")
def ident_patients():
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    items = list_items(Patient, Patient.datetime_changed, limit, offset)
    return jsonify([
        {"id": x.id, "patient_number": x.patient_number, "status": x.status, "datetime_changed": str(x.datetime_changed)}
        for x in items
    ])

@bp.get("/staffs")
def ident_staffs():
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    items = list_items(Staff, Staff.datetime_changed, limit, offset)
    return jsonify([
        {"id": x.id, "db_username": x.db_username, "archive": x.archive, "datetime_changed": str(x.datetime_changed)}
        for x in items
    ])

@bp.get("/scheduled_receptions")
def ident_scheduled_receptions():
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    items = list_items(ScheduledReception, ScheduledReception.datetime_added, limit, offset)
    return jsonify([
        {"id": x.id, "id_patients": x.id_patients, "id_staffs": x.id_staffs, "datetime_added": str(x.datetime_added)}
        for x in items
    ])

@bp.get("/calls_cache")
def ident_calls_cache():
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    items = list_items(CallCache, CallCache.datetime_call, limit, offset)
    return jsonify([
        {"id": x.id, "phone_in": x.phone_in, "phone_out": x.phone_out, "datetime_call": str(x.datetime_call)}
        for x in items
    ])

@bp.get("/online_tickets")
def ident_online_tickets():
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    items = list_items(OnlineTicket, OnlineTicket.plan_start, limit, offset)
    return jsonify([
        {"id": x.id, "patient_fullname": x.patient_fullname, "staff_name": x.staff_name, "plan_start": str(x.plan_start)}
        for x in items
    ])
