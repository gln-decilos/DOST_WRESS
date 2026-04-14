from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models.project import Project
from app.models.document_templates import DocumentTemplate
from app.models.project_document import ProjectDocument
from app.models.project_document_value import ProjectDocumentValue
from app.utils.permissions import require_permission

requirements_bp = Blueprint("requirements", __name__)

VERSION_PREFIX = "REQ-SPEC-"


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
        or f"{VERSION_PREFIX}{document.id}"
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


def pick_first_value(values: dict, keys: list[str], default_value: str = ""):
    for key in keys:
        value = values.get(key)
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return default_value


def generate_next_requirement_id(project_id: int, template_id: int):
    existing_documents = (
        ProjectDocument.query
        .filter_by(project_id=project_id, template_id=template_id)
        .order_by(ProjectDocument.id.desc())
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

    requirement_templates = DocumentTemplate.query.filter_by(module="requirements").all()
    template_ids = [template.id for template in requirement_templates]

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


@requirements_bp.route("/project/<int:project_id>/requirements/<int:document_id>", methods=["GET"])
@require_permission("requirements.view")
def get_requirement(project_id, document_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    document = get_requirement_document(project_id, document_id)
    if not document:
        return jsonify({"message": "Requirement not found"}), 404

    return jsonify({
        "requirement": build_requirement_summary(document),
        "document": document.to_dict(include_values=True),
    }), 200


@requirements_bp.route("/project/<int:project_id>/requirements", methods=["POST"])
@require_permission("requirements.create")
def create_requirement(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    default_template = get_default_requirements_template()
    if not default_template:
        return jsonify({"message": "Default requirements template not found"}), 404

    data = request.get_json() or {}
    values = data.get("values") or {}

    title = pick_first_value(
        values,
        ["requirement_title", "title", "requirements_title", "requirement_overview"],
        ""
    )
    priority = pick_first_value(
        values,
        ["requirement_priority", "priority"],
        "Medium"
    )
    status = pick_first_value(
        values,
        ["requirement_status", "status"],
        (data.get("status") or "Draft").strip()
    )
    description = pick_first_value(
        values,
        ["requirement_description", "description"],
        ""
    )
    rationale = pick_first_value(
        values,
        ["requirement_rationale", "rationale"],
        ""
    )

    requirement_id = pick_first_value(
        values,
        ["requirement_id", "req_id", "requirement_code"],
        ""
    )

    if not requirement_id:
        requirement_id = generate_next_requirement_id(project_id, default_template.id)

    if not title:
        return jsonify({"message": "Title is required"}), 400

    existing_document = (
        ProjectDocument.query
        .filter_by(
            project_id=project_id,
            template_id=default_template.id,
            version=requirement_id
        )
        .first()
    )

    if existing_document:
        return jsonify({"message": "Requirement ID already exists"}), 409

    document = ProjectDocument(
        project_id=project_id,
        template_id=default_template.id,
        version=requirement_id,
        status=status,
        created_by=None,
    )
    db.session.add(document)
    db.session.flush()

    merged_values = dict(values)
    merged_values["requirement_id"] = requirement_id
    merged_values.setdefault("req_id", requirement_id)
    merged_values.setdefault("requirement_code", requirement_id)
    merged_values.setdefault("title", title)
    merged_values.setdefault("requirement_title", title)
    merged_values.setdefault("priority", priority)
    merged_values.setdefault("requirement_priority", priority)
    merged_values.setdefault("status", status)
    merged_values.setdefault("requirement_status", status)
    merged_values.setdefault("description", description)
    merged_values.setdefault("requirement_description", description)
    merged_values.setdefault("rationale", rationale)
    merged_values.setdefault("requirement_rationale", rationale)

    for section in default_template.sections:
        for field in section.fields:
            value_text = str(merged_values.get(field.key, ""))
            new_value = ProjectDocumentValue(
                document_id=document.id,
                template_field_id=field.id,
                value_text=value_text,
            )
            db.session.add(new_value)

    db.session.commit()

    return jsonify({
        "message": "Requirement created successfully",
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

    template = DocumentTemplate.query.get(document.template_id)
    data = request.get_json() or {}
    values = data.get("values") or {}

    requirement_id = pick_first_value(
        values,
        ["requirement_id", "req_id", "requirement_code"],
        document.version
    )

    status = pick_first_value(
        values,
        ["requirement_status", "status"],
        document.status
    )

    if not requirement_id:
        return jsonify({"message": "Requirement ID is required"}), 400

    existing_document = (
        ProjectDocument.query
        .filter(
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id == document.template_id,
            ProjectDocument.version == requirement_id,
            ProjectDocument.id != document.id,
        )
        .first()
    )
    if existing_document:
        return jsonify({"message": "Requirement ID already exists"}), 409

    document.version = requirement_id
    document.status = status

    existing_values = {
        value.template_field_id: value
        for value in document.values
    }

    merged_values = dict(values)
    merged_values["requirement_id"] = requirement_id
    merged_values.setdefault("status", status)
    merged_values.setdefault("requirement_status", status)

    for section in template.sections:
        for field in section.fields:
            if field.key not in merged_values:
                continue

            incoming_value = str(merged_values.get(field.key, ""))

            if field.id in existing_values:
                existing_values[field.id].value_text = incoming_value
            else:
                db.session.add(
                    ProjectDocumentValue(
                        document_id=document.id,
                        template_field_id=field.id,
                        value_text=incoming_value,
                    )
                )

    db.session.commit()

    return jsonify({
        "message": "Requirement updated successfully",
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

    db.session.delete(document)
    db.session.commit()

    return jsonify({"message": "Requirement deleted successfully"}), 200