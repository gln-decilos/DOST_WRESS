from flask import Blueprint, jsonify, session, request
from app.models.user import User

access_bp = Blueprint("access", __name__)


@access_bp.route("/me/permissions", methods=["GET"])
def get_my_permissions():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "permissions": user.permission_keys
    }), 200


@access_bp.route("/check", methods=["POST"])
def check_access():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    permission_key = data.get("permission")

    if not permission_key:
        return jsonify({"error": "Permission key is required"}), 400

    return jsonify({
        "permission": permission_key,
        "allowed": user.has_permission(permission_key)
    }), 200