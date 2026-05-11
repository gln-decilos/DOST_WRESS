import json
import os
import uuid
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request, send_file
from sqlalchemy import and_, or_
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.document_templates import DocumentTemplate
from app.models.notification import Notification
from app.models.requirement_change_request import RequirementChangeRequest
from app.models.requirement_item import RequirementItem
from app.models.user_roles import UserRole
from app.routes.requirements_routes import (
    build_requirement_document_summary,
    build_requirement_item_summary,
    get_active_user_id,
    get_requirement_document_record,
    hidden_draft_response,
    is_document_visible_to_current_user,
)
from app.utils.permissions import require_permission, user_has_permission

change_request_bp = Blueprint("change_requests", __name__)

CHANGE_REQUEST_STATUSES = {
    "Draft",
    "Impact Analysis Requested",
    "Stakeholder Review",
    "Proceed",
    "Declined",
    # Backward compatibility for records created by the previous workflow.
    "Submitted",
}
ACTIVE_CHANGE_REQUEST_STATUSES = {
    "Draft",
    "Impact Analysis Requested",
    "Stakeholder Review",
    "Submitted",
}
IMPACT_ANALYSIS_REQUESTED_STATUSES = {"Impact Analysis Requested", "Submitted"}
STAKEHOLDER_REVIEW_STATUSES = {"Stakeholder Review"}
FINAL_CHANGE_REQUEST_STATUSES = {"Proceed", "Declined"}
CHANGE_TYPES = {"Modify", "Add", "Remove", "Clarify", "Other"}
CHANGE_PRIORITIES = {"Low", "Medium", "High", "Critical"}
ALLOWED_UPLOAD_EXTENSIONS = {"pdf", "doc", "docx", "png", "jpg", "jpeg"}
DEFAULT_STAKEHOLDER_REVIEW_DAYS = 3
REQUEST_CHANGE_PERMISSION = "requirements.request_change"
REVIEW_CHANGE_REQUEST_PERMISSION = "requirements.review_change_request"
DECIDE_CHANGE_REQUEST_PERMISSION = "requirements.decide_change_request"


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


def parse_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_review_days(value):
    parsed = parse_int(value)

    if not parsed or parsed < 1:
        return DEFAULT_STAKEHOLDER_REVIEW_DAYS

    return parsed


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


def user_has_change_request_access(user_id, project_id):
    if not user_id:
        return False

    return (
        user_has_permission(user_id, REQUEST_CHANGE_PERMISSION, project_id)
        or user_has_permission(user_id, REVIEW_CHANGE_REQUEST_PERMISSION, project_id)
        or user_has_permission(user_id, DECIDE_CHANGE_REQUEST_PERMISSION, project_id)
    )


def current_user_can_access_change_requests(project_id):
    return user_has_change_request_access(get_active_user_id(), project_id)


def can_user_view_change_request(change_request, user_id=None):
    user_id = user_id or get_active_user_id()

    if not user_id:
        return False

    if change_request.status == "Draft":
        return change_request.created_by == user_id

    if change_request.status in IMPACT_ANALYSIS_REQUESTED_STATUSES:
        return bool(
            change_request.created_by == user_id
            or user_has_permission(
                user_id,
                REVIEW_CHANGE_REQUEST_PERMISSION,
                change_request.project_id,
            )
        )

    if change_request.status in STAKEHOLDER_REVIEW_STATUSES.union(
        FINAL_CHANGE_REQUEST_STATUSES
    ):
        return bool(
            change_request.created_by == user_id
            or user_has_permission(
                user_id,
                REVIEW_CHANGE_REQUEST_PERMISSION,
                change_request.project_id,
            )
            or user_has_permission(
                user_id,
                DECIDE_CHANGE_REQUEST_PERMISSION,
                change_request.project_id,
            )
        )

    return False


def can_current_user_view_change_request(change_request):
    return can_user_view_change_request(change_request)


def get_visible_change_requests_query(project_id, document_id, current_user_id):
    return RequirementChangeRequest.query.filter(
        RequirementChangeRequest.project_id == project_id,
        RequirementChangeRequest.document_id == document_id,
        or_(
            RequirementChangeRequest.status != "Draft",
            and_(
                RequirementChangeRequest.status == "Draft",
                RequirementChangeRequest.created_by == current_user_id,
            ),
        ),
    )


def get_user_display(member):
    user = getattr(member, "user", None)

    if not user:
        return "Unknown User", "-"

    first_name = user.first_name or ""
    last_name = user.last_name or ""
    full_name = f"{first_name} {last_name}".strip() or user.email or "Unknown User"
    email = user.email or "-"

    return full_name, email


def get_project_members_with_permission(project_id, permission_key, exclude_user_ids=None):
    exclude_user_ids = set(exclude_user_ids or [])

    project_members = (
        UserRole.query
        .filter(
            UserRole.project_id == project_id,
            UserRole.user_id.isnot(None),
        )
        .all()
    )

    members = []
    seen_user_ids = set()

    for member in project_members:
        if member.user_id in exclude_user_ids:
            continue

        if member.user_id in seen_user_ids:
            continue

        if not user_has_permission(member.user_id, permission_key, project_id):
            continue

        full_name, email = get_user_display(member)
        members.append({
            "user_id": member.user_id,
            "full_name": full_name,
            "email": email,
        })
        seen_user_ids.add(member.user_id)

    return members


def get_change_request_reviewers(project_id, exclude_user_ids=None):
    return get_project_members_with_permission(
        project_id=project_id,
        permission_key=REVIEW_CHANGE_REQUEST_PERMISSION,
        exclude_user_ids=exclude_user_ids,
    )


def get_stakeholder_decision_reviewers(project_id, exclude_user_ids=None):
    return get_project_members_with_permission(
        project_id=project_id,
        permission_key=DECIDE_CHANGE_REQUEST_PERMISSION,
        exclude_user_ids=exclude_user_ids,
    )


def get_change_request_active_statuses():
    return list(ACTIVE_CHANGE_REQUEST_STATUSES)


def requirement_has_active_change_request(project_id, document_id, item_id):
    return (
        RequirementChangeRequest.query
        .filter(
            RequirementChangeRequest.project_id == project_id,
            RequirementChangeRequest.document_id == document_id,
            RequirementChangeRequest.item_id == item_id,
            RequirementChangeRequest.status.in_(get_change_request_active_statuses()),
        )
        .first()
    )


def build_initial_stakeholder_decisions(reviewers):
    return [
        {
            "user_id": reviewer["user_id"],
            "full_name": reviewer.get("full_name") or "Unknown User",
            "email": reviewer.get("email") or "-",
            "status": "Pending",
            "decided_at": None,
            "note": None,
        }
        for reviewer in reviewers
    ]


def get_stakeholder_decisions(change_request):
    if hasattr(change_request, "get_review_decisions"):
        return change_request.get_review_decisions()

    raw_value = getattr(change_request, "review_decisions_json", None)
    if not raw_value:
        return []

    try:
        decisions = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return []

    return decisions if isinstance(decisions, list) else []


def set_stakeholder_decisions(change_request, decisions):
    if hasattr(change_request, "set_review_decisions"):
        change_request.set_review_decisions(decisions)
        return

    change_request.review_decisions_json = json.dumps(decisions or [])


def get_current_user_stakeholder_decision(change_request, current_user_id):
    if not current_user_id:
        return None

    for decision in get_stakeholder_decisions(change_request):
        if decision.get("user_id") == current_user_id:
            return decision

    return None


def build_stakeholder_decision_summary(change_request, current_user_id=None):
    decisions = get_stakeholder_decisions(change_request)
    total_required = len(decisions)
    proceed_count = sum(1 for decision in decisions if decision.get("status") == "Proceed")
    declined_count = sum(1 for decision in decisions if decision.get("status") == "Declined")
    pending_count = sum(1 for decision in decisions if decision.get("status") == "Pending")
    current_user_decision = get_current_user_stakeholder_decision(
        change_request,
        current_user_id,
    )

    is_decision_complete = bool(
        change_request.status in FINAL_CHANGE_REQUEST_STATUSES
        or (total_required > 0 and pending_count == 0)
    )

    if change_request.status in FINAL_CHANGE_REQUEST_STATUSES:
        final_status = change_request.status
    elif is_decision_complete and declined_count > 0:
        final_status = "Declined"
    elif is_decision_complete:
        final_status = "Proceed"
    else:
        final_status = None

    return {
        "total_required": total_required,
        "proceed_count": proceed_count,
        "declined_count": declined_count,
        "pending_count": pending_count,
        "is_decision_complete": is_decision_complete,
        "final_status": final_status,
        "current_user_status": current_user_decision.get("status") if current_user_decision else None,
        "current_user_can_decide": bool(
            change_request.status == "Stakeholder Review"
            and current_user_decision
            and current_user_decision.get("status") == "Pending"
        ),
    }


def finalize_change_request_if_complete(change_request):
    summary = build_stakeholder_decision_summary(change_request)

    if change_request.status != "Stakeholder Review":
        return False

    if summary["total_required"] == 0 or summary["pending_count"] > 0:
        return False

    change_request.status = "Declined" if summary["declined_count"] > 0 else "Proceed"
    change_request.decided_at = datetime.utcnow()
    return True


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
    decision_summary = build_stakeholder_decision_summary(
        change_request,
        current_user_id,
    )

    payload["can_delete"] = (
        change_request.status == "Draft"
        and change_request.created_by == current_user_id
    )
    payload["can_view_file"] = can_current_user_view_change_request(change_request)
    current_user_can_request_change = bool(
        current_user_id
        and user_has_permission(
            current_user_id,
            REQUEST_CHANGE_PERMISSION,
            change_request.project_id,
        )
    )
    current_user_can_review_change_request = bool(
        current_user_id
        and user_has_permission(
            current_user_id,
            REVIEW_CHANGE_REQUEST_PERMISSION,
            change_request.project_id,
        )
    )
    current_user_can_decide_change_request = bool(
        current_user_id
        and user_has_permission(
            current_user_id,
            DECIDE_CHANGE_REQUEST_PERMISSION,
            change_request.project_id,
        )
    )

    payload["can_review_change_request"] = bool(
        change_request.status in IMPACT_ANALYSIS_REQUESTED_STATUSES
        and current_user_can_review_change_request
    )
    payload["can_upload_impact_analysis"] = bool(
        change_request.status in IMPACT_ANALYSIS_REQUESTED_STATUSES
        and change_request.created_by == current_user_id
        and current_user_can_request_change
    )
    payload["can_decide"] = bool(
        decision_summary["current_user_can_decide"]
        and current_user_can_decide_change_request
    )
    payload["is_active"] = change_request.status in ACTIVE_CHANGE_REQUEST_STATUSES
    payload["stakeholder_decision_summary"] = decision_summary
    # Backward-compatible field name for existing frontend consumers.
    payload["review_summary"] = decision_summary

    return payload


def get_document_change_request_summary(project_id, document_id, current_user_id):
    candidate_change_requests = (
        get_visible_change_requests_query(
            project_id=project_id,
            document_id=document_id,
            current_user_id=current_user_id,
        )
        .all()
    )

    visible_change_requests = [
        change_request
        for change_request in candidate_change_requests
        if can_user_view_change_request(change_request, current_user_id)
    ]

    draft_count = sum(1 for item in visible_change_requests if item.status == "Draft")
    impact_analysis_requested_count = sum(
        1 for item in visible_change_requests
        if item.status in IMPACT_ANALYSIS_REQUESTED_STATUSES
    )
    stakeholder_review_count = sum(
        1 for item in visible_change_requests if item.status == "Stakeholder Review"
    )
    proceed_count = sum(1 for item in visible_change_requests if item.status == "Proceed")
    declined_count = sum(
        1 for item in visible_change_requests if item.status == "Declined"
    )

    return {
        "total_count": len(visible_change_requests),
        "draft_count": draft_count,
        "submitted_count": impact_analysis_requested_count,
        "impact_analysis_requested_count": impact_analysis_requested_count,
        "stakeholder_review_count": stakeholder_review_count,
        "proceed_count": proceed_count,
        "declined_count": declined_count,
    }


def save_uploaded_change_request_file(uploaded_file, label):
    if not uploaded_file or not uploaded_file.filename:
        return None

    if not allowed_upload_file(uploaded_file.filename):
        raise ValueError(
            f"{label} must be PDF, DOC, DOCX, PNG, JPG, or JPEG"
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


def notify_change_request_requester_about_decision(
    project_id,
    document,
    change_request,
    decision,
):
    if not change_request.created_by:
        return False

    link = (
        f"/stakeholder/projects/requirements-document"
        f"?id={document.id}&projectId={project_id}"
    )

    if decision == "Proceed":
        title = "Change Request Approved to Proceed"
        message = (
            f"Your change request for Requirements Document v{document.version} "
            f"has been approved to proceed after stakeholder review of the impact analysis."
        )
    else:
        title = "Change Request Declined"
        message = (
            f"Your change request for Requirements Document v{document.version} "
            f"has been declined after stakeholder review of the impact analysis."
        )

    return create_notification(
        user_id=change_request.created_by,
        project_id=project_id,
        document_id=document.id,
        title=title,
        message=message,
        notification_type="requirements_change_request_decision",
        link=link,
    )


def notify_reviewers_about_change_request_review(
    project_id,
    document,
    submitted_change_requests,
    reviewer_user_ids,
    current_user_id,
):
    affected_count = len(
        {change_request.item_id for change_request in submitted_change_requests}
    )

    link = (
        f"/stakeholder/projects/requirements-document"
        f"?id={document.id}&projectId={project_id}"
    )

    title = "Change Request Ready for Review"
    message = (
        f"Requirements Document v{document.version} has "
        f"{len(submitted_change_requests)} submitted change request(s) "
        f"for {affected_count} requirement(s). Review the logged request before the external impact analysis meeting. "
        f"The requester/BA will upload the final impact analysis result after the meeting."
    )

    notification_count = 0

    for user_id in reviewer_user_ids:
        if user_id == current_user_id:
            continue

        created = create_notification(
            user_id=user_id,
            project_id=project_id,
            document_id=document.id,
            title=title,
            message=message,
            notification_type="requirements_change_request_impact_analysis_needed",
            link=link,
        )

        if created:
            notification_count += 1

    return notification_count


def notify_stakeholders_about_impact_analysis(
    project_id,
    document,
    change_request,
    stakeholder_user_ids,
    current_user_id,
):
    link = (
        f"/stakeholder/projects/requirements-document"
        f"?id={document.id}&projectId={project_id}"
    )

    title = "Impact Analysis Ready for Decision"
    message = (
        f"Impact analysis for a change request in Requirements Document v{document.version} "
        f"has been uploaded. Review the impact analysis and decide whether the change request should proceed or be declined."
    )

    notification_count = 0

    for user_id in stakeholder_user_ids:
        if user_id == current_user_id:
            continue

        created = create_notification(
            user_id=user_id,
            project_id=project_id,
            document_id=document.id,
            title=title,
            message=message,
            notification_type="requirements_change_request_impact_analysis_uploaded",
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

    if not current_user_can_access_change_requests(project_id):
        return jsonify({
            "message": "You don't have permission to view requirement change requests"
        }), 403

    template = DocumentTemplate.query.get(document.template_id)

    candidate_change_requests = (
        get_visible_change_requests_query(
            project_id=project_id,
            document_id=document.id,
            current_user_id=current_user_id,
        )
        .order_by(RequirementChangeRequest.created_at.desc())
        .all()
    )

    visible_change_requests = [
        change_request
        for change_request in candidate_change_requests
        if can_user_view_change_request(change_request, current_user_id)
    ]

    return jsonify({
        "change_requests": [
            build_change_request_payload(change_request, template)
            for change_request in visible_change_requests
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
@require_permission(REQUEST_CHANGE_PERMISSION, project_arg="project_id")
def create_requirement_change_request(project_id, document_id, item_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    item = get_requirement_item_or_404(document, item_id)

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

    existing_active_request = requirement_has_active_change_request(
        project_id=project_id,
        document_id=document.id,
        item_id=item.id,
    )

    if existing_active_request:
        return jsonify({
            "message": "This requirement already has an active change request. Wait until the current change request is completed before creating another one."
        }), 400

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
        uploaded_file_data = save_uploaded_change_request_file(
            uploaded_file,
            "Signed change request form",
        )
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
        stakeholder_form_filename=uploaded_file_data["filename"] if uploaded_file_data else None,
        stakeholder_form_path=uploaded_file_data["path"] if uploaded_file_data else None,
        stakeholder_form_mime_type=uploaded_file_data["mime_type"] if uploaded_file_data else None,
        stakeholder_form_size=uploaded_file_data["size"] if uploaded_file_data else None,
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
        "message": "Change request saved as draft. Submit it when ready to notify users with change request review permission.",
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
@require_permission(REQUEST_CHANGE_PERMISSION, project_arg="project_id")
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

    review_members = get_change_request_reviewers(
        project_id,
        exclude_user_ids=[current_user_id],
    )

    if not review_members:
        return jsonify({
            "message": "No project members with permission to review change requests were found for impact analysis notification"
        }), 400

    submitted_at = datetime.utcnow()
    reviewer_user_ids = [member["user_id"] for member in review_members]

    affected_count = len(
        {change_request.item_id for change_request in draft_change_requests}
    )

    try:
        for change_request in draft_change_requests:
            change_request.status = "Impact Analysis Requested"
            change_request.submitted_by = current_user_id
            change_request.submitted_at = submitted_at
            change_request.review_days = None
            change_request.review_due_at = None
            change_request.decided_at = None
            set_stakeholder_decisions(change_request, [])

            if hasattr(change_request, "updated_at"):
                change_request.updated_at = submitted_at

        notification_count = notify_reviewers_about_change_request_review(
            project_id=project_id,
            document=document,
            submitted_change_requests=draft_change_requests,
            reviewer_user_ids=reviewer_user_ids,
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

    return jsonify({
        "message": "Change requests submitted for impact analysis review",
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
    "/project/<int:project_id>/requirement-documents/<int:document_id>/change-requests/<int:change_request_id>/impact-analysis",
    methods=["POST"],
)
@require_permission(REQUEST_CHANGE_PERMISSION, project_arg="project_id")
def upload_change_request_impact_analysis(project_id, document_id, change_request_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    current_user_id = get_active_user_id()

    change_request = RequirementChangeRequest.query.filter_by(
        id=change_request_id,
        project_id=project_id,
        document_id=document.id,
    ).first()

    if not change_request:
        return jsonify({"message": "Change request not found"}), 404

    if change_request.created_by != current_user_id:
        return jsonify({
            "message": "Only the requester/BA who logged this change request can upload the impact analysis result"
        }), 403

    if not user_has_permission(
        current_user_id,
        REQUEST_CHANGE_PERMISSION,
        project_id,
    ):
        return jsonify({
            "message": "You don't have permission to upload impact analysis results for change requests"
        }), 403

    if change_request.status not in IMPACT_ANALYSIS_REQUESTED_STATUSES:
        return jsonify({
            "message": "Impact analysis can only be uploaded after the change request has been submitted for impact analysis review"
        }), 400

    uploaded_file = request.files.get("impact_analysis_file")

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({"message": "Impact analysis result file is required"}), 400

    review_days = parse_review_days(request.form.get("review_days"))
    impact_analysis_notes = (request.form.get("impact_analysis_notes") or "").strip()

    try:
        uploaded_file_data = save_uploaded_change_request_file(
            uploaded_file,
            "Impact analysis result",
        )
    except ValueError as error:
        return jsonify({"message": str(error)}), 400

    stakeholder_reviewers = get_stakeholder_decision_reviewers(
        project_id,
        exclude_user_ids=[current_user_id],
    )

    if not stakeholder_reviewers:
        return jsonify({
            "message": "No stakeholders with permission to decide change requests were found for this project"
        }), 400

    uploaded_at = datetime.utcnow()
    review_due_at = uploaded_at + timedelta(days=review_days)
    stakeholder_user_ids = [reviewer["user_id"] for reviewer in stakeholder_reviewers]

    try:
        change_request.status = "Stakeholder Review"
        change_request.impact_analysis_filename = uploaded_file_data["filename"] if uploaded_file_data else None
        change_request.impact_analysis_path = uploaded_file_data["path"] if uploaded_file_data else None
        change_request.impact_analysis_mime_type = uploaded_file_data["mime_type"] if uploaded_file_data else None
        change_request.impact_analysis_size = uploaded_file_data["size"] if uploaded_file_data else None
        change_request.impact_analysis_uploaded_by = current_user_id
        change_request.impact_analysis_uploaded_at = uploaded_at
        change_request.impact_analysis_notes = impact_analysis_notes or None
        change_request.review_days = review_days
        change_request.review_due_at = review_due_at
        change_request.decided_at = None
        set_stakeholder_decisions(
            change_request,
            build_initial_stakeholder_decisions(stakeholder_reviewers),
        )

        if hasattr(change_request, "updated_at"):
            change_request.updated_at = uploaded_at

        notification_count = notify_stakeholders_about_impact_analysis(
            project_id=project_id,
            document=document,
            change_request=change_request,
            stakeholder_user_ids=stakeholder_user_ids,
            current_user_id=current_user_id,
        )

        db.session.commit()
    except Exception as error:
        db.session.rollback()
        current_app.logger.exception("Failed to upload impact analysis: %s", error)
        return jsonify({"message": "Failed to upload impact analysis result"}), 500

    template = DocumentTemplate.query.get(document.template_id)

    return jsonify({
        "message": "Impact analysis uploaded and sent to stakeholders for decision",
        "notification_count": notification_count,
        "review_days": review_days,
        "review_due_at": review_due_at.isoformat(),
        "change_request": build_change_request_payload(change_request, template),
        "summary": get_document_change_request_summary(
            project_id=project_id,
            document_id=document.id,
            current_user_id=current_user_id,
        ),
    }), 200


@change_request_bp.route(
    "/project/<int:project_id>/requirement-documents/<int:document_id>/change-requests/<int:change_request_id>/decision",
    methods=["POST"],
)
@require_permission(DECIDE_CHANGE_REQUEST_PERMISSION, project_arg="project_id")
def decide_requirement_change_request(project_id, document_id, change_request_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    current_user_id = get_active_user_id()

    change_request = RequirementChangeRequest.query.filter_by(
        id=change_request_id,
        project_id=project_id,
        document_id=document.id,
    ).first()

    if not change_request:
        return jsonify({"message": "Change request not found"}), 404

    if change_request.status != "Stakeholder Review":
        return jsonify({
            "message": "Stakeholders can decide only after the impact analysis has been uploaded"
        }), 400

    decisions = get_stakeholder_decisions(change_request)
    stakeholder_decision = None

    for decision_record in decisions:
        if decision_record.get("user_id") == current_user_id:
            stakeholder_decision = decision_record
            break

    if not stakeholder_decision:
        return jsonify({
            "message": "You are not assigned as a stakeholder reviewer for this change request"
        }), 403

    if stakeholder_decision.get("status") != "Pending":
        return jsonify({
            "message": "You have already submitted your decision for this change request"
        }), 400

    data = request.get_json(silent=True) or {}
    decision = (data.get("decision") or "").strip()
    decision_note = (data.get("note") or "").strip()

    if decision.lower() in {"proceed", "approved", "approve", "accepted", "accept"}:
        decision = "Proceed"
    elif decision.lower() in {"decline", "declined", "rejected", "reject"}:
        decision = "Declined"
    else:
        return jsonify({"message": "Decision must be Proceed or Declined"}), 400

    if decision == "Declined" and not decision_note:
        return jsonify({
            "message": "A reason is required when a change request is marked as Declined"
        }), 400

    decided_at = datetime.utcnow()
    stakeholder_decision["status"] = decision
    stakeholder_decision["decided_at"] = decided_at.isoformat()
    stakeholder_decision["note"] = decision_note or None
    set_stakeholder_decisions(change_request, decisions)

    existing_remarks = (change_request.remarks or "").strip()
    decision_line = (
        f"Stakeholder decision: {decision} by user ID {current_user_id} "
        f"on {decided_at.isoformat()} UTC."
    )

    if decision_note:
        decision_line = f"{decision_line} Note: {decision_note}"

    change_request.remarks = (
        f"{existing_remarks}\n\n{decision_line}"
        if existing_remarks
        else decision_line
    )

    finalized = finalize_change_request_if_complete(change_request)
    final_status = change_request.status if finalized else None

    if hasattr(change_request, "updated_at"):
        change_request.updated_at = decided_at

    try:
        if finalized:
            notify_change_request_requester_about_decision(
                project_id=project_id,
                document=document,
                change_request=change_request,
                decision=final_status,
            )

        db.session.commit()
    except Exception as error:
        db.session.rollback()
        current_app.logger.exception("Failed to decide change request: %s", error)
        return jsonify({"message": "Failed to update change request decision"}), 500

    template = DocumentTemplate.query.get(document.template_id)
    summary = build_stakeholder_decision_summary(change_request, current_user_id)

    if finalized:
        message = (
            "Stakeholder decision completed. Final decision: Proceed. Requester notified."
            if final_status == "Proceed"
            else "Stakeholder decision completed. Final decision: Declined. Requester notified."
        )
    else:
        message = (
            f"Your {decision} decision was recorded. "
            f"Waiting for {summary['pending_count']} stakeholder(s)."
        )

    return jsonify({
        "message": message,
        "change_request": build_change_request_payload(change_request, template),
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
        download_name=change_request.stakeholder_form_filename or "change-request-file",
    )


@change_request_bp.route(
    "/project/<int:project_id>/requirement-documents/<int:document_id>/change-requests/<int:change_request_id>/impact-analysis-file",
    methods=["GET"],
)
@require_permission("requirements.view", project_arg="project_id")
def view_impact_analysis_file(project_id, document_id, change_request_id):
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
        return jsonify({"message": "You are not allowed to view this impact analysis"}), 403

    if not change_request.impact_analysis_path:
        return jsonify({"message": "No impact analysis result uploaded"}), 404

    upload_root = get_upload_directory()
    file_path = os.path.abspath(change_request.impact_analysis_path)

    if not file_path.startswith(upload_root):
        return jsonify({"message": "Invalid file path"}), 400

    if not os.path.exists(file_path):
        return jsonify({"message": "Uploaded file was not found on the server"}), 404

    return send_file(
        file_path,
        mimetype=change_request.impact_analysis_mime_type,
        as_attachment=False,
        download_name=change_request.impact_analysis_filename or "impact-analysis-result",
    )


@change_request_bp.route(
    "/project/<int:project_id>/requirement-documents/<int:document_id>/change-requests/<int:change_request_id>",
    methods=["DELETE"],
)
@require_permission(REQUEST_CHANGE_PERMISSION, project_arg="project_id")
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
