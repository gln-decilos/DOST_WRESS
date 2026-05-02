from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from app.extensions import db
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permissions import RolePermission
from app.utils.permissions import get_current_user, require_permission


role_bp = Blueprint("roles", __name__)


def error_response(message, status_code):
    return jsonify({
        "message": message,
        "error": message,
    }), status_code


def get_organization_id():
    user = get_current_user()

    if not user:
        return None

    if user.user_type == "System Admin":
        return None

    if user.user_type == "Organization Admin" and user.organizations:
        return user.organizations[0].id

    return None


def can_access_role(role):
    user = get_current_user()

    if not user:
        return False

    if user.user_type == "System Admin":
        return True

    if user.user_type == "Organization Admin":
        organization_id = get_organization_id()

        return role.organization_id is None or role.organization_id == organization_id

    return False


def normalize_permission_ids(permission_ids):
    normalized_ids = []

    if not isinstance(permission_ids, list):
        return normalized_ids

    for permission_id in permission_ids:
        try:
            normalized_ids.append(int(permission_id))
        except (TypeError, ValueError):
            continue

    return normalized_ids


def get_requested_permission_ids(data):
    permission_ids = data.get("permission_ids")
    permission_keys = data.get("permission_keys")
    permissions = data.get("permissions")

    if permission_ids is None and isinstance(permissions, list):
        if all(isinstance(item, int) for item in permissions):
            permission_ids = permissions
        elif all(isinstance(item, str) for item in permissions):
            permission_keys = permissions

    if permission_ids is not None:
        return normalize_permission_ids(permission_ids)

    if permission_keys is not None:
        existing_permissions = Permission.query.filter(
            Permission.key.in_(permission_keys)
        ).all()

        return [permission.id for permission in existing_permissions]

    return None


def validate_permissions(permission_ids):
    if permission_ids is None:
        return None, None

    normalized_ids = normalize_permission_ids(permission_ids)

    if not normalized_ids:
        return [], None

    permissions = Permission.query.filter(
        Permission.id.in_(normalized_ids)
    ).all()

    found_permission_ids = {permission.id for permission in permissions}

    missing_ids = [
        permission_id
        for permission_id in normalized_ids
        if permission_id not in found_permission_ids
    ]

    if missing_ids:
        return None, missing_ids

    return permissions, None


def update_role_permissions(role_id, permission_ids):
    permissions, missing_ids = validate_permissions(permission_ids)

    if missing_ids:
        return missing_ids

    RolePermission.query.filter_by(
        role_id=role_id
    ).delete(synchronize_session=False)

    for permission in permissions:
        db.session.add(RolePermission(
            role_id=role_id,
            permission_id=permission.id,
        ))

    return None


def role_name_exists(name, role_id=None, organization_id=None):
    query = Role.query.filter(Role.name == name)

    if role_id:
        query = query.filter(Role.id != role_id)

    if organization_id:
        query = query.filter(
            or_(
                Role.organization_id == organization_id,
                Role.organization_id.is_(None),
            )
        )
    else:
        query = query.filter(Role.organization_id.is_(None))

    return query.first() is not None


@role_bp.route("/", methods=["GET"])
@require_permission("roles.view")
def get_roles():
    organization_id = get_organization_id()

    if organization_id:
        roles = (
            Role.query
            .filter(
                or_(
                    Role.organization_id == organization_id,
                    Role.organization_id.is_(None),
                )
            )
            .order_by(Role.id.asc())
            .all()
        )
    else:
        roles = Role.query.order_by(Role.id.asc()).all()

    return jsonify([role.to_dict() for role in roles]), 200


@role_bp.route("/<int:role_id>", methods=["GET"])
@require_permission("roles.view")
def get_role(role_id):
    role = Role.query.get(role_id)

    if not role:
        return error_response("Role not found", 404)

    if not can_access_role(role):
        return error_response("You don't have permission to access this role", 403)

    return jsonify(role.to_dict()), 200


@role_bp.route("/", methods=["POST"])
@require_permission("roles.create")
def create_role():
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    permission_ids = get_requested_permission_ids(data)

    if not name:
        return error_response("Role name is required", 400)

    organization_id = get_organization_id()

    if role_name_exists(name, organization_id=organization_id):
        return error_response("Role name already exists in your organization", 409)

    try:
        role = Role(
            name=name,
            description=description,
            is_system=data.get("is_system", False),
            organization_id=organization_id,
        )

        db.session.add(role)
        db.session.flush()

        if permission_ids is not None:
            missing_ids = update_role_permissions(role.id, permission_ids)

            if missing_ids:
                db.session.rollback()
                return error_response(f"Invalid permission IDs: {missing_ids}", 400)

        db.session.commit()

        return jsonify({
            "message": "Role created successfully",
            "role": role.to_dict(),
        }), 201

    except Exception as error:
        db.session.rollback()
        print("Failed to create role:", error)

        return error_response("Failed to create role", 500)


@role_bp.route("/<int:role_id>", methods=["PUT"])
@require_permission("roles.edit")
def update_role(role_id):
    role = Role.query.get(role_id)

    if not role:
        return error_response("Role not found", 404)

    if not can_access_role(role):
        return error_response("You don't have permission to update this role", 403)

    data = request.get_json() or {}

    name = (data.get("name") or role.name or "").strip()
    description = (data.get("description") or "").strip()
    permission_ids = get_requested_permission_ids(data)

    if not name:
        return error_response("Role name is required", 400)

    organization_id = get_organization_id()

    if role_name_exists(name, role_id=role.id, organization_id=organization_id):
        return error_response("Role name already exists in your organization", 409)

    try:
        role.name = name
        role.description = description

        if permission_ids is not None:
            missing_ids = update_role_permissions(role.id, permission_ids)

            if missing_ids:
                db.session.rollback()
                return error_response(f"Invalid permission IDs: {missing_ids}", 400)

        db.session.commit()

        return jsonify({
            "message": "Role updated successfully",
            "role": role.to_dict(),
        }), 200

    except Exception as error:
        db.session.rollback()
        print("Failed to update role:", error)

        return error_response("Failed to update role", 500)


@role_bp.route("/<int:role_id>", methods=["DELETE"])
@require_permission("roles.delete")
def delete_role(role_id):
    role = Role.query.get(role_id)

    if not role:
        return error_response("Role not found", 404)

    if not can_access_role(role):
        return error_response("You don't have permission to delete this role", 403)

    if role.is_system:
        return error_response("System roles cannot be deleted", 403)

    from app.models.user_roles import UserRole

    assigned_users = UserRole.query.filter_by(
        role_id=role.id
    ).first()

    if assigned_users:
        return error_response("Cannot delete role that is assigned to users", 400)

    try:
        RolePermission.query.filter_by(
            role_id=role.id
        ).delete(synchronize_session=False)

        db.session.delete(role)
        db.session.commit()

        return jsonify({
            "message": "Role deleted successfully"
        }), 200

    except Exception as error:
        db.session.rollback()
        print("Failed to delete role:", error)

        return error_response("Failed to delete role", 500)