import json
import os
import uuid
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request, send_file
from sqlalchemy import and_, or_
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.document_templates import DocumentTemplate
from app.models.notification import Notification
from app.models.requirement_change_request import RequirementChangeRequest
from app.models.requirement_item import RequirementItem
from app.models.role import Role
from app.models.user_roles import UserRole
from app.routes.requirements_routes import (
    build_requirement_document_summary,
    build_requirement_item_summary,
    get_active_user_id,
    get_requirement_document_record,
    hidden_draft_response,
    is_document_visible_to_current_user,
)
from app.utils.permissions import require_permission

change_request_bp = Blueprint("change_requests", __name__)

CHANGE_REQUEST_STATUSES = {"Draft", "Submitted"}
CHANGE_TYPES = {"Modify", "Add", "Remove", "Clarify", "Other"}
CHANGE_PRIORITIES = {"Low", "Medium", "High", "Critical"}
ALLOWED_UPLOAD_EXTENSIONS = {"pdf", "doc", "docx", "png", "jpg", "jpeg"}


def get_upload_directory():
    upload_dir = os.path.abspath(
        os.path.join(current_app.root_path, "..", "uploads", "change_requests")
    )
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def allowed_upload_file(filename):
    if not filename or "." not in filename:
        return False

    extension = filename.rsplit(".", 1)[1].lower()
    return extension in ALLOWED_UPLOAD_EXTENSIONS


def parse_requested_date(value):
    value = (value or "").strip()

    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def normalize_choice(value, allowed_values, default_value):
    clean_value = (value or "").strip()

    for allowed_value in allowed_values:
        if clean_value.lower() == allowed_value.lower():
            return allowed_value

    return default_value


def get_requirement_item_or_404(document, item_id):
    return RequirementItem.query.filter_by(
        id=item_id,
        project_document_id=document.id,
    ).first()


def can_current_user_view_change_request(change_request):
    current_user_id = get_active_user_id()

    if change_request.status == "Draft":
        return change_request.created_by == current_user_id

    return change_request.status == "Submitted"


def get_visible_change_requests_query(project_id, document_id, current_user_id):
    return RequirementChangeRequest.query.filter(
        RequirementChangeRequest.project_id == project_id,
        RequirementChangeRequest.document_id == document_id,
        or_(
            RequirementChangeRequest.status == "Submitted",
            and_(
                RequirementChangeRequest.status == "Draft",
                RequirementChangeRequest.created_by == current_user_id,
            ),
        ),
    )


def build_change_request_payload(change_request, template=None):
    payload = change_request.to_dict(include_snapshot=True)

    item = RequirementItem.query.filter_by(
        id=change_request.item_id,
        project_document_id=change_request.document_id,
    ).first()

    if item and template:
        payload["requirement"] = build_requirement_item_summary(item, template)
    else:
        payload["requirement"] = None

    current_user_id = get_active_user_id()

    payload["can_delete"] = (
        change_request.status == "Draft"
        and change_request.created_by == current_user_id
    )

    payload["can_view_file"] = can_current_user_view_change_request(change_request)

    return payload


def get_document_change_request_summary(project_id, document_id, current_user_id):
    visible_change_requests = (
        get_visible_change_requests_query(
            project_id=project_id,
            document_id=document_id,
            current_user_id=current_user_id,
        )
        .all()
    )

    draft_count = sum(1 for item in visible_change_requests if item.status == "Draft")
    submitted_count = sum(
        1 for item in visible_change_requests if item.status == "Submitted"
    )

    return {
        "total_count": len(visible_change_requests),
        "draft_count": draft_count,
        "submitted_count": submitted_count,
    }


def save_signed_change_request_file(uploaded_file):
    if not uploaded_file or not uploaded_file.filename:
        return None

    if not allowed_upload_file(uploaded_file.filename):
        raise ValueError(
            "Signed change request form must be PDF, DOC, DOCX, PNG, JPG, or JPEG"
        )

    original_filename = secure_filename(uploaded_file.filename)
    extension = original_filename.rsplit(".", 1)[1].lower()
    stored_filename = f"{uuid.uuid4().hex}.{extension}"
    upload_dir = get_upload_directory()
    stored_path = os.path.join(upload_dir, stored_filename)

    uploaded_file.save(stored_path)

    try:
        file_size = os.path.getsize(stored_path)
    except OSError:
        file_size = None

    return {
        "filename": original_filename,
        "path": stored_path,
        "mime_type": uploaded_file.mimetype,
        "size": file_size,
    }


def create_notification(
    user_id,
    project_id,
    document_id,
    title,
    message,
    notification_type,
    link=None,
):
    if not user_id:
        return False

    db.session.add(
        Notification(
            user_id=user_id,
            project_id=project_id,
            document_id=document_id,
            title=title,
            message=message,
            type=notification_type,
            link=link,
        )
    )

    return True


def get_development_team_user_ids(project_id):
    developer_role_names = [
        "developer",
        "dev team",
        "development team",
        "development",
    ]

    developer_members = (
        UserRole.query
        .join(Role, Role.id == UserRole.role_id)
        .filter(
            UserRole.project_id == project_id,
            UserRole.user_id.isnot(None),
            db.func.lower(Role.name).in_(developer_role_names),
        )
        .all()
    )

    user_ids = []
    seen_user_ids = set()

    for member in developer_members:
        if member.user_id in seen_user_ids:
            continue

        user_ids.append(member.user_id)
        seen_user_ids.add(member.user_id)

    return user_ids


def notify_development_team_about_change_requests(
    project_id,
    document,
    submitted_change_requests,
    current_user_id,
):
    developer_user_ids = get_development_team_user_ids(project_id)

    affected_count = len(
        {change_request.item_id for change_request in submitted_change_requests}
    )

    link = f"/project/{project_id}/requirements/{document.id}"

    title = "Change Requests Need Review"
    message = (
        f"Requirements Document v{document.version} has "
        f"{len(submitted_change_requests)} submitted change request(s) "
        f"affecting {affected_count} requirement(s)."
    )

    notification_count = 0

    for user_id in developer_user_ids:
        if user_id == current_user_id:
            continue

        created = create_notification(
            user_id=user_id,
            project_id=project_id,
            document_id=document.id,
            title=title,
            message=message,
            notification_type="requirements_change_request_submitted",
            link=link,
        )

        if created:
            notification_count += 1

    return notification_count


@change_request_bp.route(
    "/project/<int:project_id>/requirement-documents/<int:document_id>/change-requests",
    methods=["GET"],
)
@require_permission("requirements.view", project_arg="project_id")
def get_requirement_change_requests(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    current_user_id = get_active_user_id()
    template = DocumentTemplate.query.get(document.template_id)

    change_requests = (
        get_visible_change_requests_query(
            project_id=project_id,
            document_id=document.id,
            current_user_id=current_user_id,
        )
        .order_by(RequirementChangeRequest.created_at.desc())
        .all()
    )

    return jsonify({
        "change_requests": [
            build_change_request_payload(change_request, template)
            for change_request in change_requests
        ],
        "summary": get_document_change_request_summary(
            project_id=project_id,
            document_id=document.id,
            current_user_id=current_user_id,
        ),
    }), 200


@change_request_bp.route(
    "/project/<int:project_id>/requirement-documents/<int:document_id>/items/<int:item_id>/change-requests",
    methods=["POST"],
)
@require_permission("requirements.request_change", project_arg="project_id")
def create_requirement_change_request(project_id, document_id, item_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    item = get_requirement_item_or_404(document, item_id)

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

    requested_by_name = (request.form.get("requested_by_name") or "").strip()
    intended_change = (request.form.get("intended_change") or "").strip()
    reason = (request.form.get("reason") or "").strip()
    remarks = (request.form.get("remarks") or "").strip()
    requested_date = parse_requested_date(request.form.get("requested_date"))

    change_type = normalize_choice(
        request.form.get("change_type"),
        CHANGE_TYPES,
        "Modify",
    )

    priority = normalize_choice(
        request.form.get("priority"),
        CHANGE_PRIORITIES,
        "Medium",
    )

    if not requested_by_name:
        return jsonify({"message": "Stakeholder/requester name is required"}), 400

    if not intended_change:
        return jsonify({"message": "Intended change description is required"}), 400

    uploaded_file = request.files.get("signed_change_request_form")

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({"message": "Signed change request form upload is required"}), 400

    try:
        uploaded_file_data = save_signed_change_request_file(uploaded_file)
    except ValueError as error:
        return jsonify({"message": str(error)}), 400

    current_user_id = get_active_user_id()
    template = DocumentTemplate.query.get(document.template_id)
    requirement_summary = build_requirement_item_summary(item, template)

    change_request = RequirementChangeRequest(
        project_id=project_id,
        document_id=document.id,
        item_id=item.id,
        status="Draft",
        requested_by_name=requested_by_name,
        requested_date=requested_date,
        change_type=change_type,
        priority=priority,
        intended_change=intended_change,
        reason=reason,
        remarks=remarks,
        current_requirement_snapshot=json.dumps(requirement_summary),
        stakeholder_form_filename=uploaded_file_data["filename"]
        if uploaded_file_data
        else None,
        stakeholder_form_path=uploaded_file_data["path"]
        if uploaded_file_data
        else None,
        stakeholder_form_mime_type=uploaded_file_data["mime_type"]
        if uploaded_file_data
        else None,
        stakeholder_form_size=uploaded_file_data["size"]
        if uploaded_file_data
        else None,
        created_by=current_user_id,
    )

    try:
        db.session.add(change_request)
        db.session.commit()
    except Exception as error:
        db.session.rollback()
        current_app.logger.exception("Failed to save change request: %s", error)
        return jsonify({"message": "Failed to save change request"}), 500

    return jsonify({
        "message": "Change request saved as draft. Submit all change requests from the document when ready.",
        "change_request": build_change_request_payload(change_request, template),
        "summary": get_document_change_request_summary(
            project_id=project_id,
            document_id=document.id,
            current_user_id=current_user_id,
        ),
    }), 201


@change_request_bp.route(
    "/project/<int:project_id>/requirement-documents/<int:document_id>/change-requests/submit",
    methods=["POST"],
)
@require_permission("requirements.request_change", project_arg="project_id")
def submit_requirement_change_requests(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    current_user_id = get_active_user_id()

    draft_change_requests = (
        RequirementChangeRequest.query
        .filter_by(
            project_id=project_id,
            document_id=document.id,
            status="Draft",
            created_by=current_user_id,
        )
        .order_by(RequirementChangeRequest.created_at.asc())
        .all()
    )

    if not draft_change_requests:
        return jsonify({
            "message": "There are no draft change requests created by you to submit"
        }), 400

    submitted_at = datetime.utcnow()

    affected_count = len(
        {change_request.item_id for change_request in draft_change_requests}
    )

    try:
        for change_request in draft_change_requests:
            change_request.status = "Submitted"
            change_request.submitted_by = current_user_id
            change_request.submitted_at = submitted_at

            if hasattr(change_request, "updated_at"):
                change_request.updated_at = submitted_at

        notification_count = notify_development_team_about_change_requests(
            project_id=project_id,
            document=document,
            submitted_change_requests=draft_change_requests,
            current_user_id=current_user_id,
        )

        db.session.commit()
    except Exception as error:
        db.session.rollback()
        current_app.logger.exception("Failed to submit change requests: %s", error)
        return jsonify({"message": "Failed to submit change requests"}), 500

    template = DocumentTemplate.query.get(document.template_id)

    submitted_payload = [
        build_change_request_payload(change_request, template)
        for change_request in draft_change_requests
    ]

    if notification_count > 0:
        message = "Change requests submitted and development team notified"
    else:
        message = (
            "Change requests submitted, but no development team members were found to notify"
        )

    return jsonify({
        "message": message,
        "submitted_count": len(draft_change_requests),
        "affected_requirement_count": affected_count,
        "notification_count": notification_count,
        "document": build_requirement_document_summary(document),
        "change_requests": submitted_payload,
        "summary": get_document_change_request_summary(
            project_id=project_id,
            document_id=document.id,
            current_user_id=current_user_id,
        ),
    }), 200


@change_request_bp.route(
    "/project/<int:project_id>/requirement-documents/<int:document_id>/change-requests/<int:change_request_id>/file",
    methods=["GET"],
)
@require_permission("requirements.view", project_arg="project_id")
def view_change_request_file(project_id, document_id, change_request_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    change_request = RequirementChangeRequest.query.filter_by(
        id=change_request_id,
        project_id=project_id,
        document_id=document.id,
    ).first()

    if not change_request:
        return jsonify({"message": "Change request not found"}), 404

    if not can_current_user_view_change_request(change_request):
        return jsonify({"message": "You are not allowed to view this file"}), 403

    if not change_request.stakeholder_form_path:
        return jsonify({"message": "No signed change request form uploaded"}), 404

    upload_root = get_upload_directory()
    file_path = os.path.abspath(change_request.stakeholder_form_path)

    if not file_path.startswith(upload_root):
        return jsonify({"message": "Invalid file path"}), 400

    if not os.path.exists(file_path):
        return jsonify({"message": "Uploaded file was not found on the server"}), 404

    return send_file(
        file_path,
        mimetype=change_request.stakeholder_form_mime_type,
        as_attachment=False,
        download_name=change_request.stakeholder_form_filename
        or "change-request-file",
    )


@change_request_bp.route(
    "/project/<int:project_id>/requirement-documents/<int:document_id>/change-requests/<int:change_request_id>",
    methods=["DELETE"],
)
@require_permission("requirements.request_change", project_arg="project_id")
def delete_requirement_change_request(project_id, document_id, change_request_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    change_request = RequirementChangeRequest.query.filter_by(
        id=change_request_id,
        project_id=project_id,
        document_id=document.id,
    ).first()

    if not change_request:
        return jsonify({"message": "Change request not found"}), 404

    if change_request.status != "Draft":
        return jsonify({"message": "Only draft change requests can be deleted"}), 400

    current_user_id = get_active_user_id()

    if change_request.created_by != current_user_id:
        return jsonify({
            "message": "Only the user who logged this change request can delete it"
        }), 403

    try:
        db.session.delete(change_request)
        db.session.commit()
    except Exception as error:
        db.session.rollback()
        current_app.logger.exception("Failed to delete change request: %s", error)
        return jsonify({"message": "Failed to delete change request"}), 500

    return jsonify({
        "message": "Draft change request deleted successfully",
        "summary": get_document_change_request_summary(
            project_id=project_id,
            document_id=document.id,
            current_user_id=current_user_id,
        ),
    }), 200