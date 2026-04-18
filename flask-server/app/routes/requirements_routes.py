from flask import Blueprint, jsonify, request, session
from app.extensions import db
from app.models.project import Project
from app.models.document_templates import DocumentTemplate
from app.models.document_template_field import DocumentTemplateField
from app.models.project_document import ProjectDocument
from app.models.requirement_item import RequirementItem
from app.models.requirement_item_value import RequirementItemValue
from app.utils.permissions import require_permission

requirements_bp = Blueprint("requirements", __name__)

DOCUMENT_STATUSES = {"Draft", "For Approval", "Approved", "Frozen"}

REQUIREMENT_CODE_KEYS = ["requirement_id", "req_id", "requirement_code", "code"]
REQUIREMENT_TITLE_KEYS = ["title", "requirement_title", "requirements_title", "requirement_name"]
REQUIREMENT_DESCRIPTION_KEYS = ["description", "requirement_description"]
REQUIREMENT_RATIONALE_KEYS = ["rationale", "requirement_rationale"]
REQUIREMENT_PRIORITY_KEYS = ["priority", "requirement_priority"]
REQUIREMENT_STATUS_KEYS = ["status", "requirement_status"]


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
@require_permission("requirements.view")
def get_requirement_documents(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    template_ids = get_requirement_template_ids()

    if not template_ids:
        return jsonify({"documents": []}), 200

    documents = (
        ProjectDocument.query
        .filter(
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id.in_(template_ids)
        )
        .order_by(ProjectDocument.created_at.desc())
        .all()
    )

    payload = [build_requirement_document_summary(document) for document in documents]
    payload.sort(key=lambda item: compare_version_tuple(item["version"]), reverse=True)

    return jsonify({"documents": payload}), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents", methods=["POST"])
@require_permission("requirements.create")
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
        created_by=session.get("user_id"),
    )
    db.session.add(document)
    db.session.commit()

    return jsonify({
        "message": "Requirement document created successfully",
        "document": build_requirement_document_summary(document),
        "raw_document": document.to_dict(include_requirement_items=True),
    }), 201


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>", methods=["GET"])
@require_permission("requirements.view")
def get_requirement_document_details(project_id, document_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    document = get_requirement_document_record(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

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
@require_permission("requirements.edit")
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
        document.status = str(status).strip()

    db.session.commit()

    return jsonify({
        "message": "Requirement document updated successfully",
        "document": build_requirement_document_summary(document),
        "raw_document": document.to_dict(include_requirement_items=True),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>", methods=["DELETE"])
@require_permission("requirements.delete")
def delete_requirement_document(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    RequirementItemValue.query.filter(
        RequirementItemValue.item_id.in_(
            db.session.query(RequirementItem.id).filter_by(project_document_id=document.id)
        )
    ).delete(synchronize_session=False)

    RequirementItem.query.filter_by(project_document_id=document.id).delete()
    db.session.delete(document)
    db.session.commit()

    return jsonify({"message": "Requirement document deleted successfully"}), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/submit-approval", methods=["POST"])
@require_permission("requirements.edit")
def submit_requirement_document_for_approval(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if document.status != "Draft":
        return jsonify({"message": "Only draft documents can be submitted for approval"}), 400

    document.status = "For Approval"
    db.session.commit()

    return jsonify({
        "message": "Requirement document submitted for approval",
        "document": build_requirement_document_summary(document),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/approve", methods=["POST"])
@require_permission("requirements.edit")
def approve_requirement_document(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if document.status != "For Approval":
        return jsonify({"message": "Only documents for approval can be approved"}), 400

    document.status = "Approved"
    db.session.commit()

    return jsonify({
        "message": "Requirement document approved successfully",
        "document": build_requirement_document_summary(document),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/freeze", methods=["POST"])
@require_permission("requirements.edit")
def freeze_requirement_document(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if document.status != "Approved":
        return jsonify({"message": "Only approved documents can be frozen"}), 400

    document.status = "Frozen"
    db.session.commit()

    return jsonify({
        "message": "Requirement document frozen successfully",
        "document": build_requirement_document_summary(document),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/approval-summary", methods=["GET"])
@require_permission("requirements.view")
def get_requirement_document_approval_summary(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    return jsonify({
        "summary": {
            "document_id": document.id,
            "version": document.version,
            "status": document.status,
            "submitted": document.status in ["For Approval", "Approved", "Frozen"],
            "approved": document.status in ["Approved", "Frozen"],
            "frozen": document.status == "Frozen",
            "note": "Stakeholder workflow is not yet implemented. This is a placeholder summary."
        }
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/create-version", methods=["POST"])
@require_permission("requirements.edit")
def create_requirement_document_version(project_id, document_id):
    source_document = get_requirement_document_record(project_id, document_id)
    if not source_document:
        return jsonify({"message": "Requirement document not found"}), 404

    if source_document.status != "Frozen":
        return jsonify({"message": "Only frozen documents can create a new version"}), 400

    data = request.get_json() or {}
    change_type = (data.get("change_type") or "minor").strip().lower()

    if change_type not in ["minor", "major"]:
        return jsonify({"message": "change_type must be minor or major"}), 400

    new_document = ProjectDocument(
        project_id=source_document.project_id,
        template_id=source_document.template_id,
        version=compute_next_version(source_document.version, change_type),
        status="Draft",
        created_by=session.get("user_id"),
    )
    db.session.add(new_document)
    db.session.flush()

    document_template = DocumentTemplate.query.get(source_document.template_id)

    for item in source_document.requirement_items:
        new_item = RequirementItem(
            project_document_id=new_document.id,
            sort_order=item.sort_order,
            created_by=session.get("user_id"),
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
@require_permission("requirements.view")
def get_requirement_items(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    template = DocumentTemplate.query.get(document.template_id)

    items = (
        RequirementItem.query
        .filter_by(project_document_id=document.id)
        .order_by(RequirementItem.sort_order.asc(), RequirementItem.created_at.asc())
        .all()
    )

    return jsonify({"items": [build_requirement_item_summary(item, template) for item in items]}), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items", methods=["POST"])
@require_permission("requirements.create")
def create_requirement_item(project_id, document_id):
    document = get_requirement_document_record(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if document.status != "Draft":
        return jsonify({"message": "Requirements can only be added while the document is draft"}), 400

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
        created_by=session.get("user_id"),
    )
    db.session.add(item)
    db.session.flush()

    replace_item_values(item.id, normalized_values)
    db.session.commit()

    return jsonify({
        "message": "Requirement item created successfully",
        "item": build_requirement_item_summary(item, template),
        "raw_item": item.to_dict(include_values=True),
    }), 201


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/<int:item_id>", methods=["GET"])
@require_permission("requirements.view")
def get_requirement_item(project_id, document_id, item_id):
    document = get_requirement_document_record(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

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
@require_permission("requirements.edit")
def update_requirement_item(project_id, document_id, item_id):
    document = get_requirement_document_record(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if document.status != "Draft":
        return jsonify({"message": "Requirements can only be edited while the document is draft"}), 400

    item = RequirementItem.query.filter_by(
        id=item_id,
        project_document_id=document.id
    ).first()

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

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
    db.session.commit()

    return jsonify({
        "message": "Requirement item updated successfully",
        "item": build_requirement_item_summary(item, template),
        "raw_item": item.to_dict(include_values=True),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirement-documents/<int:document_id>/items/<int:item_id>", methods=["DELETE"])
@require_permission("requirements.delete")
def delete_requirement_item(project_id, document_id, item_id):
    document = get_requirement_document_record(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement document not found"}), 404

    if document.status != "Draft":
        return jsonify({"message": "Requirements can only be deleted while the document is draft"}), 400

    item = RequirementItem.query.filter_by(
        id=item_id,
        project_document_id=document.id
    ).first()

    if not item:
        return jsonify({"message": "Requirement item not found"}), 404

    RequirementItemValue.query.filter_by(item_id=item.id).delete()
    db.session.delete(item)
    db.session.commit()

    return jsonify({"message": "Requirement item deleted successfully"}), 200