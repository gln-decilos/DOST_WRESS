from datetime import datetime

from flask import Blueprint, jsonify, request, session
from app.extensions import db
from app.models.project import Project
from app.models.document_templates import DocumentTemplate
from app.models.document_template_field import DocumentTemplateField
from app.models.project_document import ProjectDocument
from app.models.requirement_item import RequirementItem
from app.models.requirement_item_value import RequirementItemValue
from app.models.project_stakeholder import ProjectStakeholder
from app.models.notification import Notification
from app.models.requirement_approval import RequirementApproval
from app.models.requirement_comment import RequirementComment
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


def get_required_requirement_approvers(project_id, document=None):
    current_user_id = get_active_user_id()
    submitter_id = document.created_by if document else current_user_id

    return (
        UserRole.query
        .filter(
            UserRole.project_id == project_id,
            UserRole.user_id.isnot(None),
            UserRole.user_id != submitter_id,
        )
        .all()
    )


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
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


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


def build_approval_summary(document):
    current_user_id = get_active_user_id()

    required_members = get_required_requirement_approvers(
        project_id=document.project_id,
        document=document
    )

    required_user_ids = [
        member.user_id
        for member in required_members
        if member.user_id
    ]

    approval_records = []

    if required_user_ids:
        approval_records = (
            RequirementApproval.query
            .filter(
                RequirementApproval.document_id == document.id,
                RequirementApproval.user_id.in_(required_user_ids)
            )
            .all()
        )

    record_by_user_id = {
        approval.user_id: approval
        for approval in approval_records
    }

    approved_records = [
        approval
        for approval in approval_records
        if approval.status == "Approved"
    ]

    rejected_records = [
        approval
        for approval in approval_records
        if approval.status == "Rejected"
    ]

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

        status = "Pending"

        if approval:
            status = approval.status

        approvers.append({
            "user_id": member.user_id,
            "full_name": full_name,
            "email": email,
            "status": status,
            "approved_at": (
                approval.approved_at.isoformat()
                if approval and approval.approved_at else None
            ),
            "rejected_at": (
                approval.rejected_at.isoformat()
                if approval and approval.rejected_at else None
            ),
            "rejection_reason": approval.rejection_reason if approval else None,
        })

    approved_count = len(approved_records)
    rejected_count = len(rejected_records)
    total_required = len(required_user_ids)
    pending_count = max(total_required - approved_count - rejected_count, 0)

    current_user_record = record_by_user_id.get(current_user_id)

    current_user_has_approved = bool(
        current_user_record and current_user_record.status == "Approved"
    )

    current_user_has_rejected = bool(
        current_user_record and current_user_record.status == "Rejected"
    )

    current_user_is_submitter = current_user_id == document.created_by
    current_user_is_required_approver = current_user_id in required_user_ids

    is_rejected = rejected_count > 0 or document.status == "Rejected"
    is_fully_approved = (
        total_required > 0
        and approved_count >= total_required
        and rejected_count == 0
    )

    return {
        "document_id": document.id,
        "version": document.version,
        "status": document.status,
        "submitted": document.status in ["For Approval", "Approved", "Rejected", "Frozen", "Unfrozen"],
        "approved": document.status in ["Approved", "Frozen", "Unfrozen"],
        "rejected": is_rejected,
        "frozen": document.status == "Frozen",
        "total_required": total_required,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "pending_count": pending_count,
        "is_fully_approved": is_fully_approved,
        "current_user_is_submitter": current_user_is_submitter,
        "current_user_is_required_approver": current_user_is_required_approver,
        "current_user_has_approved": current_user_has_approved,
        "current_user_has_rejected": current_user_has_rejected,
        "current_user_can_approve": (
            document.status == "For Approval"
            and current_user_is_required_approver
            and not current_user_has_approved
            and not current_user_has_rejected
        ),
        "current_user_can_reject": (
            document.status == "For Approval"
            and current_user_is_required_approver
            and not current_user_has_approved
            and not current_user_has_rejected
        ),
        "approvers": approvers,
        "note": (
            "This document was rejected and needs revision."
            if is_rejected
            else "All required project members have approved this document."
            if is_fully_approved
            else "Waiting for all required project members to approve this document."
        ),
    }


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

    documents_query = (
        ProjectDocument.query
        .filter(
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id.in_(template_ids)
        )
    )

    documents = documents_query.order_by(ProjectDocument.created_at.desc()).all()

    visible_documents = []

    for document in documents:
        if document.status == "Draft" and document.created_by != current_user_id:
            continue

        visible_documents.append(document)

    payload = [build_requirement_document_summary(document) for document in visible_documents]
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

    current_user_id = get_active_user_id()

    if document.status == "Draft" and document.created_by != current_user_id:
        return jsonify({
            "message": "This draft document is only visible to the user who created it"
        }), 403

    document_template = DocumentTemplate.query.get(document.template_id)
    latest_default_template = get_default_requirements_template()

    requirements = [
        build_requirement_item_summary(item, document_template)
        for item in (document.requirement_items or [])
    ]

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

    document.status = "For Approval"

    RequirementApproval.query.filter_by(
        document_id=document.id
    ).delete(synchronize_session=False)

    link = (
        f"/stakeholder/projects/requirements-document"
        f"?id={document_id}&projectId={project_id}"
    )

    create_project_member_notifications(
        project_id=project_id,
        document_id=document_id,
        title="Requirements Approval Needed",
        message=f"Requirements Document v{document.version} is waiting for your approval.",
        notification_type="requirements_approval_request",
        link=link,
        exclude_user_ids=[get_active_user_id()],
    )

    db.session.commit()

    return jsonify({
        "message": "Requirement document submitted for approval",
        "document": build_requirement_document_summary(document),
        "approval_summary": build_approval_summary(document),
    }), 200


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
            "message": "Only documents for approval can be approved"
        }), 400

    if document.created_by == current_user_id:
        return jsonify({
            "message": "The submitter cannot approve their own requirement document"
        }), 403

    required_approvers = get_required_requirement_approvers(
        project_id=project_id,
        document=document
    )

    required_user_ids = {
        member.user_id
        for member in required_approvers
        if member.user_id
    }

    if current_user_id not in required_user_ids:
        return jsonify({
            "message": "You are not assigned as an approver for this requirement document"
        }), 403

    existing_action = RequirementApproval.query.filter_by(
        document_id=document.id,
        user_id=current_user_id,
    ).first()

    if existing_action:
        return jsonify({
            "message": "You already responded to this requirement document",
            "document": build_requirement_document_summary(document),
            "approval_summary": build_approval_summary(document),
        }), 200

    approval = RequirementApproval(
        project_id=project_id,
        document_id=document.id,
        user_id=current_user_id,
        status="Approved",
        approved_at=datetime.utcnow(),
    )

    db.session.add(approval)
    db.session.flush()

    approval_summary = build_approval_summary(document)

    if approval_summary["is_fully_approved"]:
        document.status = "Approved"

        if document.created_by:
            link = (
                f"/stakeholder/projects/requirements-document"
                f"?id={document_id}&projectId={project_id}"
            )

            create_notification(
                user_id=document.created_by,
                project_id=project_id,
                document_id=document_id,
                title="Requirements Document Approved",
                message=f"Requirements Document v{document.version} has been approved.",
                notification_type="requirements_approved",
                link=link,
            )

    db.session.commit()

    return jsonify({
        "message": "Requirement document approved successfully",
        "document": build_requirement_document_summary(document),
        "approval_summary": build_approval_summary(document),
    }), 200


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
            "message": "Only documents for approval can be rejected"
        }), 400

    if document.created_by == current_user_id:
        return jsonify({
            "message": "The submitter cannot reject their own requirement document"
        }), 403

    required_approvers = get_required_requirement_approvers(
        project_id=project_id,
        document=document
    )

    required_user_ids = {
        member.user_id
        for member in required_approvers
        if member.user_id
    }

    if current_user_id not in required_user_ids:
        return jsonify({
            "message": "You are not assigned as an approver for this requirement document"
        }), 403

    existing_action = RequirementApproval.query.filter_by(
        document_id=document.id,
        user_id=current_user_id,
    ).first()

    if existing_action:
        return jsonify({
            "message": "You already responded to this requirement document",
            "document": build_requirement_document_summary(document),
            "approval_summary": build_approval_summary(document),
        }), 200

    data = request.get_json() or {}
    rejection_reason = (data.get("reason") or "").strip()

    rejection = RequirementApproval(
        project_id=project_id,
        document_id=document.id,
        user_id=current_user_id,
        status="Rejected",
        rejection_reason=rejection_reason or None,
        rejected_at=datetime.utcnow(),
    )

    db.session.add(rejection)

    document.status = "Rejected"

    link = (
        f"/stakeholder/projects/requirements-document"
        f"?id={document_id}&projectId={project_id}"
    )

    if document.created_by:
        create_notification(
            user_id=document.created_by,
            project_id=project_id,
            document_id=document_id,
            title="Requirements Document Rejected",
            message=f"Requirements Document v{document.version} was rejected and needs revision.",
            notification_type="requirements_rejected",
            link=link,
        )

    db.session.commit()

    return jsonify({
        "message": "Requirement document rejected",
        "document": build_requirement_document_summary(document),
        "approval_summary": build_approval_summary(document),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/freeze", methods=["POST"])
@require_permission("requirements.freeze", project_arg="project_id")
def freeze_requirement_document(project_id, document_id):
    current_user_id = get_active_user_id()

    document = get_requirement_document_record(project_id, document_id)

    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

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

    if document.created_by and document.created_by != current_user_id:
        create_notification(
            user_id=document.created_by,
            project_id=project_id,
            document_id=document_id,
            title="Requirements Document Frozen",
            message=f"Requirements Document v{document.version} has been frozen and is now the baseline.",
            notification_type="requirements_frozen",
            link=link,
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

    return jsonify({
        "summary": build_approval_summary(document)
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