from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.user import User
from app.models.role import Role
from app.models.organization import Organization

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
    organization_id = data.get("organization_id")
    role_id = data.get("role_id")

    if not first_name or not last_name or not email or not password:
        return jsonify({"message": "First name, last name, email, and password are required"}), 400

    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email already exists"}), 409

    organization = Organization.query.get(organization_id)
    if not organization:
        return jsonify({"message": "Organization not found"}), 404

    role = Role.query.get(role_id)
    if not role:
        return jsonify({"message": "Role not found"}), 404

    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        organization_id=organization_id,
        role_id=role_id,
        is_active=True,
    )
    user.set_password(password)

    db.session.add(user)
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

    first_name = data.get("first_name", user.first_name).strip()
    last_name = data.get("last_name", user.last_name).strip()
    email = data.get("email", user.email).strip().lower()
    role_id = data.get("role_id", user.role_id)
    is_active = data.get("is_active", user.is_active)

    if not first_name or not last_name or not email:
        return jsonify({"message": "First name, last name, and email are required"}), 400

    existing_user = User.query.filter(User.email == email, User.id != user_id).first()
    if existing_user:
        return jsonify({"message": "Another user with this email already exists"}), 409

    role = Role.query.get(role_id)
    if not role:
        return jsonify({"message": "Role not found"}), 404

    user.first_name = first_name
    user.last_name = last_name
    user.email = email
    user.role_id = role_id
    user.is_active = is_active

    db.session.commit()

    return jsonify({
        "message": "User updated successfully",
        "user": user.to_dict()
    }), 200