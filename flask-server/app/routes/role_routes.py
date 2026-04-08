from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permissions import RolePermission

role_bp = Blueprint("roles", __name__)


@role_bp.route("/", methods=["GET"])
def get_roles():
    roles = Role.query.order_by(Role.id.asc()).all()
    return jsonify([role.to_dict() for role in roles]), 200


@role_bp.route("/<int:role_id>", methods=["GET"])
def get_role(role_id):
    role = Role.query.get_or_404(role_id)
    return jsonify(role.to_dict()), 200


@role_bp.route("/", methods=["POST"])
def create_role():
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    permission_ids = data.get("permission_ids", [])

    if not name:
        return jsonify({"error": "Role name is required"}), 400

    existing_role = Role.query.filter_by(name=name).first()
    if existing_role:
        return jsonify({"error": "Role name already exists"}), 409

    role = Role(
        name=name,
        description=description,
        is_system=data.get("is_system", False)
    )

    db.session.add(role)
    db.session.flush()

    if permission_ids:
        permissions = Permission.query.filter(Permission.id.in_(permission_ids)).all()
        found_permission_ids = {permission.id for permission in permissions}

        missing_ids = [
            permission_id
            for permission_id in permission_ids
            if permission_id not in found_permission_ids
        ]
        if missing_ids:
            db.session.rollback()
            return jsonify({"error": f"Invalid permission IDs: {missing_ids}"}), 400

        for permission in permissions:
            db.session.add(RolePermission(role_id=role.id, permission_id=permission.id))

    db.session.commit()
    return jsonify(role.to_dict()), 201


@role_bp.route("/<int:role_id>", methods=["PUT"])
def update_role(role_id):
    role = Role.query.get_or_404(role_id)
    data = request.get_json() or {}

    name = data.get("name", role.name).strip()
    description = data.get("description", role.description or "").strip()
    permission_ids = data.get("permission_ids", None)

    if not name:
        return jsonify({"error": "Role name is required"}), 400

    existing_role = Role.query.filter(Role.name == name, Role.id != role.id).first()
    if existing_role:
        return jsonify({"error": "Role name already exists"}), 409

    role.name = name
    role.description = description

    if permission_ids is not None:
        permissions = Permission.query.filter(Permission.id.in_(permission_ids)).all()
        found_permission_ids = {permission.id for permission in permissions}

        missing_ids = [
            permission_id
            for permission_id in permission_ids
            if permission_id not in found_permission_ids
        ]
        if missing_ids:
            db.session.rollback()
            return jsonify({"error": f"Invalid permission IDs: {missing_ids}"}), 400

        RolePermission.query.filter_by(role_id=role.id).delete()

        for permission in permissions:
            db.session.add(RolePermission(role_id=role.id, permission_id=permission.id))

    db.session.commit()
    return jsonify(role.to_dict()), 200


@role_bp.route("/<int:role_id>", methods=["DELETE"])
def delete_role(role_id):
    role = Role.query.get_or_404(role_id)

    if role.is_system:
        return jsonify({"error": "System roles cannot be deleted"}), 403

    db.session.delete(role)
    db.session.commit()

    return jsonify({"message": "Role deleted successfully"}), 200