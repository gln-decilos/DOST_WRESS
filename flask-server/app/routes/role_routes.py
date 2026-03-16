from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.role import Role

role_bp = Blueprint("role", __name__)

@role_bp.route("/roles", methods=["GET"])
def get_roles():
    roles = Role.query.order_by(Role.id.asc()).all()
    return jsonify([role.to_dict() for role in roles]), 200


@role_bp.route("/roles/<int:role_id>", methods=["GET"])
def get_role(role_id):
    role = Role.query.get(role_id)

    if not role:
        return jsonify({"message": "Role not found"}), 404

    return jsonify(role.to_dict()), 200


@role_bp.route("/roles", methods=["POST"])
def create_role():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data provided"}), 400

    name = data.get("name", "").strip()
    description = data.get("description", "")
    description = description.strip() if isinstance(description, str) else None

    if not name:
        return jsonify({"message": "Role name is required"}), 400

    existing_role = Role.query.filter_by(name=name).first()
    if existing_role:
        return jsonify({"message": "Role already exists"}), 409

    role = Role(name=name, description=description or None)

    db.session.add(role)
    db.session.commit()

    return jsonify({
        "message": "Role created successfully",
        "role": role.to_dict()
    }), 201


@role_bp.route("/roles/<int:role_id>", methods=["PUT"])
def update_role(role_id):
    role = Role.query.get(role_id)

    if not role:
        return jsonify({"message": "Role not found"}), 404

    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data provided"}), 400

    name = data.get("name", role.name)
    description = data.get("description", role.description)

    name = name.strip() if isinstance(name, str) else ""
    description = description.strip() if isinstance(description, str) else None

    if not name:
        return jsonify({"message": "Role name is required"}), 400

    existing_role = Role.query.filter(Role.name == name, Role.id != role_id).first()
    if existing_role:
        return jsonify({"message": "Another role with this name already exists"}), 409

    role.name = name
    role.description = description

    db.session.commit()

    return jsonify({
        "message": "Role updated successfully",
        "role": role.to_dict()
    }), 200


@role_bp.route("/roles/<int:role_id>", methods=["DELETE"])
def delete_role(role_id):
    role = Role.query.get(role_id)

    if not role:
        return jsonify({"message": "Role not found"}), 404

    db.session.delete(role)
    db.session.commit()

    return jsonify({"message": "Role deleted successfully"}), 200