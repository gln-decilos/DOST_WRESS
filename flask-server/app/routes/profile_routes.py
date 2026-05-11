from flask import Blueprint, jsonify, g, request
from app.extensions import db
from app.models.user import User
from app.models.user_roles import UserRole
from app.models.project import Project
from app.models.organization_member import OrganizationMember
from app.models.organization import Organization
from functools import wraps
import jwt
import os

profile_bp = Blueprint("profile_bp", __name__)

JWT_SECRET_KEY = os.environ.get(
    "JWT_SECRET_KEY",
    "xK9mP2nQ5rS8tU1vW3yZ4aB6cD7eF0gH2jK5lN7pR9sT2uV4wX6yZ8aB1cD3eF5gH7jK9lN1pR3sT5uV7wX9z"
)


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"message": "Authentication required"}), 401

        token = auth_header.split(" ")[1]

        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            g.user_id = payload["user_id"]
            g.user = User.query.get(g.user_id)

            if not g.user:
                return jsonify({"message": "User not found"}), 401

        except Exception:
            return jsonify({"message": "Invalid token"}), 401

        return f(*args, **kwargs)

    return wrapper


def serialize_user(user):
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
    }


@profile_bp.route("/me", methods=["GET"])
@login_required
def get_my_profile():
    user = g.user

    org_member = OrganizationMember.query.filter_by(
        user_id=user.id
    ).first()

    organizations = []

    if org_member:
        organization = Organization.query.get(org_member.organization_id)

        if organization:
          organizations.append({
              "id": organization.id,
              "name": organization.name,
              "contact_email": organization.contact_email,
              "subscription_plan": organization.subscription_plan,
              "logo": organization.logo
          })

    user_roles = UserRole.query.filter_by(user_id=user.id).all()

    project_map = {}

    for ur in user_roles:
        if not ur.project_id:
            continue

        project = Project.query.get(ur.project_id)
        if not project:
            continue

        if project.id not in project_map:
            project_map[project.id] = {
                "project": project,
                "roles": []
            }

        if ur.role:
            project_map[project.id]["roles"].append({
                "role_id": ur.role.id,
                "role_name": ur.role.name
            })

    projects = [
        {
            "project_id": data["project"].id,
            "project_name": data["project"].name,
            "status": data["project"].status,
            "roles": data["roles"]
        }
        for data in project_map.values()
    ]

    return jsonify({
        "user": serialize_user(user),
        "organizations": organizations,
        "projects": projects
    }), 200

@profile_bp.route("/me", methods=["PUT"])
@login_required
def update_my_profile():
    user = g.user

    data = request.get_json()

    first_name = data.get("first_name")
    last_name = data.get("last_name")
    email = data.get("email")

    if not first_name or not last_name or not email:
        return jsonify({
            "message": "All fields are required"
        }), 400

    existing_email = User.query.filter(
        User.email == email,
        User.id != user.id
    ).first()

    if existing_email:
        return jsonify({
            "message": "Email already exists"
        }), 400

    user.first_name = first_name
    user.last_name = last_name
    user.email = email

    db.session.commit()

    return jsonify({
        "message": "Profile updated successfully",
        "user": serialize_user(user)
    }), 200