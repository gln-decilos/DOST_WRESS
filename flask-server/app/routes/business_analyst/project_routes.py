from flask import Blueprint, jsonify, request
from datetime import datetime
from app.extensions import db
from app.models.project import Project

business_project_bp = Blueprint("business_project_bp", __name__)


@business_project_bp.route("/projects", methods=["GET"])
def get_projects():
    projects = Project.query.order_by(Project.created_at.desc()).all()
    return jsonify([project.to_dict() for project in projects]), 200


@business_project_bp.route("/projects", methods=["POST"])
def create_project():
    data = request.get_json()

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

    project = Project(
        name=name,
        description=description,
        status=status,
        organization_id=organization_id,
        start_date=parsed_start_date,
        end_date=parsed_end_date,
    )

    db.session.add(project)
    db.session.commit()

    return jsonify({
        "message": "Project created successfully",
        "project": project.to_dict()
    }), 201