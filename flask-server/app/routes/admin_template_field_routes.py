from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models.document_template_section import DocumentTemplateSection
from app.models.document_template_field import DocumentTemplateField
from app.utils.permissions import require_permission

admin_template_field_bp = Blueprint("admin_template_fields", __name__, url_prefix="/api/admin/template-fields")


@admin_template_field_bp.route("/section/<int:section_id>", methods=["POST"])
@require_permission("templates.edit")
def create_field(section_id):
    section = DocumentTemplateSection.query.get(section_id)
    if not section:
        return jsonify({"message": "Section not found"}), 404

    data = request.get_json() or {}

    label = (data.get("label") or "").strip()
    key = (data.get("key") or "").strip()
    field_type = (data.get("field_type") or "textarea").strip()

    if not label or not key:
        return jsonify({"message": "Field label and key are required"}), 400

    field = DocumentTemplateField(
        section_id=section.id,
        key=key,
        label=label,
        field_type=field_type,
        placeholder=data.get("placeholder"),
        help_text=data.get("help_text"),
        default_value=data.get("default_value"),
        options_json=data.get("options_json"),
        is_required=bool(data.get("is_required", False)),
        sort_order=data.get("sort_order", 1),
    )
    db.session.add(field)
    db.session.commit()

    return jsonify({
        "message": "Field created successfully",
        "field": field.to_dict()
    }), 201


@admin_template_field_bp.route("/<int:field_id>", methods=["PUT"])
@require_permission("templates.edit")
def update_field(field_id):
    field = DocumentTemplateField.query.get(field_id)
    if not field:
        return jsonify({"message": "Field not found"}), 404

    data = request.get_json() or {}

    if "key" in data:
        field.key = (data.get("key") or "").strip()

    if "label" in data:
        field.label = (data.get("label") or "").strip()

    if "field_type" in data:
        field.field_type = (data.get("field_type") or "textarea").strip()

    if "placeholder" in data:
        field.placeholder = data.get("placeholder")

    if "help_text" in data:
        field.help_text = data.get("help_text")

    if "default_value" in data:
        field.default_value = data.get("default_value")

    if "options_json" in data:
        field.options_json = data.get("options_json")

    if "is_required" in data:
        field.is_required = bool(data.get("is_required"))

    if "sort_order" in data:
        field.sort_order = data.get("sort_order")

    db.session.commit()

    return jsonify({
        "message": "Field updated successfully",
        "field": field.to_dict()
    }), 200


@admin_template_field_bp.route("/<int:field_id>", methods=["DELETE"])
@require_permission("templates.edit")
def delete_field(field_id):
    field = DocumentTemplateField.query.get(field_id)
    if not field:
        return jsonify({"message": "Field not found"}), 404

    db.session.delete(field)
    db.session.commit()

    return jsonify({"message": "Field deleted successfully"}), 200