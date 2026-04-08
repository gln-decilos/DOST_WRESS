from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.user import User
from app.models.role import Role
from app.models.user_roles import UserRole

user_bp = Blueprint("users", __name__, url_prefix="/users")


@user_bp.route("", methods=["GET"])
def get_users():
    users = User.query.order_by(User.id.asc()).all()
    return jsonify([user.to_dict() for user in users]), 200


@user_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict()), 200


@user_bp.route("", methods=["POST"])
def create_user():
    data = request.get_json() or {}

    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role_ids = data.get("role_ids", [])

    if not first_name or not last_name or not email or not password:
        return jsonify({"error": "First name, last name, email, and password are required"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already exists"}), 409

    roles = []
    if role_ids:
        roles = Role.query.filter(Role.id.in_(role_ids)).all()
        found_role_ids = {role.id for role in roles}

        missing_ids = [role_id for role_id in role_ids if role_id not in found_role_ids]
        if missing_ids:
            return jsonify({"error": f"Invalid role IDs: {missing_ids}"}), 400

    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        is_active=data.get("is_active", True)
    )
    user.set_password(password)

    db.session.add(user)
    db.session.flush()

    for role in roles:
        db.session.add(UserRole(user_id=user.id, role_id=role.id))

    db.session.commit()
    return jsonify(user.to_dict()), 201


@user_bp.route("/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}

    email = data.get("email", user.email).strip().lower()

    existing_user = User.query.filter(User.email == email, User.id != user.id).first()
    if existing_user:
        return jsonify({"error": "Email already exists"}), 409

    user.first_name = data.get("first_name", user.first_name).strip()
    user.last_name = data.get("last_name", user.last_name).strip()
    user.email = email
    user.is_active = data.get("is_active", user.is_active)

    password = data.get("password")
    if password:
        user.set_password(password)

    role_ids = data.get("role_ids", None)
    if role_ids is not None:
        roles = Role.query.filter(Role.id.in_(role_ids)).all()
        found_role_ids = {role.id for role in roles}

        missing_ids = [role_id for role_id in role_ids if role_id not in found_role_ids]
        if missing_ids:
            return jsonify({"error": f"Invalid role IDs: {missing_ids}"}), 400

        UserRole.query.filter_by(user_id=user.id).delete()

        for role in roles:
            db.session.add(UserRole(user_id=user.id, role_id=role.id))

    db.session.commit()
    return jsonify(user.to_dict()), 200


@user_bp.route("/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "User deleted successfully"}), 200