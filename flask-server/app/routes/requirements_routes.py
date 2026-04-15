from flask import Blueprint, jsonify, request, session
from app.extensions import db
from app.models.project import Project
from app.models.document_templates import DocumentTemplate
from app.models.document_template_field import DocumentTemplateField
from app.models.project_document import ProjectDocument
from app.models.project_document_value import ProjectDocumentValue
from app.utils.permissions import require_permission

requirements_bp = Blueprint("requirements", __name__)

VERSION_PREFIX = "REQ-SPEC-"


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


def build_document_values_by_key(document, template):
    values_by_key = {}

    if not document or not template:
        return values_by_key

    field_by_id, _ = get_template_field_maps(template)

    for value in document.values:
        field = field_by_id.get(value.template_field_id)
        if not field:
            continue
        values_by_key[field.key] = value.value_text or ""

    return values_by_key


def build_template_values_payload_from_document(source_document, source_template, target_template):
    source_values_by_key = build_document_values_by_key(source_document, source_template)

    transferred_values = []
    unmatched_old_fields = []
    new_empty_fields = []

    target_keys = set()

    for section in target_template.sections:
        for field in section.fields:
            target_keys.add(field.key)

            if field.key in source_values_by_key:
                transferred_values.append({
                    "template_field_id": field.id,
                    "value_text": source_values_by_key[field.key],
                    "field_key": field.key,
                    "field_label": field.label,
                    "is_transferred": True,
                })
            else:
                transferred_values.append({
                    "template_field_id": field.id,
                    "value_text": field.default_value or "",
                    "field_key": field.key,
                    "field_label": field.label,
                    "is_transferred": False,
                })
                new_empty_fields.append({
                    "field_key": field.key,
                    "field_label": field.label,
                })

    for old_key in source_values_by_key.keys():
        if old_key not in target_keys:
            unmatched_old_fields.append(old_key)

    transferred_count = sum(1 for item in transferred_values if item["is_transferred"])

    return {
        "values": transferred_values,
        "transferred_count": transferred_count,
        "unmatched_old_fields": unmatched_old_fields,
        "new_empty_fields": new_empty_fields,
    }


def replace_requirement_values(document_id, values):
    ProjectDocumentValue.query.filter_by(document_id=document_id).delete()

    for item in values:
        template_field_id = item.get("template_field_id")
        value_text = item.get("value_text", "")

        field = DocumentTemplateField.query.get(template_field_id)
        if not field:
            continue

        db.session.add(ProjectDocumentValue(
            document_id=document_id,
            template_field_id=template_field_id,
            value_text=str(value_text or ""),
        ))


def pick_first_value(values: dict, keys: list[str], default_value: str = ""):
    for key in keys:
        value = values.get(key)
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return default_value


def extract_keyed_values(document: ProjectDocument):
    values = document.to_dict(include_values=True).get("values", []) or []

    field_map = {}
    template = DocumentTemplate.query.get(document.template_id)

    if template:
        for section in template.sections:
            for field in section.fields:
                field_map[field.id] = field.key

    keyed_values = {}
    for value in values:
        field_key = field_map.get(value.get("template_field_id"))
        if field_key:
            keyed_values[field_key] = value.get("value_text") or ""

    return keyed_values


def build_requirement_summary(document: ProjectDocument):
    keyed_values = extract_keyed_values(document)

    title = (
        keyed_values.get("requirement_title")
        or keyed_values.get("title")
        or keyed_values.get("requirements_title")
        or keyed_values.get("requirement_overview")
        or "-"
    )

    priority = (
        keyed_values.get("requirement_priority")
        or keyed_values.get("priority")
        or "-"
    )

    status = (
        keyed_values.get("requirement_status")
        or keyed_values.get("status")
        or document.status
        or "-"
    )

    description = (
        keyed_values.get("requirement_description")
        or keyed_values.get("description")
        or "-"
    )

    rationale = (
        keyed_values.get("requirement_rationale")
        or keyed_values.get("rationale")
        or "-"
    )

    requirement_id = (
        keyed_values.get("requirement_id")
        or keyed_values.get("req_id")
        or keyed_values.get("requirement_code")
        or document.version
        or f"{VERSION_PREFIX}{document.id:03d}"
    )

    return {
        "id": document.id,
        "requirement_id": requirement_id,
        "title": title,
        "priority": priority,
        "status": status,
        "description": description,
        "rationale": rationale,
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "updated_at": document.updated_at.isoformat() if document.updated_at else None,
    }


def get_default_requirements_template():
    return DocumentTemplate.query.filter_by(
        module="requirements",
        is_active=True,
        is_default=True
    ).first()


def get_requirement_document(project_id: int, document_id: int):
    document = ProjectDocument.query.filter_by(
        id=document_id,
        project_id=project_id
    ).first()

    if not document:
        return None

    template = DocumentTemplate.query.get(document.template_id)
    if not template or template.module != "requirements":
        return None

    return document


def get_requirement_template_ids():
    requirement_templates = DocumentTemplate.query.filter_by(module="requirements").all()
    return [template.id for template in requirement_templates]


def generate_next_requirement_id(project_id: int):
    template_ids = get_requirement_template_ids()

    if not template_ids:
        return f"{VERSION_PREFIX}001"

    existing_documents = (
        ProjectDocument.query
        .filter(
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id.in_(template_ids)
        )
        .all()
    )

    max_number = 0

    for document in existing_documents:
        version = (document.version or "").strip()
        if version.startswith(VERSION_PREFIX):
            suffix = version[len(VERSION_PREFIX):]
            if suffix.isdigit():
                max_number = max(max_number, int(suffix))

    return f"{VERSION_PREFIX}{max_number + 1:03d}"


@requirements_bp.route("/project/<int:project_id>/requirements", methods=["GET"])
@require_permission("requirements.view")
def get_requirements(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    template_ids = get_requirement_template_ids()

    if not template_ids:
        return jsonify({"requirements": []}), 200

    documents = (
        ProjectDocument.query
        .filter(
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id.in_(template_ids)
        )
        .order_by(ProjectDocument.created_at.desc())
        .all()
    )

    requirements = [build_requirement_summary(document) for document in documents]

    return jsonify({
        "requirements": requirements
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirements/link-options", methods=["GET"])
@require_permission("requirements.view")
def get_requirement_link_options(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    exclude_document_id = request.args.get("exclude_document_id", type=int)
    include_drafts = request.args.get("include_drafts", default="true").lower() == "true"

    template_ids = get_requirement_template_ids()

    if not template_ids:
        return jsonify({"options": []}), 200

    query = (
        ProjectDocument.query
        .filter(
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id.in_(template_ids)
        )
        .order_by(ProjectDocument.created_at.desc())
    )

    if exclude_document_id:
        query = query.filter(ProjectDocument.id != exclude_document_id)

    documents = query.all()

    options = []
    for document in documents:
        summary = build_requirement_summary(document)

        if not include_drafts and summary["status"] == "Draft":
            continue

        options.append({
            "value": str(document.id),
            "label": f'{summary["requirement_id"]} - {summary["title"]}',
            "requirement_id": summary["requirement_id"],
            "title": summary["title"],
            "status": summary["status"],
        })

    return jsonify({"options": options}), 200


@requirements_bp.route("/project/<int:project_id>/requirements/<int:document_id>", methods=["GET"])
@require_permission("requirements.view")
def get_requirement(project_id, document_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    document = get_requirement_document(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement not found"}), 404

    document_template = DocumentTemplate.query.get(document.template_id)
    latest_default_template = get_default_requirements_template()

    return jsonify({
        "requirement": build_requirement_summary(document),
        "document": document.to_dict(include_values=True),
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
    }), 200


@requirements_bp.route(
    "/project/<int:project_id>/requirements/<int:document_id>/template-switch-preview",
    methods=["GET"]
)
@require_permission("requirements.view")
def preview_requirement_template_switch(project_id, document_id):
    target_template_id = request.args.get("target_template_id", type=int)

    if not target_template_id:
        return jsonify({"message": "target_template_id is required"}), 400

    document = get_requirement_document(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement not found"}), 404

    source_template = DocumentTemplate.query.get(document.template_id)
    target_template = DocumentTemplate.query.filter_by(
        id=target_template_id,
        module="requirements",
        is_active=True
    ).first()

    if not source_template or not target_template:
        return jsonify({"message": "Template not found"}), 404

    preview = build_template_values_payload_from_document(
        document,
        source_template,
        target_template
    )

    return jsonify({
        "source_template": source_template.to_dict(include_sections=True),
        "target_template": target_template.to_dict(include_sections=True),
        "preview": preview,
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirements", methods=["POST"])
@require_permission("requirements.create")
def create_requirement(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    data = request.get_json() or {}

    template_id = data.get("template_id")
    status = (data.get("status") or "Draft").strip()
    values_input = data.get("values") or {}

    if template_id:
        template = DocumentTemplate.query.filter_by(
            id=template_id,
            module="requirements"
        ).first()
    else:
        template = get_default_requirements_template()

    if not template:
        return jsonify({"message": "Requirements template not found"}), 404

    if isinstance(values_input, list):
        normalized_values = values_input
        keyed_values = {}
        field_by_id, _ = get_template_field_maps(template)

        for item in normalized_values:
            field = field_by_id.get(item.get("template_field_id"))
            if field:
                keyed_values[field.key] = str(item.get("value_text", "") or "")
    else:
        keyed_values = dict(values_input)
        normalized_values = []

        requirement_id = pick_first_value(
            keyed_values,
            ["requirement_id", "req_id", "requirement_code"],
            ""
        )

        if not requirement_id:
            requirement_id = generate_next_requirement_id(project_id)

        title = pick_first_value(
            keyed_values,
            ["requirement_title", "title", "requirements_title", "requirement_overview"],
            ""
        )
        priority = pick_first_value(
            keyed_values,
            ["requirement_priority", "priority"],
            "Medium"
        )
        description = pick_first_value(
            keyed_values,
            ["requirement_description", "description"],
            ""
        )
        rationale = pick_first_value(
            keyed_values,
            ["requirement_rationale", "rationale"],
            ""
        )

        if status != "Draft" and not title:
            return jsonify({"message": "Title is required"}), 400

        template_ids = get_requirement_template_ids()

        existing_document = (
            ProjectDocument.query
            .filter(
                ProjectDocument.project_id == project_id,
                ProjectDocument.version == requirement_id,
                ProjectDocument.template_id.in_(template_ids)
            )
            .first()
        )
        if existing_document:
            return jsonify({"message": "Requirement ID already exists"}), 409

        keyed_values["requirement_id"] = requirement_id
        keyed_values.setdefault("req_id", requirement_id)
        keyed_values.setdefault("requirement_code", requirement_id)
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

        for section in template.sections:
            for field in section.fields:
                normalized_values.append({
                    "template_field_id": field.id,
                    "value_text": str(keyed_values.get(field.key, field.default_value or "") or ""),
                })

    final_requirement_id = pick_first_value(
        keyed_values,
        ["requirement_id", "req_id", "requirement_code"],
        generate_next_requirement_id(project_id)
    )

    document = ProjectDocument(
        project_id=project_id,
        template_id=template.id,
        version=final_requirement_id,
        status=status,
        created_by=session.get("user_id"),
    )
    db.session.add(document)
    db.session.flush()

    replace_requirement_values(document.id, normalized_values)
    db.session.commit()

    return jsonify({
        "message": "Requirement created successfully" if status != "Draft" else "Requirement draft created successfully",
        "requirement": build_requirement_summary(document),
        "document": document.to_dict(include_values=True),
    }), 201


@requirements_bp.route("/project/<int:project_id>/requirements/<int:document_id>", methods=["PUT"])
@require_permission("requirements.edit")
def update_requirement(project_id, document_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    document = get_requirement_document(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement not found"}), 404

    data = request.get_json() or {}

    template_id = data.get("template_id")
    status = (data.get("status") or document.status or "Draft").strip()
    values_input = data.get("values") or {}

    if template_id:
        template = DocumentTemplate.query.filter_by(
            id=template_id,
            module="requirements"
        ).first()
        if not template:
            return jsonify({"message": "Template not found"}), 404
        document.template_id = template.id
    else:
        template = DocumentTemplate.query.get(document.template_id)

    if not template:
        return jsonify({"message": "Template not found"}), 404

    if isinstance(values_input, list):
        normalized_values = values_input
        keyed_values = {}
        field_by_id, _ = get_template_field_maps(template)

        for item in normalized_values:
            field = field_by_id.get(item.get("template_field_id"))
            if field:
                keyed_values[field.key] = str(item.get("value_text", "") or "")
    else:
        keyed_values = dict(values_input)
        normalized_values = []

        requirement_id = pick_first_value(
            keyed_values,
            ["requirement_id", "req_id", "requirement_code"],
            document.version
        )

        title = pick_first_value(
            keyed_values,
            ["requirement_title", "title", "requirements_title", "requirement_overview"],
            ""
        )
        priority = pick_first_value(
            keyed_values,
            ["requirement_priority", "priority"],
            "Medium"
        )
        description = pick_first_value(
            keyed_values,
            ["requirement_description", "description"],
            ""
        )
        rationale = pick_first_value(
            keyed_values,
            ["requirement_rationale", "rationale"],
            ""
        )

        if not requirement_id:
            return jsonify({"message": "Requirement ID is required"}), 400

        if status != "Draft" and not title:
            return jsonify({"message": "Title is required"}), 400

        template_ids = get_requirement_template_ids()

        existing_document = (
            ProjectDocument.query
            .filter(
                ProjectDocument.project_id == project_id,
                ProjectDocument.version == requirement_id,
                ProjectDocument.template_id.in_(template_ids),
                ProjectDocument.id != document.id,
            )
            .first()
        )
        if existing_document:
            return jsonify({"message": "Requirement ID already exists"}), 409

        keyed_values["requirement_id"] = requirement_id
        keyed_values.setdefault("req_id", requirement_id)
        keyed_values.setdefault("requirement_code", requirement_id)
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

        for section in template.sections:
            for field in section.fields:
                normalized_values.append({
                    "template_field_id": field.id,
                    "value_text": str(keyed_values.get(field.key, field.default_value or "") or ""),
                })

    document.version = pick_first_value(
        keyed_values,
        ["requirement_id", "req_id", "requirement_code"],
        document.version
    )
    document.status = status

    replace_requirement_values(document.id, normalized_values)
    db.session.commit()

    return jsonify({
        "message": "Requirement updated successfully" if status != "Draft" else "Requirement draft updated successfully",
        "requirement": build_requirement_summary(document),
        "document": document.to_dict(include_values=True),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirements/<int:document_id>", methods=["DELETE"])
@require_permission("requirements.delete")
def delete_requirement(project_id, document_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    document = get_requirement_document(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement not found"}), 404

    ProjectDocumentValue.query.filter_by(document_id=document.id).delete()
    db.session.delete(document)
    db.session.commit()

    return jsonify({"message": "Requirement deleted successfully"}), 200