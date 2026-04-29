from flask import Blueprint, jsonify, request, session
from app.extensions import db
from app.models.project import Project
from app.models.user import User
from app.models.role import Role
from app.models.user_roles import UserRole
from app.models.project_stakeholder import ProjectStakeholder

project_stakeholder_bp = Blueprint("project_stakeholder_bp", __name__)

ALLOWED_STAKEHOLDER_STATUSES = {"Active", "Inactive"}


def parse_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_role_ids(role_ids):
    if not isinstance(role_ids, list):
        return None

    parsed_ids = []

    for role_id in role_ids:
        parsed_role_id = parse_int(role_id)

        if parsed_role_id is None:
            return None

        parsed_ids.append(parsed_role_id)

    return list(dict.fromkeys(parsed_ids))


def normalize_status(status):
    clean_status = str(status or "Active").strip()

    if clean_status not in ALLOWED_STAKEHOLDER_STATUSES:
        return None

    return clean_status


def get_roles_or_error(role_ids):
    roles = Role.query.filter(Role.id.in_(role_ids)).all()
    found_role_ids = {role.id for role in roles}

    missing_ids = [
        role_id
        for role_id in role_ids
        if role_id not in found_role_ids
    ]

    if missing_ids:
        return None, jsonify({
            "message": f"Invalid role IDs: {missing_ids}"
        }), 400

    return roles, None, None


def get_current_user_id():
    return session.get("user_id")


def serialize_user(user):
    if not user:
        return None

    first_name = user.first_name or ""
    last_name = user.last_name or ""
    full_name = f"{first_name} {last_name}".strip()

    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": full_name,
        "email": user.email,
        "is_active": user.is_active,
    }


def serialize_role(role):
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
    }


def get_project_user_roles(project_id, user_id):
    user_roles = (
        UserRole.query
        .filter_by(
            user_id=user_id,
            project_id=project_id
        )
        .all()
    )

    return [
        user_role.role
        for user_role in user_roles
        if user_role.role
    ]


def serialize_project_stakeholder(stakeholder):
    roles = get_project_user_roles(
        stakeholder.project_id,
        stakeholder.user_id
    )

    return {
        "id": stakeholder.id,
        "project_id": stakeholder.project_id,
        "user_id": stakeholder.user_id,
        "added_by": stakeholder.added_by,
        "status": stakeholder.status,
        "user": serialize_user(stakeholder.user),
        "roles": [
            serialize_role(role)
            for role in roles
        ],
        "role_ids": [
            role.id
            for role in roles
        ],
        "created_at": stakeholder.created_at.isoformat() if stakeholder.created_at else None,
        "updated_at": stakeholder.updated_at.isoformat() if stakeholder.updated_at else None,
    }


@project_stakeholder_bp.route("/project/<int:project_id>/stakeholders", methods=["GET"])
def get_project_stakeholders(project_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({
            "message": "Project not found"
        }), 404

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
    project = Project.query.get(project_id)

    if not project:
        return jsonify({
            "message": "Project not found"
        }), 404

    stakeholder = (
        ProjectStakeholder.query
        .filter_by(
            id=stakeholder_id,
            project_id=project_id
        )
        .first()
    )

    if not stakeholder:
        return jsonify({
            "message": "Stakeholder not found"
        }), 404

    return jsonify({
        "stakeholder": serialize_project_stakeholder(stakeholder)
    }), 200


@project_stakeholder_bp.route("/project/<int:project_id>/stakeholders", methods=["POST"])
def create_project_stakeholder(project_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({
            "message": "Project not found"
        }), 404

    data = request.get_json() or {}

    user_id = parse_int(data.get("user_id"))
    role_ids = parse_role_ids(data.get("role_ids", []))
    status = normalize_status(data.get("status", "Active"))

    if not user_id:
        return jsonify({
            "message": "User is required"
        }), 400

    if role_ids is None:
        return jsonify({
            "message": "Role IDs must be a list of valid IDs"
        }), 400

    if not role_ids:
        return jsonify({
            "message": "At least one role is required"
        }), 400

    if status is None:
        return jsonify({
            "message": "Invalid status. Allowed values are Active and Inactive"
        }), 400

    user = User.query.get(user_id)

    if not user:
        return jsonify({
            "message": "User not found"
        }), 404

    existing_stakeholder = (
        ProjectStakeholder.query
        .filter_by(
            project_id=project_id,
            user_id=user.id
        )
        .first()
    )

    if existing_stakeholder:
        return jsonify({
            "message": "User is already a stakeholder in this project"
        }), 409

    roles, error_response, status_code = get_roles_or_error(role_ids)

    if error_response:
        return error_response, status_code

    try:
        stakeholder = ProjectStakeholder(
            project_id=project_id,
            user_id=user.id,
            added_by=get_current_user_id(),
            status=status
        )

        db.session.add(stakeholder)
        db.session.flush()

        UserRole.query.filter_by(
            user_id=user.id,
            project_id=project_id
        ).delete(synchronize_session=False)

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

    except Exception as error:
        db.session.rollback()
        print("Failed to add stakeholder:", error)

        return jsonify({
            "message": "Failed to add stakeholder"
        }), 500


@project_stakeholder_bp.route("/project/<int:project_id>/stakeholders/<int:stakeholder_id>", methods=["PUT"])
def update_project_stakeholder(project_id, stakeholder_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({
            "message": "Project not found"
        }), 404

    stakeholder = (
        ProjectStakeholder.query
        .filter_by(
            id=stakeholder_id,
            project_id=project_id
        )
        .first()
    )

    if not stakeholder:
        return jsonify({
            "message": "Stakeholder not found"
        }), 404

    data = request.get_json() or {}

    role_ids = data.get("role_ids", None)
    status = data.get("status", None)

    roles = None

    if role_ids is not None:
        role_ids = parse_role_ids(role_ids)

        if role_ids is None:
            return jsonify({
                "message": "Role IDs must be a list of valid IDs"
            }), 400

        if not role_ids:
            return jsonify({
                "message": "At least one role is required"
            }), 400

        roles, error_response, status_code = get_roles_or_error(role_ids)

        if error_response:
            return error_response, status_code

    if status is not None:
        status = normalize_status(status)

        if status is None:
            return jsonify({
                "message": "Invalid status. Allowed values are Active and Inactive"
            }), 400

    try:
        if status is not None:
            stakeholder.status = status

        if roles is not None:
            UserRole.query.filter_by(
                user_id=stakeholder.user_id,
                project_id=project_id
            ).delete(synchronize_session=False)

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

    except Exception as error:
        db.session.rollback()
        print("Failed to update stakeholder:", error)

        return jsonify({
            "message": "Failed to update stakeholder"
        }), 500


@project_stakeholder_bp.route("/project/<int:project_id>/stakeholders/<int:stakeholder_id>", methods=["DELETE"])
def delete_project_stakeholder(project_id, stakeholder_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({
            "message": "Project not found"
        }), 404

    stakeholder = (
        ProjectStakeholder.query
        .filter_by(
            id=stakeholder_id,
            project_id=project_id
        )
        .first()
    )

    if not stakeholder:
        return jsonify({
            "message": "Stakeholder not found"
        }), 404

    try:
        UserRole.query.filter_by(
            user_id=stakeholder.user_id,
            project_id=project_id
        ).delete(synchronize_session=False)

        db.session.delete(stakeholder)
        db.session.commit()

        return jsonify({
            "message": "Stakeholder removed successfully"
        }), 200

    except Exception as error:
        db.session.rollback()
        print("Failed to remove stakeholder:", error)

        return jsonify({
            "message": "Failed to remove stakeholder"
        }), 500