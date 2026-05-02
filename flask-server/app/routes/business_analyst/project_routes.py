from flask import Blueprint, jsonify, request, g
from datetime import datetime
from functools import wraps
import jwt
import os

from app.extensions import db
from app.models.project import Project
from app.models.user import User
from app.models.user_roles import UserRole
from app.utils.permissions import require_permission

business_project_bp = Blueprint("business_project_bp", __name__)

JWT_SECRET_KEY = os.environ.get(
    "JWT_SECRET_KEY",
    "xK9mP2nQ5rS8tU1vW3yZ4aB6cD7eF0gH2jK5lN7pR9sT2uV4wX6yZ8aB1cD3eF5gH7jK9lN1pR3sT5uV7wX9z"
)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authentication required"}), 401

        token = auth_header.split(" ")[1]

        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            g.user_id = payload["user_id"]
            g.user = User.query.get(g.user_id)

            if not g.user:
                return jsonify({"error": "User not found"}), 401

            if not g.user.is_active:
                return jsonify({"error": "User account is deactivated"}), 401

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)

    return decorated_function


@business_project_bp.route("/projects", methods=["GET"])
@login_required
def get_projects():
    current_user = g.user

    user_project_roles = (
        UserRole.query
        .filter(
            UserRole.user_id == current_user.id,
            UserRole.project_id.isnot(None)
        )
        .all()
    )

    project_ids = list({
        user_role.project_id
        for user_role in user_project_roles
        if user_role.project_id is not None
    })

    if not project_ids:
        return jsonify([]), 200

    projects = (
        Project.query
        .filter(Project.id.in_(project_ids))
        .order_by(Project.created_at.desc())
        .all()
    )

    return jsonify([project.to_dict() for project in projects]), 200


@business_project_bp.route("/projects", methods=["POST"])
@login_required
@require_permission("project.create")
def create_project():
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    status = (data.get("status") or "Pending").strip()
    organization_id = data.get("organization_id")
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    if not name:
        return jsonify({"message": "Project title is required"}), 400

    if not organization_id:
        return jsonify({"message": "Organization is required"}), 400

    parsed_start_date = None
    parsed_end_date = None

    try:
        if start_date:
            parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d").date()

        if end_date:
            parsed_end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400

    if parsed_start_date and parsed_end_date and parsed_end_date < parsed_start_date:
        return jsonify({"message": "End date cannot be earlier than start date"}), 400

    try:
        project = Project(
            name=name,
            description=description,
            status=status,
            organization_id=organization_id,
            start_date=parsed_start_date,
            end_date=parsed_end_date,
        )

        db.session.add(project)
        db.session.flush()

        from app.models.role import Role

        member_role = Role.query.filter_by(name="Project Member").first()

        if not member_role:
            member_role = Role(
                name="Project Member",
                description="Project team member"
            )
            db.session.add(member_role)
            db.session.flush()

        user_role = UserRole(
            project_id=project.id,
            user_id=g.user.id,
            role_id=member_role.id
        )

        db.session.add(user_role)
        db.session.commit()

        return jsonify({
            "message": "Project created successfully",
            "project": project.to_dict()
        }), 201

    except Exception as error:
        db.session.rollback()
        print("Failed to create project:", error)

        return jsonify({"message": "Failed to create project"}), 500


@business_project_bp.route("/project/<int:project_id>/archive", methods=["PATCH"])
@login_required
@require_permission("project.edit", project_arg="project_id")
def archive_project(project_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404

    project.status = "Archived"
    db.session.commit()

    return jsonify({
        "message": "Project archived successfully",
        "project": project.to_dict()
    }), 200


@business_project_bp.route("/project/<int:project_id>/unarchive", methods=["PATCH"])
@login_required
@require_permission("project.edit", project_arg="project_id")
def unarchive_project(project_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404

    project.status = "Pending"
    db.session.commit()

    return jsonify({
        "message": "Project unarchived successfully",
        "project": project.to_dict()
    }), 200


@business_project_bp.route("/project/<int:project_id>", methods=["GET"])
@login_required
@require_permission("project.view", project_arg="project_id")
def get_project(project_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404

    return jsonify({"project": project.to_dict()}), 200


@business_project_bp.route("/project/<int:project_id>", methods=["PUT"])
@login_required
@require_permission("project.edit", project_arg="project_id")
def update_project(project_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404

    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    status = (data.get("status") or project.status).strip()
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    if not name:
        return jsonify({"message": "Project title is required"}), 400

    parsed_start_date = None
    parsed_end_date = None

    try:
        if start_date:
            parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d").date()

        if end_date:
            parsed_end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400

    if parsed_start_date and parsed_end_date and parsed_end_date < parsed_start_date:
        return jsonify({"message": "End date cannot be earlier than start date"}), 400

    project.name = name
    project.description = description
    project.status = status
    project.start_date = parsed_start_date
    project.end_date = parsed_end_date

    db.session.commit()

    return jsonify({
        "message": "Project updated successfully",
        "project": project.to_dict()
    }), 200


@business_project_bp.route("/project/<int:project_id>", methods=["DELETE"])
@login_required
@require_permission("project.delete", project_arg="project_id")
def delete_project(project_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404

    try:
        from app.models.project_document import ProjectDocument
        from app.models.project_document_value import ProjectDocumentValue
        from app.models.requirement_item import RequirementItem
        from app.models.requirement_item_value import RequirementItemValue
        from app.models.notification import Notification
        from app.models.project_stakeholder import ProjectStakeholder

        doc_ids = db.session.query(ProjectDocument.id).filter(
            ProjectDocument.project_id == project_id
        ).all()
        doc_id_list = [item[0] for item in doc_ids]

        deleted_req_item_values = 0
        deleted_req_items = 0
        deleted_values = 0

        if doc_id_list:
            req_item_ids = db.session.query(RequirementItem.id).filter(
                RequirementItem.project_document_id.in_(doc_id_list)
            ).all()
            req_item_id_list = [item[0] for item in req_item_ids]

            if req_item_id_list:
                deleted_req_item_values = RequirementItemValue.query.filter(
                    RequirementItemValue.item_id.in_(req_item_id_list)
                ).delete(synchronize_session=False)

            deleted_req_items = RequirementItem.query.filter(
                RequirementItem.project_document_id.in_(doc_id_list)
            ).delete(synchronize_session=False)

            deleted_values = ProjectDocumentValue.query.filter(
                ProjectDocumentValue.document_id.in_(doc_id_list)
            ).delete(synchronize_session=False)

        Notification.query.filter_by(
            project_id=project_id
        ).delete(synchronize_session=False)

        ProjectStakeholder.query.filter_by(
            project_id=project_id
        ).delete(synchronize_session=False)

        deleted_docs = ProjectDocument.query.filter_by(
            project_id=project_id
        ).delete(synchronize_session=False)

        deleted_roles = UserRole.query.filter_by(
            project_id=project_id
        ).delete(synchronize_session=False)

        db.session.delete(project)
        db.session.commit()

        return jsonify({
            "message": "Project deleted successfully",
            "deleted_records": {
                "requirement_item_values": deleted_req_item_values,
                "requirement_items": deleted_req_items,
                "document_values": deleted_values,
                "documents": deleted_docs,
                "user_roles": deleted_roles,
            }
        }), 200

    except Exception as error:
        db.session.rollback()
        print(f"Error deleting project {project_id}: {str(error)}")

        return jsonify({
            "message": f"Failed to delete project: {str(error)}"
        }), 500