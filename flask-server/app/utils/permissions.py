from functools import wraps
from flask import jsonify, session
from app.models.user import User


def get_current_user():
    user_id = session.get("user_id")

    if not user_id:
        return None

    return User.query.get(user_id)


def require_permission(permission_key):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()

            if not user:
                return jsonify({"message": "Unauthorized"}), 401

            if not user.is_active:
                return jsonify({"message": "User account is inactive"}), 403

            if not user.has_permission(permission_key):
                return jsonify({
                    "message": f"You do not have permission: {permission_key}"
                }), 403

            return fn(*args, **kwargs)

        return wrapper
    return decorator