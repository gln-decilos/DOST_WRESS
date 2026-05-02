from functools import wraps
import os

import jwt
from flask import current_app, g, jsonify, request, session

from app.extensions import db
from app.models.permission import Permission
from app.models.role_permissions import RolePermission
from app.models.user import User
from app.models.user_roles import UserRole


DEFAULT_JWT_SECRET_KEY = (
    "xK9mP2nQ5rS8tU1vW3yZ4aB6cD7eF0gH2jK5lN7pR9sT2uV4wX6yZ8aB1cD3eF5gH7jK9lN1pR3sT5uV7wX9z"
)

ADMIN_USER_TYPES = {"System Admin", "Organization Admin"}


def parse_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def get_jwt_secret_candidates():
    candidates = []

    try:
        app_secret = current_app.config.get("JWT_SECRET_KEY")
        if app_secret:
            candidates.append(app_secret)
    except RuntimeError:
        pass

    env_secret = os.environ.get("JWT_SECRET_KEY")
    if env_secret:
        candidates.append(env_secret)

    candidates.append("dev-jwt-secret-key")
    candidates.append(DEFAULT_JWT_SECRET_KEY)

    unique_candidates = []
    seen = set()

    for candidate in candidates:
        if candidate and candidate not in seen:
            unique_candidates.append(candidate)
            seen.add(candidate)

    return unique_candidates


def get_token_user_id():
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()

    if not token:
        return None

    for secret_key in get_jwt_secret_candidates():
        try:
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])

            user_id = (
                payload.get("user_id")
                or payload.get("id")
                or payload.get("sub")
            )

            return parse_int(user_id)

        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            continue

    return None


def get_current_user_id():
    token_user_id = get_token_user_id()

    if token_user_id:
        user = User.query.get(token_user_id)

        if user and user.is_active:
            g.user_id = user.id
            g.user = user
            session["user_id"] = user.id
            return user.id

        return None

    g_user_id = parse_int(getattr(g, "user_id", None))

    if g_user_id:
        user = User.query.get(g_user_id)

        if user and user.is_active:
            g.user_id = user.id
            g.user = user
            session["user_id"] = user.id
            return user.id

        return None

    session_user_id = parse_int(session.get("user_id"))

    if session_user_id:
        user = User.query.get(session_user_id)

        if user and user.is_active:
            g.user_id = user.id
            g.user = user
            return user.id

        session.pop("user_id", None)
        return None

    return None


def get_current_user():
    user_id = get_current_user_id()

    if not user_id:
        return None

    existing_user = getattr(g, "user", None)

    if existing_user and existing_user.id == user_id:
        return existing_user

    user = User.query.get(user_id)

    if user and user.is_active:
        g.user_id = user.id
        g.user = user
        session["user_id"] = user.id
        return user

    return None


def is_admin_user(user):
    return bool(user and user.user_type in ADMIN_USER_TYPES)


def get_request_project_id(kwargs=None, project_arg="project_id"):
    kwargs = kwargs or {}

    project_id = kwargs.get(project_arg)

    if project_id is None:
        project_id = kwargs.get("project_id")

    if project_id is None:
        project_id = request.args.get(project_arg)

    if project_id is None:
        project_id = request.args.get("project_id")

    if project_id is None:
        data = request.get_json(silent=True) or {}
        project_id = data.get(project_arg) or data.get("project_id")

    return parse_int(project_id)


def user_has_project_access(user_id, project_id):
    user_id = parse_int(user_id)
    project_id = parse_int(project_id)

    user = User.query.get(user_id)

    if is_admin_user(user):
        return True

    if not user or not project_id:
        return False

    return UserRole.query.filter_by(
        user_id=user_id,
        project_id=project_id
    ).first() is not None


def get_user_permission_keys(user_id, project_id=None):
    user_id = parse_int(user_id)
    project_id = parse_int(project_id)

    user = User.query.get(user_id)

    if not user or not user.is_active:
        return []

    if is_admin_user(user):
        return sorted([
            permission.key
            for permission in Permission.query.order_by(Permission.key.asc()).all()
        ])

    query = (
        db.session.query(Permission.key)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .filter(UserRole.user_id == user_id)
    )

    if project_id is not None:
        query = query.filter(UserRole.project_id == project_id)
    else:
        query = query.filter(UserRole.project_id.is_(None))

    return sorted({row[0] for row in query.all()})


def user_has_permission(user_id, permission_key, project_id=None):
    user_id = parse_int(user_id)
    project_id = parse_int(project_id)

    user = User.query.get(user_id)

    if not user or not user.is_active:
        return False

    if is_admin_user(user):
        return True

    query = (
        db.session.query(Permission.id)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .filter(
            UserRole.user_id == user_id,
            Permission.key == permission_key,
        )
    )

    if project_id is not None:
        query = query.filter(UserRole.project_id == project_id)
    else:
        query = query.filter(UserRole.project_id.is_(None))

    return query.first() is not None


def require_permission(permission_key, project_arg="project_id"):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()

            if not user:
                return jsonify({"message": "Unauthorized"}), 401

            if not user.is_active:
                return jsonify({"message": "User account is inactive"}), 403

            project_id = get_request_project_id(
                kwargs,
                project_arg=project_arg
            )

            if project_id is not None and not user_has_project_access(
                user.id,
                project_id
            ):
                return jsonify({
                    "message": "You don't have permission to access this project"
                }), 403

            if not user_has_permission(user.id, permission_key, project_id):
                return jsonify({
                    "message": f"You do not have permission: {permission_key}"
                }), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator