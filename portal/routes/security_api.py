from __future__ import annotations

from functools import wraps
from sqlite3 import IntegrityError
from typing import Any, Callable

from flask import Blueprint, jsonify, request

from portal.security import (
    create_user,
    delete_user,
    init_security_storage,
    list_users,
    update_admin_credentials,
    update_user,
    verify_admin_credentials,
)

bp = Blueprint("security_api", __name__, url_prefix="/api/security")


@bp.before_app_request
def ensure_security_initialized() -> None:
    init_security_storage()


def _get_admin_auth() -> tuple[str | None, str | None]:
    return request.headers.get("X-Admin-Login"), request.headers.get("X-Admin-Password")


def admin_required(fn: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any):
        login, password = _get_admin_auth()
        if not login or not password:
            return jsonify({"error": "Требуется авторизация администратора"}), 401
        if not verify_admin_credentials(login, password):
            return jsonify({"error": "Неверный логин или пароль администратора"}), 401
        return fn(*args, **kwargs)

    return wrapper


@bp.post("/admin/login")
def admin_login():
    payload = request.get_json(silent=True) or {}
    login = str(payload.get("login", "")).strip()
    password = str(payload.get("password", ""))

    if not login or not password:
        return jsonify({"error": "Укажите login и password"}), 400

    if not verify_admin_credentials(login, password):
        return jsonify({"error": "Неверный логин или пароль администратора"}), 401

    return jsonify({"ok": True})


@bp.put("/admin/credentials")
@admin_required
def admin_update_credentials():
    payload = request.get_json(silent=True) or {}
    current_login, _ = _get_admin_auth()
    new_login = payload.get("login")
    new_password = payload.get("password")

    if not new_login and not new_password:
        return jsonify({"error": "Нужно передать login и/или password"}), 400

    try:
        update_admin_credentials(current_login=current_login or "", new_login=new_login, new_password=new_password)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"ok": True})


@bp.get("/users")
@admin_required
def users_list():
    return jsonify(list_users())


@bp.post("/users")
@admin_required
def users_create():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip()
    password = str(payload.get("password", ""))
    role = str(payload.get("role", "")).strip()
    name = payload.get("name")

    if not email or not password or not role:
        return jsonify({"error": "Поля email, password и role обязательны"}), 400

    try:
        user = create_user(email=email, password=password, role=role, name=name)
        return jsonify(user), 201
    except IntegrityError:
        return jsonify({"error": "Пользователь с таким email уже существует"}), 409


@bp.put("/users/<int:user_id>")
@admin_required
def users_update(user_id: int):
    payload = request.get_json(silent=True) or {}
    try:
        user = update_user(user_id, **payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except IntegrityError:
        return jsonify({"error": "Пользователь с таким email уже существует"}), 409

    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404

    return jsonify(user)


@bp.delete("/users/<int:user_id>")
@admin_required
def users_delete(user_id: int):
    was_deleted = delete_user(user_id)
    if not was_deleted:
        return jsonify({"error": "Пользователь не найден"}), 404
    return jsonify({"ok": True})
