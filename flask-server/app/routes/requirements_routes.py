import json
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request, session
from app.extensions import db
from app.models.project import Project
from app.models.document_templates import DocumentTemplate
from app.models.document_template_field import DocumentTemplateField
from app.models.project_document import ProjectDocument
from app.models.requirement_item import RequirementItem
from app.models.requirement_item_value import RequirementItemValue
from app.models.notification import Notification
from app.models.requirement_approval import RequirementApproval
from app.models.requirement_comment import RequirementComment
from app.models.requirement_change_log import RequirementChangeLog
from app.models.user_roles import UserRole
from app.utils.permissions import (
    get_current_user_id,
    require_permission,
    user_has_permission,
)

requirements_bp = Blueprint("requirements", __name__)

DOCUMENT_STATUSES = {
    "Draft",
    "For Approval",
    "Approved",
    "Rejected",
    "Frozen",
    "Unfrozen",
}

REQUIREMENT_CODE_KEYS = ["requirement_id", "req_id", "requirement_code", "code"]
REQUIREMENT_TITLE_KEYS = ["title", "requirement_title", "requirements_title", "requirement_name"]
REQUIREMENT_DESCRIPTION_KEYS = ["description", "requirement_description"]
REQUIREMENT_RATIONALE_KEYS = ["rationale", "requirement_rationale"]
REQUIREMENT_PRIORITY_KEYS = ["priority", "requirement_priority"]
REQUIREMENT_STATUS_KEYS = ["status", "requirement_status"]
DEFAULT_REQUIREMENT_REVIEW_DAYS = 3


def parse_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def get_active_user_id():
    token_user_id = get_current_user_id()

    if token_user_id:
        return parse_int(token_user_id)

    return parse_int(session.get("user_id"))


def is_document_visible_to_current_user(document):
    current_user_id = get_active_user_id()

    if document.status == "Draft" and document.created_by != current_user_id:
        return False

    return True


def hidden_draft_response():
    return jsonify({
        "message": "This draft document is only visible to the user who created it"
    }), 403


def get_template_field_maps(template):
    field_by_id = {}
    field_by_key = {}

    if not template:
        return field_by_id, field_by_key

    for section in template.sections:
        for field in section.fields:
            field_by_id[field.id] = field
            field_by_key[field.key] = field

    return field_by_id, field_by_key


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
        return

    db.session.add(Notification(
        user_id=user_id,
        project_id=project_id,
        document_id=document_id,
        title=title,
        message=message,
        type=notification_type,
        link=link,
    ))


def create_project_member_notifications(
    project_id,
    document_id,
    title,
    message,
    notification_type,
    link=None,
    exclude_user_ids=None,
):
    exclude_user_ids = set(exclude_user_ids or [])

    project_members = (
        UserRole.query
        .filter(UserRole.project_id == project_id)
        .all()
    )

    notified_user_ids = set()

    for member in project_members:
        if not member.user_id:
            continue

        if member.user_id in exclude_user_ids:
            continue

        if member.user_id in notified_user_ids:
            continue

        create_notification(
            user_id=member.user_id,
            project_id=project_id,
            document_id=document_id,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link,
        )

        notified_user_ids.add(member.user_id)


def get_user_project_role_label(user_id, project_id):
    if not user_id or not project_id:
        return None

    user_roles = (
        UserRole.query
        .filter(
            UserRole.user_id == user_id,
            UserRole.project_id == project_id,
        )
        .all()
    )

    role_names = []

    for user_role in user_roles:
        role = getattr(user_role, "role", None)

        if isinstance(role, str) and role.strip():
            role_names.append(role.strip())

        if role and not isinstance(role, str):
            for attr_name in ["name", "role_name", "label", "title"]:
                value = getattr(role, attr_name, None)

                if value:
                    role_names.append(str(value).strip())
                    break

        for attr_name in ["role_name", "name", "label", "title"]:
            value = getattr(user_role, attr_name, None)

            if value and isinstance(value, str):
                role_names.append(value.strip())

    unique_role_names = []

    for role_name in role_names:
        if role_name and role_name not in unique_role_names:
            unique_role_names.append(role_name)

    return ", ".join(unique_role_names) if unique_role_names else None


def serialize_requirement_change_log(log):
    data = log.to_dict()
    actor_role = get_user_project_role_label(log.changed_by, log.project_id)

    data["actor_role"] = actor_role

    if data.get("user"):
        data["user"]["project_role"] = actor_role
        data["user"]["role"] = actor_role

    return data


def get_required_requirement_approvers(project_id, document=None):
    submitter_user_id = document.created_by if document else None

    project_members = (
        UserRole.query
        .filter(
            UserRole.project_id == project_id,
            UserRole.user_id.isnot(None),
        )
        .all()
    )

    unique_members = []
    seen_user_ids = set()

    for member in project_members:
        if submitter_user_id and member.user_id == submitter_user_id:
            continue

        if member.user_id in seen_user_ids:
            continue

        unique_members.append(member)
        seen_user_ids.add(member.user_id)

    return unique_members


def get_required_requirement_approver_user_ids(project_id):
    return [
        member.user_id
        for member in get_required_requirement_approvers(project_id)
        if member.user_id
    ]


def parse_review_days(value):
    parsed = parse_int(value)

    if not parsed or parsed < 1:
        return DEFAULT_REQUIREMENT_REVIEW_DAYS

    return parsed


def pick_first_value(values: dict, keys: list[str], default_value: str = ""):
    for key in keys:
        value = values.get(key)

        if value is not None and str(value).strip() != "":
            return str(value).strip()

    return default_value


def normalize_version(version: str):
    return (version or "").replace("v", "").replace("V", "").strip()


def parse_version(version: str):
    clean = normalize_version(version)
    parts = clean.split(".")
    major = 1
    minor = 0

    if len(parts) > 0 and parts[0].isdigit():
        major = int(parts[0])

    if len(parts) > 1 and parts[1].isdigit():
        minor = int(parts[1])

    return major, minor


def compare_version_tuple(version: str):
    major, minor = parse_version(version)
    return major, minor


def compute_next_version(source_version: str, change_type: str):
    major, minor = parse_version(source_version)

    if change_type == "major":
        return f"{major + 1}.0"

    return f"{major}.{minor + 1}"


def get_default_requirements_template():
    return DocumentTemplate.query.filter_by(
        module="requirements",
        is_active=True,
        is_default=True
    ).first()


def get_requirement_template_ids():
    templates = DocumentTemplate.query.filter_by(module="requirements").all()
    return [template.id for template in templates]


def get_requirement_document_record(project_id: int, document_id: int):
    template_ids = get_requirement_template_ids()

    if not template_ids:
        return None

    return (
        ProjectDocument.query
        .filter(
            ProjectDocument.id == document_id,
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id.in_(template_ids)
        )
        .first()
    )


def get_requirement_item_record(project_id, document_id, item_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return None, None

    item = RequirementItem.query.filter_by(
        id=item_id,
        project_document_id=document.id
    ).first()

    return document, item


def build_item_values_by_key(item: RequirementItem, template: DocumentTemplate | None):
    values_by_key = {}

    if not item or not template:
        return values_by_key

    field_by_id, _ = get_template_field_maps(template)

    for value in item.values:
        field = field_by_id.get(value.template_field_id)

        if not field:
            continue

        values_by_key[field.key] = value.value_text or ""

    return values_by_key


def replace_item_values(item_id, values):
    RequirementItemValue.query.filter_by(item_id=item_id).delete()

    for item in values:
        template_field_id = item.get("template_field_id")
        value_text = item.get("value_text", "")

        field = DocumentTemplateField.query.get(template_field_id)

        if not field:
            continue

        db.session.add(RequirementItemValue(
            item_id=item_id,
            template_field_id=template_field_id,
            value_text=str(value_text or ""),
        ))


def normalize_item_payload(values_input, template):
    if isinstance(values_input, list):
        normalized_values = values_input
        keyed_values = {}
        field_by_id, _ = get_template_field_maps(template)

        for item in normalized_values:
            field = field_by_id.get(item.get("template_field_id"))

            if field:
                keyed_values[field.key] = str(item.get("value_text", "") or "")

        return normalized_values, keyed_values

    keyed_values = dict(values_input or {})
    normalized_values = []

    for section in template.sections:
        for field in section.fields:
            normalized_values.append({
                "template_field_id": field.id,
                "value_text": str(keyed_values.get(field.key, field.default_value or "") or ""),
            })

    return normalized_values, keyed_values


def build_requirement_item_summary(item: RequirementItem, template: DocumentTemplate | None):
    summary = build_requirement_item_summary_without_approval(item, template)

    if item and item.document:
        summary["approval_summary"] = build_requirement_approval_summary(
            item.document,
            item,
            template,
        )
    else:
        summary["approval_summary"] = None

    return summary


def build_requirement_document_summary(document: ProjectDocument):
    return {
        "id": document.id,
        "project_id": document.project_id,
        "template_id": document.template_id,
        "version": document.version,
        "name": f"Requirements Document {document.version}",
        "description": "",
        "status": document.status,
        "created_by": document.created_by,
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "updated_at": document.updated_at.isoformat() if document.updated_at else None,
        "requirement_count": len(document.requirement_items or []),
    }


def get_requirement_status_template_field(template):
    if not template:
        return None

    for section in template.sections:
        for field in section.fields:
            if field.key in REQUIREMENT_STATUS_KEYS:
                return field

    return None


def set_requirement_item_status(item, template, status):
    status_field = get_requirement_status_template_field(template)

    if not status_field:
        return

    existing_value = RequirementItemValue.query.filter_by(
        item_id=item.id,
        template_field_id=status_field.id,
    ).first()

    if existing_value:
        existing_value.value_text = status
        return

    db.session.add(RequirementItemValue(
        item_id=item.id,
        template_field_id=status_field.id,
        value_text=status,
    ))


def build_requirement_change_snapshot(item, template):
    keyed_values = build_item_values_by_key(item, template)

    return {
        "summary": build_requirement_item_summary_without_approval(item, template),
        "values": keyed_values,
    }


def create_requirement_change_log(
    project_id,
    document_id,
    item_id,
    action,
    description=None,
    before_snapshot=None,
    after_snapshot=None,
    changed_by="__current_user__",
):
    actor_id = get_active_user_id() if changed_by == "__current_user__" else changed_by

    db.session.add(RequirementChangeLog(
        project_id=project_id,
        document_id=document_id,
        item_id=item_id,
        action=action,
        description=description,
        before_snapshot=json.dumps(before_snapshot) if before_snapshot is not None else None,
        after_snapshot=json.dumps(after_snapshot) if after_snapshot is not None else None,
        changed_by=actor_id,
    ))


def build_requirement_item_summary_without_approval(item: RequirementItem, template: DocumentTemplate | None):
    keyed_values = build_item_values_by_key(item, template)

    requirement_code = pick_first_value(
        keyed_values,
        REQUIREMENT_CODE_KEYS,
        f"REQ-{item.id:03d}"
    )
    title = pick_first_value(keyed_values, REQUIREMENT_TITLE_KEYS, "-")
    description = pick_first_value(keyed_values, REQUIREMENT_DESCRIPTION_KEYS, "")
    rationale = pick_first_value(keyed_values, REQUIREMENT_RATIONALE_KEYS, "")
    priority = pick_first_value(keyed_values, REQUIREMENT_PRIORITY_KEYS, "Medium")
    status = pick_first_value(keyed_values, REQUIREMENT_STATUS_KEYS, "Draft")

    comment_count = RequirementComment.query.filter_by(
        item_id=item.id
    ).count()

    change_log_count = RequirementChangeLog.query.filter_by(
        item_id=item.id
    ).count()

    return {
        "id": item.id,
        "project_document_id": item.project_document_id,
        "requirement_code": requirement_code,
        "title": title,
        "description": description,
        "rationale": rationale,
        "priority": priority,
        "status": status,
        "sort_order": item.sort_order,
        "created_by": item.created_by,
        "comment_count": comment_count,
        "change_log_count": change_log_count,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def get_requirement_approval_records(item_id):
    return (
        RequirementApproval.query
        .filter_by(item_id=item_id)
        .all()
    )


def get_approval_record_for_current_user(item_id):
    current_user_id = get_active_user_id()

    if not current_user_id:
        return None

    return RequirementApproval.query.filter_by(
        item_id=item_id,
        user_id=current_user_id,
    ).first()


def apply_auto_approvals_for_requirement(document, item, template=None):
    now = datetime.utcnow()
    pending_records = (
        RequirementApproval.query
        .filter(
            RequirementApproval.item_id == item.id,
            RequirementApproval.status == "Pending",
            RequirementApproval.review_due_at.isnot(None),
            RequirementApproval.review_due_at <= now,
        )
        .all()
    )

    if not pending_records:
        return False

    for record in pending_records:
        record.status = "Approved"
        record.approved_at = now
        record.auto_approved_at = now
        record.rejected_at = None
        record.rejection_reason = None

        create_requirement_change_log(
            project_id=document.project_id,
            document_id=document.id,
            item_id=item.id,
            action="auto_approved",
            description=f"Requirement was automatically approved for user ID {record.user_id} because the review window expired.",
            changed_by=None,
        )

    update_requirement_item_approval_status(document, item, template, apply_auto=False)
    return True


def build_requirement_approval_summary(document, item, template=None, apply_auto=True):
    if apply_auto:
        apply_auto_approvals_for_requirement(document, item, template)

    current_user_id = get_active_user_id()
    required_members = get_required_requirement_approvers(document.project_id, document)
    required_user_ids = [member.user_id for member in required_members if member.user_id]

    approval_records = []
    if required_user_ids:
        approval_records = (
            RequirementApproval.query
            .filter(
                RequirementApproval.item_id == item.id,
                RequirementApproval.user_id.in_(required_user_ids),
            )
            .all()
        )

    record_by_user_id = {approval.user_id: approval for approval in approval_records}

    approvers = []
    for member in required_members:
        approval = record_by_user_id.get(member.user_id)
        user = member.user

        full_name = "Unknown User"
        email = "-"

        if user:
            first_name = user.first_name or ""
            last_name = user.last_name or ""
            full_name = f"{first_name} {last_name}".strip() or user.email
            email = user.email

        status = approval.status if approval else "Pending"

        approvers.append({
            "user_id": member.user_id,
            "full_name": full_name,
            "email": email,
            "status": status,
            "review_requested_at": approval.review_requested_at.isoformat() if approval and approval.review_requested_at else None,
            "review_due_at": approval.review_due_at.isoformat() if approval and approval.review_due_at else None,
            "approved_at": approval.approved_at.isoformat() if approval and approval.approved_at else None,
            "rejected_at": approval.rejected_at.isoformat() if approval and approval.rejected_at else None,
            "auto_approved_at": approval.auto_approved_at.isoformat() if approval and approval.auto_approved_at else None,
            "rejection_reason": approval.rejection_reason if approval else None,
        })

    approved_count = len([record for record in approval_records if record.status == "Approved"])
    rejected_count = len([record for record in approval_records if record.status == "Rejected"])
    total_required = len(required_user_ids)
    pending_count = max(total_required - approved_count - rejected_count, 0)
    submitted = bool(approval_records)
    has_rejection_votes = rejected_count > 0
    is_decision_complete = bool(submitted and total_required > 0 and pending_count == 0)

    current_user_record = record_by_user_id.get(current_user_id)
    current_user_has_approved = bool(current_user_record and current_user_record.status == "Approved")
    current_user_has_rejected = bool(current_user_record and current_user_record.status == "Rejected")
    current_user_is_required_approver = current_user_id in required_user_ids
    current_user_can_vote = bool(
        document.status == "For Approval"
        and current_user_is_required_approver
        and current_user_record
        and current_user_record.status == "Pending"
    )

    is_rejected = is_decision_complete and has_rejection_votes
    is_fully_approved = is_decision_complete and approved_count >= total_required and not has_rejection_votes

    return {
        "item_id": item.id,
        "document_id": document.id,
        "version": document.version,
        "status": build_requirement_item_summary_without_approval(item, template).get("status"),
        "submitted": submitted,
        "approved": is_fully_approved,
        "rejected": is_rejected,
        "has_rejection_votes": has_rejection_votes,
        "is_decision_complete": is_decision_complete,
        "total_required": total_required,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "pending_count": pending_count,
        "is_fully_approved": is_fully_approved,
        "current_user_is_required_approver": current_user_is_required_approver,
        "current_user_has_approved": current_user_has_approved,
        "current_user_has_rejected": current_user_has_rejected,
        "current_user_can_approve": current_user_can_vote,
        "current_user_can_reject": current_user_can_vote,
        "approvers": approvers,
        "note": (
            "A rejection vote has been recorded. Final requirement status will be decided after all required votes are complete."
            if has_rejection_votes and pending_count > 0
            else "This requirement was rejected after all required votes were completed."
            if is_rejected
            else "All required project members have approved this requirement."
            if is_fully_approved
            else "Waiting for all required project members to approve or reject this requirement."
        ),
    }


def update_requirement_item_approval_status(document, item, template=None, apply_auto=True):
    template = template or DocumentTemplate.query.get(document.template_id)
    summary = build_requirement_approval_summary(document, item, template, apply_auto=apply_auto)

    if summary["submitted"] and summary["pending_count"] > 0:
        set_requirement_item_status(item, template, "For Approval")
    elif summary["rejected"]:
        set_requirement_item_status(item, template, "Rejected")
    elif summary["is_fully_approved"]:
        set_requirement_item_status(item, template, "Approved")
    elif summary["submitted"]:
        set_requirement_item_status(item, template, "For Approval")

    return summary


def recompute_document_approval_status(document, template=None):
    template = template or DocumentTemplate.query.get(document.template_id)
    items = list(document.requirement_items or [])

    if not items:
        return document.status

    item_summaries = []
    for item in items:
        approval_summary = update_requirement_item_approval_status(document, item, template)
        item_summaries.append(approval_summary)

    submitted_summaries = [summary for summary in item_summaries if summary["submitted"]]

    if not submitted_summaries:
        return document.status

    if any(summary["pending_count"] > 0 for summary in submitted_summaries):
        document.status = "For Approval"
    elif any(summary["rejected"] for summary in submitted_summaries):
        document.status = "Rejected"
    elif len(submitted_summaries) == len(items) and all(
        summary["is_fully_approved"] for summary in submitted_summaries
    ):
        document.status = "Approved"
    else:
        document.status = "For Approval"

    return document.status


def ensure_requirement_approval_records(document, items, review_days=None):
    current_user_id = get_active_user_id()
    now = datetime.utcnow()
    review_days = parse_review_days(review_days)
    review_due_at = now + timedelta(days=review_days)
    required_members = get_required_requirement_approvers(document.project_id, document)

    if not required_members:
        return []

    template = DocumentTemplate.query.get(document.template_id)
    created_records = []

    for item in items:
        RequirementApproval.query.filter_by(item_id=item.id).delete(synchronize_session=False)
        set_requirement_item_status(item, template, "For Approval")

        create_requirement_change_log(
            project_id=document.project_id,
            document_id=document.id,
            item_id=item.id,
            action="review_requested",
            description=f"Approval review requested. Voting window: {review_days} day(s).",
            after_snapshot=build_requirement_change_snapshot(item, template),
            changed_by=current_user_id,
        )

        for member in required_members:
            approval = RequirementApproval(
                project_id=document.project_id,
                document_id=document.id,
                item_id=item.id,
                user_id=member.user_id,
                status="Pending",
                review_requested_at=now,
                review_due_at=review_due_at,
                requested_by=current_user_id,
            )
            db.session.add(approval)
            created_records.append(approval)

    document.status = "For Approval"
    return created_records


def build_approval_summary(document):
    template = DocumentTemplate.query.get(document.template_id)
    requirement_summaries = []

    for item in document.requirement_items or []:
        requirement_summaries.append(build_requirement_approval_summary(document, item, template))

    if requirement_summaries:
        recompute_document_approval_status(document, template)

    total_required_votes = sum(summary["total_required"] for summary in requirement_summaries)
    approved_count = sum(summary["approved_count"] for summary in requirement_summaries)
    rejected_count = sum(summary["rejected_count"] for summary in requirement_summaries)
    pending_count = sum(summary["pending_count"] for summary in requirement_summaries)

    current_user_can_approve = any(summary["current_user_can_approve"] for summary in requirement_summaries)
    current_user_can_reject = any(summary["current_user_can_reject"] for summary in requirement_summaries)
    current_user_has_approved = bool(requirement_summaries) and all(
        summary["current_user_has_approved"] or not summary["current_user_is_required_approver"]
        for summary in requirement_summaries
    )
    current_user_has_rejected = any(summary["current_user_has_rejected"] for summary in requirement_summaries)
    is_fully_approved = bool(requirement_summaries) and all(
        summary["is_fully_approved"] for summary in requirement_summaries
    )
    has_rejection_votes = any(summary.get("has_rejection_votes") for summary in requirement_summaries)
    is_rejected = any(summary["rejected"] for summary in requirement_summaries)
    current_user_id = get_active_user_id()

    return {
        "document_id": document.id,
        "version": document.version,
        "status": document.status,
        "submitted": document.status in ["For Approval", "Approved", "Rejected", "Frozen", "Unfrozen"],
        "approved": document.status in ["Approved", "Frozen", "Unfrozen"],
        "rejected": is_rejected or document.status == "Rejected",
        "has_rejection_votes": has_rejection_votes,
        "frozen": document.status == "Frozen",
        "total_required": total_required_votes,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "pending_count": pending_count,
        "is_fully_approved": is_fully_approved,
        "current_user_is_submitter": current_user_id == document.created_by,
        "current_user_is_required_approver": any(
            summary["current_user_is_required_approver"]
            for summary in requirement_summaries
        ),
        "current_user_has_approved": current_user_has_approved,
        "current_user_has_rejected": current_user_has_rejected,
        "current_user_can_approve": current_user_can_approve,
        "current_user_can_reject": current_user_can_reject,
        "requirements": requirement_summaries,
        "approvers": [],
        "note": (
            "One or more rejection votes were recorded. Final document status will be decided after all required votes are complete."
            if has_rejection_votes and pending_count > 0
            else "One or more requirements were rejected after all required votes were completed."
            if is_rejected
            else "All requirements have been approved by all required project members."
            if is_fully_approved
            else "Waiting for project members to approve or reject each requirement."
        ),
    }


def get_requirement_items_for_action(document, item_ids=None):
    query = RequirementItem.query.filter_by(project_document_id=document.id)

    if item_ids:
        query = query.filter(RequirementItem.id.in_(item_ids))

    return query.order_by(RequirementItem.sort_order.asc(), RequirementItem.created_at.asc()).all()


def build_all_requirement_item_summaries(document, template=None):
    template = template or DocumentTemplate.query.get(document.template_id)
    items = get_requirement_items_for_action(document)

    return [
        build_requirement_item_summary(item, template)
        for item in items
    ]


def serialize_requirement_comment(comment):
    current_user_id = get_active_user_id()

    comment_data = comment.to_dict()
    comment_data["can_delete"] = (
        current_user_id == comment.user_id
        or user_has_permission(current_user_id, "requirements.delete", comment.project_id)
    )

    return comment_data


def get_next_requirement_code(project_document_id: int):
    items = (
        RequirementItem.query
        .filter_by(project_document_id=project_document_id)
        .order_by(RequirementItem.id.asc())
        .all()
    )

    max_number = 0

    for item in items:
        code = ""

        for value in item.values:
            field = DocumentTemplateField.query.get(value.template_field_id)

            if field and field.key in REQUIREMENT_CODE_KEYS:
                code = (value.value_text or "").strip()
                break

        if code.startswith("REQ-"):
            suffix = code.replace("REQ-", "")

            if suffix.isdigit():
                max_number = max(max_number, int(suffix))

    return f"REQ-{max_number + 1:03d}"


def get_next_document_version(project_id: int, change_type: str = "major"):
    template_ids = get_requirement_template_ids()

    if not template_ids:
        return "1.0"

    documents = (
        ProjectDocument.query
        .filter(
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id.in_(template_ids)
        )
        .all()
    )

    if not documents:
        return "1.0"

    latest = sorted(
        documents,
        key=lambda doc: compare_version_tuple(doc.version),
        reverse=True
    )[0]

    return compute_next_version(latest.version, change_type)


@requirements_bp.route("/project/<int:project_id>/requirement-documents", methods=["GET"])
@require_permission("requirements.view", project_arg="project_id")
def get_requirement_documents(project_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404

    template_ids = get_requirement_template_ids()

    if not template_ids:
        return jsonify({"documents": []}), 200

    current_user_id = get_active_user_id()

    documents = (
        ProjectDocument.query
        .filter(
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id.in_(template_ids)
        )
        .order_by(ProjectDocument.created_at.desc())
        .all()
    )

    visible_documents = []

    for document in documents:
        if document.status == "Draft" and document.created_by != current_user_id:
            continue

        visible_documents.append(document)

    payload = [
        build_requirement_document_summary(document)
        for document in visible_documents
    ]

    payload.sort(key=lambda item: compare_version_tuple(item["version"]), reverse=True)

    return jsonify({"documents": payload}), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents", methods=["POST"])
@require_permission("requirements.create", project_arg="project_id")
def create_requirement_document(project_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404

    data = request.get_json() or {}

    template_id = data.get("template_id")
    status = (data.get("status") or "Draft").strip()
    version = data.get("version")

    if status not in DOCUMENT_STATUSES:
        status = "Draft"

    if template_id:
        template = DocumentTemplate.query.filter_by(
            id=template_id,
            module="requirements"
        ).first()
    else:
        template = get_default_requirements_template()

    if not template:
        return jsonify({"message": "Requirements template not found"}), 404

    if not version:
        version = get_next_document_version(project_id, "major")

    document = ProjectDocument(
        project_id=project_id,
        template_id=template.id,
        version=version,
        status=status,
        created_by=get_active_user_id(),
    )

    db.session.add(document)
    db.session.commit()

    return jsonify({
        "message": "Requirement document created successfully",
        "document": build_requirement_document_summary(document),
        "raw_document": document.to_dict(include_requirement_items=True),
    }), 201


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>", methods=["GET"])
@require_permission("requirements.view", project_arg="project_id")
def get_requirement_document_details(project_id, document_id):
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404

    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    document_template = DocumentTemplate.query.get(document.template_id)
    latest_default_template = get_default_requirements_template()

    requirements = [
        build_requirement_item_summary(item, document_template)
        for item in (document.requirement_items or [])
    ]

    if document.status == "For Approval":
        recompute_document_approval_status(document, document_template)
        db.session.commit()

    return jsonify({
        "document_summary": build_requirement_document_summary(document),
        "document": document.to_dict(include_requirement_items=True),
        "template": document_template.to_dict(include_sections=True) if document_template else None,
        "latest_default_template": (
            latest_default_template.to_dict(include_sections=True)
            if latest_default_template else None
        ),
        "has_template_update": bool(
            latest_default_template and document_template
            and latest_default_template.id != document_template.id
        ),
        "is_template_inactive": bool(document_template and not document_template.is_active),
        "requirements": requirements,
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>", methods=["PUT"])
@require_permission("requirements.edit", project_arg="project_id")
def update_requirement_document(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    data = request.get_json() or {}

    template_id = data.get("template_id")
    version = data.get("version")
    status = data.get("status")

    if template_id:
        template = DocumentTemplate.query.filter_by(
            id=template_id,
            module="requirements"
        ).first()

        if not template:
            return jsonify({"message": "Template not found"}), 404

        document.template_id = template.id

    if version:
        document.version = str(version).strip()

    if status:
        status = str(status).strip()

        if status not in DOCUMENT_STATUSES:
            return jsonify({"message": "Invalid document status"}), 400

        document.status = status

    db.session.commit()

    return jsonify({
        "message": "Requirement document updated successfully",
        "document": build_requirement_document_summary(document),
        "raw_document": document.to_dict(include_requirement_items=True),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>", methods=["DELETE"])
@require_permission("requirements.delete", project_arg="project_id")
def delete_requirement_document(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    Notification.query.filter_by(
        document_id=document.id
    ).delete(synchronize_session=False)

    RequirementApproval.query.filter_by(
        document_id=document.id
    ).delete(synchronize_session=False)

    RequirementComment.query.filter_by(
        document_id=document.id
    ).delete(synchronize_session=False)

    RequirementItemValue.query.filter(
        RequirementItemValue.item_id.in_(
            db.session.query(RequirementItem.id).filter_by(
                project_document_id=document.id
            )
        )
    ).delete(synchronize_session=False)

    RequirementItem.query.filter_by(
        project_document_id=document.id
    ).delete(synchronize_session=False)

    db.session.delete(document)
    db.session.commit()

    return jsonify({"message": "Requirement document deleted successfully"}), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/submit-approval", methods=["POST"])
@require_permission("requirements.submit_approval", project_arg="project_id")
def submit_requirement_document_for_approval(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if document.created_by != get_active_user_id():
        return jsonify({
            "message": "Only the user who created this document can submit it for approval"
        }), 403

    if document.status not in ["Draft", "Rejected"]:
        return jsonify({
            "message": "Only draft or rejected documents can be submitted for approval"
        }), 400

    data = request.get_json(silent=True) or {}
    item_ids = data.get("item_ids") or []
    review_days = parse_review_days(data.get("review_days"))

    if item_ids and not isinstance(item_ids, list):
        return jsonify({"message": "item_ids must be a list"}), 400

    item_ids = [parse_int(item_id) for item_id in item_ids]
    item_ids = [item_id for item_id in item_ids if item_id]

    requested_items = get_requirement_items_for_action(document, item_ids)

    if item_ids and len(requested_items) != len(set(item_ids)):
        return jsonify({"message": "One or more selected requirements were not found"}), 404

    template = DocumentTemplate.query.get(document.template_id)

    if document.status == "Rejected":
        items = [
            item
            for item in requested_items
            if build_requirement_item_summary_without_approval(item, template).get("status") == "Rejected"
        ]

        if not items:
            return jsonify({
                "message": "Only rejected requirements can be resubmitted. Approved requirements will remain approved."
            }), 400
    else:
        items = requested_items

    if not items:
        return jsonify({"message": "Add at least one requirement before requesting approval"}), 400

    is_resubmission = document.status == "Rejected"

    created_records = ensure_requirement_approval_records(
        document=document,
        items=items,
        review_days=review_days,
    )

    if not created_records:
        return jsonify({"message": "No project members are available to approve these requirements"}), 400

    link = (
        f"/stakeholder/projects/requirements-document"
        f"?id={document_id}&projectId={project_id}"
    )

    notification_scope = "rejected requirement(s)" if is_resubmission else "requirement(s)"

    create_project_member_notifications(
        project_id=project_id,
        document_id=document_id,
        title="Requirement Approval Needed",
        message=(
            f"{len(items)} {notification_scope} in Requirements Document v{document.version} "
            f"are waiting for your approval within {review_days} day(s)."
        ),
        notification_type="requirement_approval_request",
        link=link,
        exclude_user_ids=[get_active_user_id()],
    )

    db.session.commit()

    return jsonify({
        "message": (
            "Rejected requirement(s) resubmitted for approval"
            if is_resubmission
            else "All requirements submitted for approval"
        ),
        "document": build_requirement_document_summary(document),
        "approval_summary": build_approval_summary(document),
        "requirements": build_all_requirement_item_summaries(document, template),
        "changed_requirement_ids": [item.id for item in items],
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/request-approval", methods=["POST"])
@require_permission("requirements.submit_approval", project_arg="project_id")
def request_requirement_items_for_approval(project_id, document_id):
    return submit_requirement_document_for_approval(project_id, document_id)


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/approve", methods=["POST"])
@require_permission("requirements.view", project_arg="project_id")
def approve_requirement_document(project_id, document_id):
    current_user_id = get_active_user_id()

    if not current_user_id:
        return jsonify({"message": "Authentication required"}), 401

    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if document.status != "For Approval":
        return jsonify({
            "message": "Only requirements for approval can be approved"
        }), 400

    if document.created_by == current_user_id:
        return jsonify({
            "message": "The user who submitted this document does not need to approve their own requirements"
        }), 403

    data = request.get_json(silent=True) or {}
    item_ids = data.get("item_ids") or []

    if item_ids and not isinstance(item_ids, list):
        return jsonify({"message": "item_ids must be a list"}), 400

    item_ids = [parse_int(item_id) for item_id in item_ids]
    item_ids = [item_id for item_id in item_ids if item_id]

    candidate_items = get_requirement_items_for_action(document, item_ids)

    if item_ids and len(candidate_items) != len(set(item_ids)):
        return jsonify({"message": "One or more selected requirements were not found"}), 404

    if not candidate_items:
        return jsonify({"message": "No requirements selected for approval"}), 400

    template = DocumentTemplate.query.get(document.template_id)
    approved_items = []
    now = datetime.utcnow()

    for item in candidate_items:
        approval = RequirementApproval.query.filter_by(
            item_id=item.id,
            user_id=current_user_id,
        ).first()

        if not approval or approval.status != "Pending":
            continue

        approval.status = "Approved"
        approval.approved_at = now
        approval.rejected_at = None
        approval.rejection_reason = None

        create_requirement_change_log(
            project_id=project_id,
            document_id=document.id,
            item_id=item.id,
            action="approved",
            description="Requirement approved by project member.",
            after_snapshot=build_requirement_change_snapshot(item, template),
            changed_by=current_user_id,
        )

        update_requirement_item_approval_status(document, item, template)
        approved_items.append(item)

    if not approved_items:
        return jsonify({
            "message": "You have no pending approval vote for the selected requirement(s)",
            "document": build_requirement_document_summary(document),
            "approval_summary": build_approval_summary(document),
        }), 400

    recompute_document_approval_status(document, template)

    if document.status == "Approved" and document.created_by:
        link = (
            f"/stakeholder/projects/requirements-document"
            f"?id={document_id}&projectId={project_id}"
        )

        create_notification(
            user_id=document.created_by,
            project_id=project_id,
            document_id=document_id,
            title="Requirements Document Approved",
            message=f"All requirements in Requirements Document v{document.version} have been approved.",
            notification_type="requirements_approved",
            link=link,
        )

    db.session.commit()

    return jsonify({
        "message": f"Approved {len(approved_items)} requirement(s)",
        "document": build_requirement_document_summary(document),
        "approval_summary": build_approval_summary(document),
        "requirements": build_all_requirement_item_summaries(document, template),
        "changed_requirement_ids": [item.id for item in approved_items],
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/approve", methods=["POST"])
@require_permission("requirements.view", project_arg="project_id")
def approve_requirement_items(project_id, document_id):
    return approve_requirement_document(project_id, document_id)


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/reject", methods=["POST"])
@require_permission("requirements.view", project_arg="project_id")
def reject_requirement_document(project_id, document_id):
    current_user_id = get_active_user_id()

    if not current_user_id:
        return jsonify({"message": "Authentication required"}), 401

    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if document.status != "For Approval":
        return jsonify({
            "message": "Only requirements for approval can be rejected"
        }), 400

    if document.created_by == current_user_id:
        return jsonify({
            "message": "The user who submitted this document does not need to reject their own requirements"
        }), 403

    data = request.get_json() or {}
    item_ids = data.get("item_ids") or []
    rejection_reason = (data.get("reason") or "").strip()

    if item_ids and not isinstance(item_ids, list):
        return jsonify({"message": "item_ids must be a list"}), 400

    item_ids = [parse_int(item_id) for item_id in item_ids]
    item_ids = [item_id for item_id in item_ids if item_id]

    candidate_items = get_requirement_items_for_action(document, item_ids)

    if item_ids and len(candidate_items) != len(set(item_ids)):
        return jsonify({"message": "One or more selected requirements were not found"}), 404

    if not candidate_items:
        return jsonify({"message": "No requirements selected for rejection"}), 400

    template = DocumentTemplate.query.get(document.template_id)
    rejected_items = []
    now = datetime.utcnow()

    for item in candidate_items:
        approval = RequirementApproval.query.filter_by(
            item_id=item.id,
            user_id=current_user_id,
        ).first()

        if not approval or approval.status != "Pending":
            continue

        approval.status = "Rejected"
        approval.rejection_reason = rejection_reason or None
        approval.rejected_at = now
        approval.approved_at = None
        approval.auto_approved_at = None

        create_requirement_change_log(
            project_id=project_id,
            document_id=document.id,
            item_id=item.id,
            action="rejected",
            description=rejection_reason or "Requirement rejected by project member.",
            after_snapshot=build_requirement_change_snapshot(item, template),
            changed_by=current_user_id,
        )

        update_requirement_item_approval_status(document, item, template)
        rejected_items.append(item)

    if not rejected_items:
        return jsonify({
            "message": "You have no pending rejection vote for the selected requirement(s)",
            "document": build_requirement_document_summary(document),
            "approval_summary": build_approval_summary(document),
        }), 400

    recompute_document_approval_status(document, template)

    link = (
        f"/stakeholder/projects/requirements-document"
        f"?id={document_id}&projectId={project_id}"
    )

    if document.created_by:
        create_notification(
            user_id=document.created_by,
            project_id=project_id,
            document_id=document_id,
            title="Requirement Rejected",
            message=f"{len(rejected_items)} requirement(s) in Requirements Document v{document.version} were rejected and need revision.",
            notification_type="requirements_rejected",
            link=link,
        )

    db.session.commit()

    return jsonify({
        "message": f"Rejected {len(rejected_items)} requirement(s)",
        "document": build_requirement_document_summary(document),
        "approval_summary": build_approval_summary(document),
        "requirements": build_all_requirement_item_summaries(document, template),
        "changed_requirement_ids": [item.id for item in rejected_items],
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/reject", methods=["POST"])
@require_permission("requirements.view", project_arg="project_id")
def reject_requirement_items(project_id, document_id):
    return reject_requirement_document(project_id, document_id)


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/freeze", methods=["POST"])
@require_permission("requirements.freeze", project_arg="project_id")
def freeze_requirement_document(project_id, document_id):
    current_user_id = get_active_user_id()

    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if document.created_by != current_user_id:
        return jsonify({
            "message": "Only the user who created this document can freeze it"
        }), 403

    if document.status != "Approved":
        return jsonify({"message": "Only approved documents can be frozen"}), 400

    document.status = "Frozen"

    link = (
        f"/stakeholder/projects/requirements-document"
        f"?id={document_id}&projectId={project_id}"
    )

    create_project_member_notifications(
        project_id=project_id,
        document_id=document_id,
        title="Requirements Document Frozen",
        message=f"Requirements Document v{document.version} has been frozen and is now the baseline.",
        notification_type="requirements_frozen",
        link=link,
        exclude_user_ids=[current_user_id],
    )

    db.session.commit()

    return jsonify({
        "message": "Requirement document frozen successfully",
        "document": build_requirement_document_summary(document),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/unfreeze", methods=["POST"])
@require_permission("requirements.freeze", project_arg="project_id")
def unfreeze_requirement_document(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if document.status != "Frozen":
        return jsonify({"message": "Only frozen documents can be unfrozen"}), 400

    document.status = "Unfrozen"
    db.session.commit()

    return jsonify({
        "message": "Requirement document unfrozen successfully",
        "document": build_requirement_document_summary(document),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/approval-summary", methods=["GET"])
@require_permission("requirements.view", project_arg="project_id")
def get_requirement_document_approval_summary(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    summary = build_approval_summary(document)
    db.session.commit()

    return jsonify({
        "summary": summary
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/<int:item_id>/approval-summary", methods=["GET"])
@require_permission("requirements.view", project_arg="project_id")
def get_requirement_item_approval_summary(project_id, document_id, item_id):
    document, item = get_requirement_item_record(project_id, document_id, item_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

    template = DocumentTemplate.query.get(document.template_id)
    summary = build_requirement_approval_summary(document, item, template)
    recompute_document_approval_status(document, template)
    db.session.commit()

    return jsonify({"summary": summary}), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/<int:item_id>/change-logs", methods=["GET"])
@require_permission("requirements.view", project_arg="project_id")
def get_requirement_item_change_logs(project_id, document_id, item_id):
    document, item = get_requirement_item_record(project_id, document_id, item_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

    logs = (
        RequirementChangeLog.query
        .filter_by(item_id=item.id)
        .order_by(RequirementChangeLog.created_at.desc())
        .all()
    )

    return jsonify({
        "logs": [serialize_requirement_change_log(log) for log in logs]
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/create-version", methods=["POST"])
@require_permission("requirements.edit", project_arg="project_id")
def create_requirement_document_version(project_id, document_id):
    source_document = get_requirement_document_record(project_id, document_id)

    if not source_document:
        return jsonify({"message": "Requirement document not found"}), 404

    if source_document.status != "Unfrozen":
        return jsonify({"message": "Only unfrozen documents can create a new version"}), 400

    data = request.get_json() or {}
    change_type = (data.get("change_type") or "minor").strip().lower()

    if change_type not in ["minor", "major"]:
        return jsonify({"message": "change_type must be minor or major"}), 400

    new_document = ProjectDocument(
        project_id=source_document.project_id,
        template_id=source_document.template_id,
        version=compute_next_version(source_document.version, change_type),
        status="Draft",
        created_by=get_active_user_id(),
    )

    db.session.add(new_document)
    db.session.flush()

    for item in source_document.requirement_items:
        new_item = RequirementItem(
            project_document_id=new_document.id,
            sort_order=item.sort_order,
            created_by=get_active_user_id(),
        )

        db.session.add(new_item)
        db.session.flush()

        for value in item.values:
            db.session.add(RequirementItemValue(
                item_id=new_item.id,
                template_field_id=value.template_field_id,
                value_text=value.value_text,
            ))

    db.session.commit()

    return jsonify({
        "message": f"New requirement document version {new_document.version} created successfully",
        "document": build_requirement_document_summary(new_document),
        "raw_document": new_document.to_dict(include_requirement_items=True),
    }), 201


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items", methods=["GET"])
@require_permission("requirements.view", project_arg="project_id")
def get_requirement_items(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    template = DocumentTemplate.query.get(document.template_id)

    items = (
        RequirementItem.query
        .filter_by(project_document_id=document.id)
        .order_by(RequirementItem.sort_order.asc(), RequirementItem.created_at.asc())
        .all()
    )

    return jsonify({
        "items": [
            build_requirement_item_summary(item, template)
            for item in items
        ]
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items", methods=["POST"])
@require_permission("requirements.create", project_arg="project_id")
def create_requirement_item(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    if document.status not in ["Draft", "Rejected"]:
        return jsonify({
            "message": "Requirements can only be added while the document is draft or rejected"
        }), 400

    template = DocumentTemplate.query.get(document.template_id)

    if not template:
        return jsonify({"message": "Requirements template not found"}), 404

    data = request.get_json() or {}
    values_input = data.get("values") or {}

    normalized_values, keyed_values = normalize_item_payload(values_input, template)

    title = pick_first_value(keyed_values, REQUIREMENT_TITLE_KEYS, "")

    if not title:
        return jsonify({"message": "Requirement title is required"}), 400

    requirement_code = pick_first_value(
        keyed_values,
        REQUIREMENT_CODE_KEYS,
        get_next_requirement_code(document.id)
    )

    priority = pick_first_value(keyed_values, REQUIREMENT_PRIORITY_KEYS, "Medium")
    status = pick_first_value(keyed_values, REQUIREMENT_STATUS_KEYS, "Draft")
    description = pick_first_value(keyed_values, REQUIREMENT_DESCRIPTION_KEYS, "")
    rationale = pick_first_value(keyed_values, REQUIREMENT_RATIONALE_KEYS, "")

    keyed_values.setdefault("requirement_code", requirement_code)
    keyed_values.setdefault("requirement_id", requirement_code)
    keyed_values.setdefault("title", title)
    keyed_values.setdefault("requirement_title", title)
    keyed_values.setdefault("priority", priority)
    keyed_values.setdefault("requirement_priority", priority)
    keyed_values.setdefault("status", status)
    keyed_values.setdefault("requirement_status", status)
    keyed_values.setdefault("description", description)
    keyed_values.setdefault("requirement_description", description)
    keyed_values.setdefault("rationale", rationale)
    keyed_values.setdefault("requirement_rationale", rationale)

    normalized_values = []

    for section in template.sections:
        for field in section.fields:
            normalized_values.append({
                "template_field_id": field.id,
                "value_text": str(keyed_values.get(field.key, field.default_value or "") or ""),
            })

    last_item = (
        RequirementItem.query
        .filter_by(project_document_id=document.id)
        .order_by(RequirementItem.sort_order.desc())
        .first()
    )

    sort_order = (last_item.sort_order + 1) if last_item else 1

    item = RequirementItem(
        project_document_id=document.id,
        sort_order=sort_order,
        created_by=get_active_user_id(),
    )

    db.session.add(item)
    db.session.flush()

    replace_item_values(item.id, normalized_values)
    db.session.flush()
    db.session.expire(item, ["values"])

    create_requirement_change_log(
        project_id=project_id,
        document_id=document.id,
        item_id=item.id,
        action="created",
        description="Requirement item created.",
        after_snapshot=build_requirement_change_snapshot(item, template),
    )

    db.session.commit()

    return jsonify({
        "message": "Requirement item created successfully",
        "item": build_requirement_item_summary(item, template),
        "raw_item": item.to_dict(include_values=True),
    }), 201


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/<int:item_id>", methods=["GET"])
@require_permission("requirements.view", project_arg="project_id")
def get_requirement_item(project_id, document_id, item_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    item = RequirementItem.query.filter_by(
        id=item_id,
        project_document_id=document.id
    ).first()

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

    template = DocumentTemplate.query.get(document.template_id)

    return jsonify({
        "item": item.to_dict(include_values=True),
        "summary": build_requirement_item_summary(item, template),
        "template": template.to_dict(include_sections=True) if template else None,
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/<int:item_id>", methods=["PUT"])
@require_permission("requirements.edit", project_arg="project_id")
def update_requirement_item(project_id, document_id, item_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    if document.status not in ["Draft", "Rejected"]:
        return jsonify({
            "message": "Requirements can only be edited while the document is draft or rejected"
        }), 400

    item = RequirementItem.query.filter_by(
        id=item_id,
        project_document_id=document.id
    ).first()

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

    template = DocumentTemplate.query.get(document.template_id)

    if not template:
        return jsonify({"message": "Requirements template not found"}), 404

    before_snapshot = build_requirement_change_snapshot(item, template)

    data = request.get_json() or {}
    values_input = data.get("values") or {}

    normalized_values, keyed_values = normalize_item_payload(values_input, template)

    title = pick_first_value(keyed_values, REQUIREMENT_TITLE_KEYS, "")

    if not title:
        return jsonify({"message": "Requirement title is required"}), 400

    requirement_code = pick_first_value(
        keyed_values,
        REQUIREMENT_CODE_KEYS,
        build_requirement_item_summary(item, template)["requirement_code"]
    )

    priority = pick_first_value(keyed_values, REQUIREMENT_PRIORITY_KEYS, "Medium")
    status = pick_first_value(keyed_values, REQUIREMENT_STATUS_KEYS, "Draft")
    description = pick_first_value(keyed_values, REQUIREMENT_DESCRIPTION_KEYS, "")
    rationale = pick_first_value(keyed_values, REQUIREMENT_RATIONALE_KEYS, "")

    keyed_values.setdefault("requirement_code", requirement_code)
    keyed_values.setdefault("requirement_id", requirement_code)
    keyed_values.setdefault("title", title)
    keyed_values.setdefault("requirement_title", title)
    keyed_values.setdefault("priority", priority)
    keyed_values.setdefault("requirement_priority", priority)
    keyed_values.setdefault("status", status)
    keyed_values.setdefault("requirement_status", status)
    keyed_values.setdefault("description", description)
    keyed_values.setdefault("requirement_description", description)
    keyed_values.setdefault("rationale", rationale)
    keyed_values.setdefault("requirement_rationale", rationale)

    normalized_values = []

    for section in template.sections:
        for field in section.fields:
            normalized_values.append({
                "template_field_id": field.id,
                "value_text": str(keyed_values.get(field.key, field.default_value or "") or ""),
            })

    replace_item_values(item.id, normalized_values)
    RequirementApproval.query.filter_by(item_id=item.id).delete(synchronize_session=False)
    db.session.flush()
    db.session.expire(item, ["values"])

    create_requirement_change_log(
        project_id=project_id,
        document_id=document.id,
        item_id=item.id,
        action="updated",
        description="Requirement item updated. Existing approval votes were cleared.",
        before_snapshot=before_snapshot,
        after_snapshot=build_requirement_change_snapshot(item, template),
    )

    if document.status in ["For Approval", "Approved"]:
        document.status = "Draft"

    db.session.commit()

    return jsonify({
        "message": "Requirement item updated successfully",
        "item": build_requirement_item_summary(item, template),
        "raw_item": item.to_dict(include_values=True),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/<int:item_id>", methods=["DELETE"])
@require_permission("requirements.delete", project_arg="project_id")
def delete_requirement_item(project_id, document_id, item_id):
    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    if document.status not in ["Draft", "Rejected"]:
        return jsonify({
            "message": "Requirements can only be deleted while the document is draft or rejected"
        }), 400

    item = RequirementItem.query.filter_by(
        id=item_id,
        project_document_id=document.id
    ).first()

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

    template = DocumentTemplate.query.get(document.template_id)
    before_snapshot = build_requirement_change_snapshot(item, template)

    create_requirement_change_log(
        project_id=project_id,
        document_id=document.id,
        item_id=item.id,
        action="deleted",
        description="Requirement item deleted.",
        before_snapshot=before_snapshot,
    )

    RequirementApproval.query.filter_by(item_id=item.id).delete(synchronize_session=False)
    RequirementComment.query.filter_by(item_id=item.id).delete(synchronize_session=False)
    RequirementItemValue.query.filter_by(item_id=item.id).delete()
    db.session.delete(item)
    db.session.commit()

    return jsonify({"message": "Requirement item deleted successfully"}), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/<int:item_id>/comments", methods=["GET"])
@require_permission("requirements.view", project_arg="project_id")
def get_requirement_comments(project_id, document_id, item_id):
    document, item = get_requirement_item_record(project_id, document_id, item_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

    comments = (
        RequirementComment.query
        .filter_by(
            project_id=project_id,
            document_id=document_id,
            item_id=item_id,
        )
        .order_by(RequirementComment.created_at.asc(), RequirementComment.id.asc())
        .all()
    )

    return jsonify({
        "comments": [
            serialize_requirement_comment(comment)
            for comment in comments
        ]
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/<int:item_id>/comments", methods=["POST"])
@require_permission("requirements.view", project_arg="project_id")
def create_requirement_comment(project_id, document_id, item_id):
    current_user_id = get_active_user_id()

    if not current_user_id:
        return jsonify({"message": "Authentication required"}), 401

    document, item = get_requirement_item_record(project_id, document_id, item_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

    data = request.get_json() or {}
    comment_text = (data.get("comment_text") or "").strip()

    if not comment_text:
        return jsonify({"message": "Comment cannot be empty"}), 400

    comment = RequirementComment(
        project_id=project_id,
        document_id=document_id,
        item_id=item_id,
        user_id=current_user_id,
        comment_text=comment_text,
    )

    db.session.add(comment)
    db.session.commit()

    return jsonify({
        "message": "Comment added successfully",
        "comment": serialize_requirement_comment(comment),
    }), 201


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/<int:item_id>/comments/<int:comment_id>", methods=["DELETE"])
@require_permission("requirements.view", project_arg="project_id")
def delete_requirement_comment(project_id, document_id, item_id, comment_id):
    current_user_id = get_active_user_id()

    if not current_user_id:
        return jsonify({"message": "Authentication required"}), 401

    document, item = get_requirement_item_record(project_id, document_id, item_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if not is_document_visible_to_current_user(document):
        return hidden_draft_response()

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

    comment = RequirementComment.query.filter_by(
        id=comment_id,
        project_id=project_id,
        document_id=document_id,
        item_id=item_id,
    ).first()

    if not comment:
        return jsonify({"message": "Comment not found"}), 404

    can_delete = (
        comment.user_id == current_user_id
        or user_has_permission(current_user_id, "requirements.delete", project_id)
    )

    if not can_delete:
        return jsonify({
            "message": "You don't have permission to delete this comment"
        }), 403

    db.session.delete(comment)
    db.session.commit()

    return jsonify({"message": "Comment deleted successfully"}), 200
