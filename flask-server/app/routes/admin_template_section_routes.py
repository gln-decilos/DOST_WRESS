from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models.document_templates import DocumentTemplate
from app.models.document_template_section import DocumentTemplateSection
from app.models.document_template_field import DocumentTemplateField
# from app.utils.permissions import require_permission

admin_template_section_bp = Blueprint("admin_template_sections", __name__, url_prefix="/api/admin/template-sections")

@admin_template_section_bp.route("/template/<int:template_id>", methods=["POST"])
# @require_permission("templates.edit")
def create_section(template_id):
    template = DocumentTemplate.query.get(template_id)
    if not template:
        return jsonify({"message": "Template not found"}), 404

    data = request.get_json() or {}

    title = (data.get("title") or "").strip()
    description = data.get("description")
    sort_order = data.get("sort_order", 1)
    is_collapsible = data.get("is_collapsible", True)

    if not title:
        return jsonify({"message": "Section title is required"}), 400

    section = DocumentTemplateSection(
        template_id=template.id,
        title=title,
        description=description,
        sort_order=sort_order,
        is_collapsible=is_collapsible,
    )
    db.session.add(section)
    db.session.commit()

    return jsonify({
        "message": "Section created successfully",
        "section": section.to_dict(include_fields=True)
    }), 201

@admin_template_section_bp.route("/<int:section_id>", methods=["PUT"])
# @require_permission("templates.edit")
def update_section(section_id):
    section = DocumentTemplateSection.query.get(section_id)
    if not section:
        return jsonify({"message": "Section not found"}), 404

    data = request.get_json() or {}

    if "title" in data:
        section.title = (data.get("title") or "").strip()

    if "description" in data:
        section.description = data.get("description")

    if "sort_order" in data:
        section.sort_order = data.get("sort_order")

    if "is_collapsible" in data:
        section.is_collapsible = bool(data.get("is_collapsible"))

    db.session.commit()

    return jsonify({
        "message": "Section updated successfully",
        "section": section.to_dict(include_fields=True)
    }), 200

@admin_template_section_bp.route("/<int:section_id>", methods=["DELETE"])
# @require_permission("templates.edit")
def delete_section(section_id):
    section = DocumentTemplateSection.query.get(section_id)
    if not section:
        return jsonify({"message": "Section not found"}), 404

    for field in section.fields:
        db.session.delete(field)

    db.session.delete(section)
    db.session.commit()

    return jsonify({"message": "Section deleted successfully"}), 200