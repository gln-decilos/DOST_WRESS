from flask import Blueprint, jsonify, request, session
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.project_document import ProjectDocument
from app.models.project_document_value import ProjectDocumentValue
from app.models.document_templates import DocumentTemplate
from app.models.document_template_field import DocumentTemplateField
# from app.utils.permissions import require_permission  # COMMENT THIS OUT

vision_scope_bp = Blueprint("vision_scope", __name__)


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


def get_vision_scope_template_ids():
    templates = DocumentTemplate.query.filter_by(module="vision_scope").all()
    return [template.id for template in templates]


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


def replace_document_values(document_id, values):
    ProjectDocumentValue.query.filter_by(document_id=document_id).delete(synchronize_session=False)

    for item in values:
        template_field_id = item.get("template_field_id")
        value_text = item.get("value_text", "")

        if not template_field_id:
            continue

        field = DocumentTemplateField.query.get(template_field_id)
        if not field:
            continue

        db.session.add(ProjectDocumentValue(
            document_id=document_id,
            template_field_id=template_field_id,
            value_text=value_text,
        ))


def get_vision_scope_document(project_id, document_id):
    template_ids = get_vision_scope_template_ids()

    if not template_ids:
        return None

    return (
        ProjectDocument.query
        .options(joinedload(ProjectDocument.values))
        .filter(
            ProjectDocument.id == document_id,
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id.in_(template_ids)
        )
        .first()
    )


@vision_scope_bp.route("/project/<int:project_id>/vision-scope/documents", methods=["GET"])
# @require_permission("vision_scope.view")  # COMMENT THIS OUT
def get_project_vision_scope_documents(project_id):
    template_ids = get_vision_scope_template_ids()

    if not template_ids:
        return jsonify({"documents": []}), 200

    documents = (
        ProjectDocument.query
        .filter(
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id.in_(template_ids)
        )
        .order_by(ProjectDocument.updated_at.desc(), ProjectDocument.id.desc())
        .all()
    )

    return jsonify({
        "documents": [doc.to_dict(include_values=True) for doc in documents]
    }), 200


@vision_scope_bp.route("/project/<int:project_id>/vision-scope/documents/<int:document_id>", methods=["GET"])
# @require_permission("vision_scope.view")  # COMMENT THIS OUT
def get_project_vision_scope_document(project_id, document_id):
    document = get_vision_scope_document(project_id, document_id)

    if not document:
        return jsonify({"message": "Vision & Scope document not found"}), 404

    document_template = DocumentTemplate.query.get(document.template_id)
    latest_default_template = DocumentTemplate.query.filter_by(
        module="vision_scope",
        is_active=True,
        is_default=True
    ).first()

    return jsonify({
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
    }), 200


@vision_scope_bp.route("/project/<int:project_id>/vision-scope/documents/<int:document_id>/template-switch-preview", methods=["GET"])
# @require_permission("vision_scope.view")  # COMMENT THIS OUT
def preview_template_switch(project_id, document_id):
    target_template_id = request.args.get("target_template_id", type=int)

    if not target_template_id:
        return jsonify({"message": "target_template_id is required"}), 400

    document = get_vision_scope_document(project_id, document_id)

    if not document:
        return jsonify({"message": "Vision & Scope document not found"}), 404

    source_template = DocumentTemplate.query.filter_by(
        id=document.template_id,
        module="vision_scope"
    ).first()

    target_template = DocumentTemplate.query.filter_by(
        id=target_template_id,
        module="vision_scope",
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


@vision_scope_bp.route("/project/<int:project_id>/vision-scope/documents", methods=["POST"])
# @require_permission("vision_scope.create")  # COMMENT THIS OUT
def create_project_vision_scope_document(project_id):
    data = request.get_json() or {}

    template_id = data.get("template_id")
    version = (data.get("version") or "").strip()
    status = (data.get("status") or "Draft").strip()
    values = data.get("values") or []

    if not template_id:
        return jsonify({"message": "Template is required"}), 400

    template = DocumentTemplate.query.filter_by(
        id=template_id,
        module="vision_scope"
    ).first()

    if not template:
        return jsonify({"message": "Template not found"}), 404

    if status == "Draft":
        existing_draft = (
            ProjectDocument.query
            .join(DocumentTemplate, ProjectDocument.template_id == DocumentTemplate.id)
            .filter(
                ProjectDocument.project_id == project_id,
                ProjectDocument.status == "Draft",
                DocumentTemplate.module == "vision_scope"
            )
            .first()
        )

        if existing_draft:
            return jsonify({"message": "A Vision & Scope draft already exists for this project"}), 400

        version = "Draft"
    else:
        if not version:
            return jsonify({"message": "Version is required for published documents"}), 400

    document = ProjectDocument(
        project_id=project_id,
        template_id=template.id,
        version=version,
        status=status,
        created_by=session.get("user_id"),
    )
    db.session.add(document)
    db.session.flush()

    replace_document_values(document.id, values)
    db.session.commit()

    return jsonify({
        "message": "Vision & Scope document created successfully",
        "document": document.to_dict(include_values=True)
    }), 201


@vision_scope_bp.route("/project/<int:project_id>/vision-scope/documents/<int:document_id>", methods=["PUT"])
# @require_permission("vision_scope.edit")  # COMMENT THIS OUT
def update_project_vision_scope_document(project_id, document_id):
    data = request.get_json() or {}

    template_id = data.get("template_id")
    version = (data.get("version") or "").strip()
    status = (data.get("status") or "").strip()
    values = data.get("values", None)

    document = get_vision_scope_document(project_id, document_id)

    if not document:
        return jsonify({"message": "Vision & Scope document not found"}), 404

    if template_id:
        template = DocumentTemplate.query.filter_by(
            id=template_id,
            module="vision_scope"
        ).first()

        if not template:
            return jsonify({"message": "Template not found"}), 404

        document.template_id = template.id

    if status:
        if status == "Draft":
            existing_other_draft = (
                ProjectDocument.query
                .join(DocumentTemplate, ProjectDocument.template_id == DocumentTemplate.id)
                .filter(
                    ProjectDocument.project_id == project_id,
                    ProjectDocument.status == "Draft",
                    DocumentTemplate.module == "vision_scope",
                    ProjectDocument.id != document.id
                )
                .first()
            )

            if existing_other_draft:
                return jsonify({"message": "Another Vision & Scope draft already exists for this project"}), 400

            document.status = "Draft"
            document.version = "Draft"
        else:
            document.status = status
            if version:
                document.version = version
    elif version:
        document.version = version

    if values is not None:
        replace_document_values(document.id, values)

    db.session.commit()

    return jsonify({
        "message": "Vision & Scope document updated successfully",
        "document": document.to_dict(include_values=True)
    }), 200


@vision_scope_bp.route("/project/<int:project_id>/vision-scope/documents/<int:document_id>", methods=["DELETE"])
# @require_permission("vision_scope.delete")  # COMMENT THIS OUT
def delete_project_vision_scope_document(project_id, document_id):
    document = get_vision_scope_document(project_id, document_id)

    if not document:
        return jsonify({"message": "Vision & Scope document not found"}), 404

    ProjectDocumentValue.query.filter_by(document_id=document.id).delete(synchronize_session=False)
    db.session.delete(document)
    db.session.commit()

    return jsonify({
         "message": "Vision & Scope document deleted successfully"
    }), 200