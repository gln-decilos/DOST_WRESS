from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models.document_templates import DocumentTemplate
from app.models.document_template_section import DocumentTemplateSection
from app.models.document_template_field import DocumentTemplateField
from app.utils.permissions import require_permission
import time

admin_template_bp = Blueprint("admin_templates", __name__, url_prefix="/api/admin/templates")

@admin_template_bp.route("", methods=["GET"])
@require_permission("templates.view")
def get_templates():
    module_code = request.args.get("module")

    query = DocumentTemplate.query

    if module_code:
        query = query.filter_by(module=module_code)

    templates = query.order_by(DocumentTemplate.created_at.desc()).all()

    return jsonify({
        "templates": [template.to_dict(include_sections=True) for template in templates]
    }), 200

@admin_template_bp.route("/<int:template_id>", methods=["GET"])
@require_permission("templates.view")
def get_template(template_id):
    template = DocumentTemplate.query.get(template_id)
    if not template:
        return jsonify({"message": "Template not found"}), 404

    return jsonify({
        "template": template.to_dict(include_sections=True)
    }), 200

@admin_template_bp.route("", methods=["POST"])
@require_permission("templates.create")
def create_template():
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    code = (data.get("code") or "").strip()
    module = (data.get("module") or "").strip()
    description = data.get("description")
    is_active = data.get("is_active", True)
    is_default = data.get("is_default", False)
    organization_id = data.get("organization_id")

    if not name or not code or not module:
        return jsonify({"message": "Name, code, and module are required"}), 400

    existing = DocumentTemplate.query.filter_by(code=code).first()
    if existing:
        return jsonify({"message": "Template code already exists"}), 400

    if is_default:
        DocumentTemplate.query.filter_by(module=module).update({"is_default": False})

    template = DocumentTemplate(
        name=name,
        code=code,
        module=module,
        description=description,
        is_active=is_active,
        is_default=is_default,
        organization_id=organization_id,
    )
    db.session.add(template)
    db.session.commit()

    return jsonify({
        "message": "Template created successfully",
        "template": template.to_dict(include_sections=True)
    }), 201

@admin_template_bp.route("/<int:template_id>", methods=["PUT"])
@require_permission("templates.edit")
def update_template(template_id):
    template = DocumentTemplate.query.get(template_id)
    if not template:
        return jsonify({"message": "Template not found"}), 404

    data = request.get_json() or {}

    name = data.get("name")
    code = data.get("code")
    description = data.get("description")
    is_active = data.get("is_active")
    is_default = data.get("is_default")
    organization_id = data.get("organization_id")

    if code and code != template.code:
        existing = DocumentTemplate.query.filter_by(code=code).first()
        if existing:
            return jsonify({"message": "Template code already exists"}), 400
        template.code = code.strip()

    if name is not None:
        template.name = name.strip()

    if description is not None:
        template.description = description

    if is_active is not None:
        template.is_active = bool(is_active)

    if organization_id is not None:
        template.organization_id = organization_id

    if is_default is not None and bool(is_default):
        DocumentTemplate.query.filter_by(module=template.module).update({"is_default": False})
        template.is_default = True
    elif is_default is not None:
        template.is_default = False

    db.session.commit()

    return jsonify({
        "message": "Template updated successfully",
        "template": template.to_dict(include_sections=True)
    }), 200

@admin_template_bp.route("/<int:template_id>", methods=["DELETE"])
@require_permission("templates.delete")
def delete_template(template_id):
    template = DocumentTemplate.query.get(template_id)
    if not template:
        return jsonify({"message": "Template not found"}), 404

    for section in template.sections:
        for field in section.fields:
            db.session.delete(field)
        db.session.delete(section)

    db.session.delete(template)
    db.session.commit()

    return jsonify({"message": "Template deleted successfully"}), 200

@admin_template_bp.route("/<int:template_id>/set-default", methods=["PUT"])
@require_permission("templates.edit")
def set_template_default(template_id):
    template = DocumentTemplate.query.get(template_id)
    if not template:
        return jsonify({"message": "Template not found"}), 404

    DocumentTemplate.query.filter_by(module=template.module).update({"is_default": False})
    template.is_default = True
    template.is_active = True

    db.session.commit()

    return jsonify({
        "message": "Template set as default successfully",
        "template": template.to_dict(include_sections=True)
    }), 200

@admin_template_bp.route("/<int:template_id>/duplicate", methods=["POST"])
@require_permission("templates.create")
def duplicate_template(template_id):
    source = DocumentTemplate.query.get(template_id)
    if not source:
        return jsonify({"message": "Template not found"}), 404

    unique_suffix = int(time.time() * 1000)

    new_template = DocumentTemplate(
        name=f"{source.name} Copy",
        code=f"{source.code}_copy_{unique_suffix}",
        module=source.module,
        description=source.description,
        is_active=True,
        is_default=False,
        organization_id=source.organization_id,
    )
    db.session.add(new_template)
    db.session.flush()

    for section in source.sections:
        new_section = DocumentTemplateSection(
            template_id=new_template.id,
            title=section.title,
            description=section.description,
            sort_order=section.sort_order,
            is_collapsible=section.is_collapsible,
        )
        db.session.add(new_section)
        db.session.flush()

        for field in section.fields:
            new_field = DocumentTemplateField(
                section_id=new_section.id,
                key=field.key,
                label=field.label,
                field_type=field.field_type,
                placeholder=field.placeholder,
                help_text=field.help_text,
                default_value=field.default_value,
                options_json=field.options_json,
                is_required=field.is_required,
                sort_order=field.sort_order,
            )
            db.session.add(new_field)

    db.session.commit()

    return jsonify({
        "message": "Template duplicated successfully",
        "template": new_template.to_dict(include_sections=True)
    }), 201