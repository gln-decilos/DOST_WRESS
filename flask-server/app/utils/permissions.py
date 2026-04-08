from functools import wraps
from flask import session, jsonify
from app.models.user import User


def require_permission(permission_key):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = session.get("user_id")

            if not user_id:
                return jsonify({"error": "Unauthorized"}), 401

            user = User.query.get(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            if not user.has_permission(permission_key):
                return jsonify({"error": "Forbidden"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator