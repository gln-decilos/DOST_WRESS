from flask import Blueprint, request, jsonify, session
from app.models.user import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/signin", methods=["POST"])
def signin():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"message": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "Invalid email or password."}), 401

    if not user.is_active:
        return jsonify({"message": "Your account is inactive."}), 403

    if not user.check_password(password):
        return jsonify({"message": "Invalid email or password."}), 401

    session["user_id"] = user.id

    return jsonify({
        "message": "Sign in successful.",
        "user": user.to_dict()
    }), 200


@auth_bp.route("/me", methods=["GET"])
def me():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"message": "Not authenticated."}), 401

    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "User not found."}), 404

    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"message": "Logged out successfully."}), 200