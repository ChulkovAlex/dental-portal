from sqlalchemy import func
from .db import get_session, Patient, Staff, ScheduledReception, CallCache, OnlineTicket

def get_counts_and_last_dates():
    sess = get_session()
    try:
        def pack(model, field):
            count = sess.query(func.count(model.id)).scalar() or 0
            last = sess.query(func.max(field)).scalar()
            return {"count": int(count), "last_dt": str(last) if last else None}

        return {
            "patients": pack(Patient, Patient.datetime_changed),
            "staffs": pack(Staff, Staff.datetime_changed),
            "scheduled_receptions": pack(ScheduledReception, ScheduledReception.datetime_added),
            "calls_cache": pack(CallCache, CallCache.datetime_call),
            "online_tickets": pack(OnlineTicket, OnlineTicket.plan_start),
        }
    finally:
        sess.close()

def list_items(model, field, limit=50, offset=0):
    sess = get_session()
    try:
        q = (sess.query(model)
             .order_by(field.desc())
             .offset(offset).limit(limit))
        return list(q.all())
    finally:
        sess.close()
