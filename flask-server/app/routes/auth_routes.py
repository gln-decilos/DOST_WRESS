from flask import Blueprint, request, jsonify, session
from app.extensions import db
from app.models.user import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/signin", methods=["POST"])
def signin():
    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "User account is inactive"}), 403

    session["user_id"] = user.id

    return jsonify({
        "message": "Sign in successful",
        "user": user.to_dict()
    }), 200


@auth_bp.route("/me", methods=["GET"])
def me():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"authenticated": False}), 401

    user = User.query.get(user_id)

    if not user:
        session.clear()
        return jsonify({"authenticated": False}), 401

    return jsonify({
        "authenticated": True,
        "user": user.to_dict()
    }), 200


@auth_bp.route("/signout", methods=["POST"])
def signout():
    session.clear()
    return jsonify({"message": "Signed out successfully"}), 200