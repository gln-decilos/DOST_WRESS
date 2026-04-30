from functools import wraps
import os

import jwt
from flask import Blueprint, jsonify, request, g

from app.models.user import User
from app.utils.permissions import (
    get_request_project_id,
    get_user_permission_keys,
    user_has_permission,
)

access_bp = Blueprint("access", __name__)

JWT_SECRET_KEY = os.environ.get(
    "JWT_SECRET_KEY",
    "xK9mP2nQ5rS8tU1vW3yZ4aB6cD7eF0gH2jK5lN7pR9sT2uV4wX6yZ8aB1cD3eF5gH7jK9lN1pR3sT5uV7wX9z"
)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authentication required"}), 401

        token = auth_header.split(" ")[1]

        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            g.user_id = payload["user_id"]
            g.user = User.query.get(g.user_id)

            if not g.user:
                return jsonify({"error": "User not found"}), 401

            if not g.user.is_active:
                return jsonify({"error": "User account is deactivated"}), 401

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)

    return decorated_function


@access_bp.route("/me/permissions", methods=["GET"])
@login_required
def get_my_permissions():
    user = g.user
    project_id = get_request_project_id(project_arg="project_id")

    return jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "user_type": user.user_type,
        },
        "project_id": project_id,
        "permissions": get_user_permission_keys(user.id, project_id),
    }), 200


@access_bp.route("/check", methods=["POST"])
@login_required
def check_access():
    user = g.user

    data = request.get_json() or {}
    permission_key = data.get("permission")
    project_id = get_request_project_id(project_arg="project_id")

    if not permission_key:
        return jsonify({"error": "Permission key is required"}), 400

    allowed = user_has_permission(user.id, permission_key, project_id)

    return jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "user_type": user.user_type,
        },
        "permission": permission_key,
        "project_id": project_id,
        "allowed": allowed,
    }), 200