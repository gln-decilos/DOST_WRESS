from flask import Blueprint, jsonify
from app.models.user import User

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/users", methods=["GET"])
def get_users():
    users = User.query.all()

    return jsonify([
        {
            "id": u.id,
            "name": f"{u.first_name} {u.last_name}",
            "email": u.email,
            "role": u.role.name if u.role else None,
            "organization_id": u.organization_id,
            "is_active": u.is_active
        }
        for u in users
    ])