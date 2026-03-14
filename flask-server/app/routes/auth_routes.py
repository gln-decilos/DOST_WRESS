from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.user import User

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    existing_user = User.query.filter_by(email=data["email"]).first()
    if existing_user:
        return jsonify({"message": "Email already exists"}), 400

    user = User(
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=data["email"],
        organization_id=data["organization_id"],
        role_id=data["role_id"]
    )
    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created successfully"}), 201