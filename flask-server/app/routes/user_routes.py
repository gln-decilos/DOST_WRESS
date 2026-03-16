from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.user import User
from app.models.role import Role
from app.models.organization import Organization
from app.models.user_roles import UserRole 
from app.models.organization_member import OrganizationMember 
user_bp = Blueprint("user", __name__)


@user_bp.route("/users", methods=["GET"])
def get_users():
    users = User.query.order_by(User.id.asc()).all()
    return jsonify([user.to_dict() for user in users]), 200


@user_bp.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify(user.to_dict()), 200


@user_bp.route("/users", methods=["POST"])
def create_user():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data provided"}), 400

    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    is_active = data.get("is_active", True)

    organization_ids = data.get("organization_ids", [])
    role_ids = data.get("role_ids", [])

    if not first_name:
        return jsonify({"message": "First name is required"}), 400

    if not last_name:
        return jsonify({"message": "Last name is required"}), 400

    if not email:
        return jsonify({"message": "Email is required"}), 400

    if not password:
        return jsonify({"message": "Password is required"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email already exists"}), 409

    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        is_active=is_active,
    )
    user.set_password(password)

    db.session.add(user)
    db.session.flush()

    for org_id in organization_ids:
        organization = Organization.query.get(org_id)
        if organization:
            db.session.add(
                OrganizationMember(user_id=user.id, organization_id=org_id)
            )

    for role_id in role_ids:
        role = Role.query.get(role_id)
        if role:
            db.session.add(
                UserRole(user_id=user.id, role_id=role_id)
            )

    db.session.commit()

    return jsonify({
        "message": "User created successfully",
        "user": user.to_dict()
    }), 201


@user_bp.route("/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data provided"}), 400

    first_name = data.get("first_name", user.first_name).strip()
    last_name = data.get("last_name", user.last_name).strip()
    email = data.get("email", user.email).strip().lower()
    password = data.get("password", "").strip()
    is_active = data.get("is_active", user.is_active)

    organization_ids = data.get("organization_ids", [])
    role_ids = data.get("role_ids", [])

    if not first_name:
        return jsonify({"message": "First name is required"}), 400

    if not last_name:
        return jsonify({"message": "Last name is required"}), 400

    if not email:
        return jsonify({"message": "Email is required"}), 400

    existing_user = User.query.filter(
        User.email == email,
        User.id != user_id
    ).first()

    if existing_user:
        return jsonify({"message": "Another user with this email already exists"}), 409

    user.first_name = first_name
    user.last_name = last_name
    user.email = email
    user.is_active = is_active

    if password:
        user.set_password(password)

    OrganizationMember.query.filter_by(user_id=user.id).delete()
    UserRole.query.filter_by(user_id=user.id).delete()

    for org_id in organization_ids:
        organization = Organization.query.get(org_id)
        if organization:
            db.session.add(
                OrganizationMember(user_id=user.id, organization_id=org_id)
            )

    for role_id in role_ids:
        role = Role.query.get(role_id)
        if role:
            db.session.add(
                UserRole(user_id=user.id, role_id=role_id)
            )

    db.session.commit()

    return jsonify({
        "message": "User updated successfully",
        "user": user.to_dict()
    }), 200


@user_bp.route("/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()

    return jsonify({
        "message": "User deleted successfully"
    }), 200