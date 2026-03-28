from __future__ import annotations

import base64
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

from flask import Blueprint, jsonify, request

bp = Blueprint("nextcloud_api", __name__, url_prefix="/api/nextcloud")


def _xml_text(parent: ET.Element, path: str) -> str:
    found = parent.find(path)
    if found is None or found.text is None:
        return ""
    return found.text.strip()


@bp.post("/test-connection")
def test_connection():
    payload = request.get_json(silent=True) or {}
    base_url = str(payload.get("baseUrl", "")).strip().rstrip("/")
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))

    if not base_url or not username or not password:
        return jsonify({"success": False, "error": "baseUrl, username и password обязательны"}), 400

    endpoint = f"{base_url}/ocs/v2.php/cloud/user"
    headers = {
        "Accept": "application/json, text/xml, application/xml;q=0.9, */*;q=0.8",
        "OCS-APIRequest": "true",
        "Authorization": "Basic " + base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii"),
    }

    req = urllib.request.Request(endpoint, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.getcode()
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace") if hasattr(exc, "read") else str(exc)
        return jsonify({"success": False, "error": f"Nextcloud HTTP {exc.code}: {detail[:300]}"}), 502
    except urllib.error.URLError as exc:
        return jsonify({"success": False, "error": f"Nextcloud недоступен: {exc.reason}"}), 502
    except Exception as exc:  # noqa: BLE001
        return jsonify({"success": False, "error": f"Ошибка запроса: {exc}"}), 500

    try:
        root = ET.fromstring(body)
    except ET.ParseError as exc:
        return jsonify({"success": False, "error": f"Некорректный XML в ответе: {exc}"}), 502

    if root.tag != "ocs":
        return jsonify({"success": False, "error": "Ответ не является OCS XML"}), 502

    status_text = _xml_text(root, "./meta/status").lower()
    if status != 200 or status_text != "ok":
        statuscode = _xml_text(root, "./meta/statuscode")
        message = _xml_text(root, "./meta/message")
        return jsonify(
            {
                "success": False,
                "error": f"OCS status={status_text or 'unknown'} statuscode={statuscode or 'unknown'} message={message or 'empty'}",
            }
        ), 502

    data = root.find("./data")
    user_id = _xml_text(data, "./id") if data is not None else username
    display_name = _xml_text(data, "./display-name") if data is not None else ""

    groups: list[str] = []
    if data is not None:
        groups_node = data.find("./groups")
        if groups_node is not None:
            groups = [
                (child.text or "").strip()
                for child in groups_node.findall("./element")
                if (child.text or "").strip()
            ]

    return jsonify(
        {
            "success": True,
            "user": user_id or username,
            "displayName": display_name,
            "groups": groups,
            "rawStatus": status,
        }
    )
