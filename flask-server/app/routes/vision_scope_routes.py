from flask import Blueprint, jsonify, request, session
from app.extensions import db
from app.models.project_document import ProjectDocument
from app.models.project_document_value import ProjectDocumentValue
from app.models.document_templates import DocumentTemplate
from app.models.document_template_field import DocumentTemplateField
from app.utils.permissions import require_permission

vision_scope_bp = Blueprint("vision_scope", __name__)


@vision_scope_bp.route("/project/<int:project_id>/documents", methods=["GET"])
@require_permission("vision_scope.view")
def get_project_vision_scope_documents(project_id):
    vision_scope_templates = DocumentTemplate.query.filter_by(
        module="vision_scope"
    ).all()

    template_ids = [template.id for template in vision_scope_templates]

    if not template_ids:
        return jsonify({"documents": []}), 200

    documents = (
        ProjectDocument.query
        .filter(
            ProjectDocument.project_id == project_id,
            ProjectDocument.template_id.in_(template_ids)
        )
        .order_by(ProjectDocument.updated_at.desc())
        .all()
    )

    return jsonify({
        "documents": [doc.to_dict(include_values=True) for doc in documents]
    }), 200


@vision_scope_bp.route("/project/<int:project_id>/documents", methods=["POST"])
@require_permission("vision_scope.create")
def create_project_vision_scope_document(project_id):
    data = request.get_json() or {}

    template_id = data.get("template_id")
    version = (data.get("version") or "").strip()
    status = (data.get("status") or "Draft").strip()
    values = data.get("values", [])

    if not template_id:
      return jsonify({"message": "Template is required"}), 400

    template = DocumentTemplate.query.get(template_id)
    if not template:
        return jsonify({"message": "Template not found"}), 404

    if status == "Draft":
        existing_draft = ProjectDocument.query.filter_by(
            project_id=project_id,
            template_id=template.id,
            status="Draft"
        ).first()

        if existing_draft:
            return jsonify({"message": "A draft already exists for this project"}), 400

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

    for item in values:
        template_field_id = item.get("template_field_id")
        value_text = item.get("value_text", "")

        field = DocumentTemplateField.query.get(template_field_id)
        if not field:
            continue

        db.session.add(ProjectDocumentValue(
            document_id=document.id,
            template_field_id=template_field_id,
            value_text=value_text,
        ))

    db.session.commit()

    return jsonify({
        "message": "Vision & Scope document created successfully",
        "document": document.to_dict(include_values=True)
    }), 201


@vision_scope_bp.route("/project/<int:project_id>/documents/<int:document_id>", methods=["PUT"])
@require_permission("vision_scope.edit")
def update_project_vision_scope_document(project_id, document_id):
    data = request.get_json() or {}

    version = (data.get("version") or "").strip()
    status = (data.get("status") or "").strip()
    values = data.get("values", [])

    document = ProjectDocument.query.filter_by(
        id=document_id,
        project_id=project_id
    ).first()

    if not document:
        return jsonify({"message": "Vision & Scope document not found"}), 404

    if version:
        document.version = version

    if status:
        document.status = status

    existing_values = ProjectDocumentValue.query.filter_by(
        document_id=document.id
    ).all()

    existing_value_map = {
        value.template_field_id: value for value in existing_values
    }

    for item in values:
        template_field_id = item.get("template_field_id")
        value_text = item.get("value_text", "")

        field = DocumentTemplateField.query.get(template_field_id)
        if not field:
            continue

        existing_value = existing_value_map.get(template_field_id)

        if existing_value:
            existing_value.value_text = value_text
        else:
            db.session.add(ProjectDocumentValue(
                document_id=document.id,
                template_field_id=template_field_id,
                value_text=value_text,
            ))

    db.session.commit()

    return jsonify({
        "message": "Vision & Scope document updated successfully",
        "document": document.to_dict(include_values=True)
    }), 200


@vision_scope_bp.route("/project/<int:project_id>/documents/<int:document_id>", methods=["DELETE"])
@require_permission("vision_scope.delete")
def delete_project_vision_scope_document(project_id, document_id):
    document = ProjectDocument.query.filter_by(
        id=document_id,
        project_id=project_id
    ).first()

    if not document:
        return jsonify({"message": "Vision & Scope document not found"}), 404

    ProjectDocumentValue.query.filter_by(document_id=document.id).delete()
    db.session.delete(document)
    db.session.commit()

    return jsonify({
        "message": "Vision & Scope document deleted successfully"
    }), 200