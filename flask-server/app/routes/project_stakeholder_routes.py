from flask import Blueprint, jsonify, request, session
from app.extensions import db
from app.models.project import Project
from app.models.user import User
from app.models.role import Role
from app.models.user_roles import UserRole
from app.models.project_stakeholder import ProjectStakeholder

project_stakeholder_bp = Blueprint("project_stakeholder_bp", __name__)


def parse_role_ids(role_ids):
    if not isinstance(role_ids, list):
        return None

    parsed_ids = []

    for role_id in role_ids:
        try:
            parsed_ids.append(int(role_id))
        except (TypeError, ValueError):
            return None

    return list(dict.fromkeys(parsed_ids))


def get_roles_or_error(role_ids):
    roles = Role.query.filter(Role.id.in_(role_ids)).all()
    found_role_ids = {role.id for role in roles}

    missing_ids = [
        role_id
        for role_id in role_ids
        if role_id not in found_role_ids
    ]

    if missing_ids:
        return None, jsonify({"message": f"Invalid role IDs: {missing_ids}"}), 400

    return roles, None, None


def serialize_project_stakeholder(stakeholder):
    user_roles = (
        UserRole.query
        .filter_by(
            user_id=stakeholder.user_id,
            project_id=stakeholder.project_id
        )
        .all()
    )

    roles = [
        user_role.role
        for user_role in user_roles
        if user_role.role
    ]

    return {
        "id": stakeholder.id,
        "project_id": stakeholder.project_id,
        "user_id": stakeholder.user_id,
        "added_by": stakeholder.added_by,
        "status": stakeholder.status,
        "user": {
            "id": stakeholder.user.id,
            "first_name": stakeholder.user.first_name,
            "last_name": stakeholder.user.last_name,
            "full_name": f"{stakeholder.user.first_name} {stakeholder.user.last_name}",
            "email": stakeholder.user.email,
            "is_active": stakeholder.user.is_active,
        } if stakeholder.user else None,
        "roles": [
            {
                "id": role.id,
                "name": role.name,
                "description": role.description,
            }
            for role in roles
        ],
        "role_ids": [role.id for role in roles],
        "created_at": stakeholder.created_at.isoformat() if stakeholder.created_at else None,
        "updated_at": stakeholder.updated_at.isoformat() if stakeholder.updated_at else None,
    }


@project_stakeholder_bp.route("/project/<int:project_id>/stakeholders", methods=["GET"])
def get_project_stakeholders(project_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404

    stakeholders = (
        ProjectStakeholder.query
        .join(User, User.id == ProjectStakeholder.user_id)
        .filter(ProjectStakeholder.project_id == project_id)
        .order_by(User.first_name.asc(), User.last_name.asc())
        .all()
    )

    return jsonify({
        "project": project.to_dict(),
        "stakeholders": [
            serialize_project_stakeholder(stakeholder)
            for stakeholder in stakeholders
        ]
    }), 200


@project_stakeholder_bp.route("/project/<int:project_id>/stakeholders/<int:stakeholder_id>", methods=["GET"])
def get_project_stakeholder(project_id, stakeholder_id):
    stakeholder = ProjectStakeholder.query.filter_by(
        id=stakeholder_id,
        project_id=project_id
    ).first()

    if not stakeholder:
        return jsonify({"message": "Stakeholder not found"}), 404

    return jsonify({
        "stakeholder": serialize_project_stakeholder(stakeholder)
    }), 200


@project_stakeholder_bp.route("/project/<int:project_id>/stakeholders", methods=["POST"])
def create_project_stakeholder(project_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404

    data = request.get_json() or {}

    user_id = data.get("user_id")
    role_ids = parse_role_ids(data.get("role_ids", []))
    status = (data.get("status") or "Active").strip()

    if not user_id:
        return jsonify({"message": "User is required"}), 400

    if role_ids is None:
        return jsonify({"message": "Role IDs must be a list"}), 400

    if not role_ids:
        return jsonify({"message": "At least one role is required"}), 400

    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "User not found"}), 404

    existing_stakeholder = ProjectStakeholder.query.filter_by(
        project_id=project_id,
        user_id=user.id
    ).first()

    if existing_stakeholder:
        return jsonify({"message": "User is already a stakeholder in this project"}), 409

    roles, error_response, status_code = get_roles_or_error(role_ids)

    if error_response:
        return error_response, status_code

    try:
        stakeholder = ProjectStakeholder(
            project_id=project_id,
            user_id=user.id,
            added_by=session.get("user_id"),
            status=status
        )

        db.session.add(stakeholder)
        db.session.flush()

        for role in roles:
            db.session.add(UserRole(
                user_id=user.id,
                role_id=role.id,
                project_id=project_id
            ))

        db.session.commit()

        return jsonify({
            "message": "Stakeholder added successfully",
            "stakeholder": serialize_project_stakeholder(stakeholder)
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to add stakeholder"}), 500


@project_stakeholder_bp.route("/project/<int:project_id>/stakeholders/<int:stakeholder_id>", methods=["PUT"])
def update_project_stakeholder(project_id, stakeholder_id):
    stakeholder = ProjectStakeholder.query.filter_by(
        id=stakeholder_id,
        project_id=project_id
    ).first()

    if not stakeholder:
        return jsonify({"message": "Stakeholder not found"}), 404

    data = request.get_json() or {}

    role_ids = data.get("role_ids", None)
    status = data.get("status", None)

    roles = None

    if role_ids is not None:
        role_ids = parse_role_ids(role_ids)

        if role_ids is None:
            return jsonify({"message": "Role IDs must be a list"}), 400

        if not role_ids:
            return jsonify({"message": "At least one role is required"}), 400

        roles, error_response, status_code = get_roles_or_error(role_ids)

        if error_response:
            return error_response, status_code

    try:
        if status is not None:
            stakeholder.status = str(status).strip() or stakeholder.status

        if roles is not None:
            UserRole.query.filter_by(
                user_id=stakeholder.user_id,
                project_id=project_id
            ).delete()

            for role in roles:
                db.session.add(UserRole(
                    user_id=stakeholder.user_id,
                    role_id=role.id,
                    project_id=project_id
                ))

        db.session.commit()

        return jsonify({
            "message": "Stakeholder updated successfully",
            "stakeholder": serialize_project_stakeholder(stakeholder)
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to update stakeholder"}), 500


@project_stakeholder_bp.route("/project/<int:project_id>/stakeholders/<int:stakeholder_id>", methods=["DELETE"])
def delete_project_stakeholder(project_id, stakeholder_id):
    stakeholder = ProjectStakeholder.query.filter_by(
        id=stakeholder_id,
        project_id=project_id
    ).first()

    if not stakeholder:
        return jsonify({"message": "Stakeholder not found"}), 404

    try:
        UserRole.query.filter_by(
            user_id=stakeholder.user_id,
            project_id=project_id
        ).delete()

        db.session.delete(stakeholder)
        db.session.commit()

        return jsonify({"message": "Stakeholder removed successfully"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to remove stakeholder"}), 500