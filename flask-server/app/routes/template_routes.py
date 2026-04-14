from flask import Blueprint, jsonify
from app.models.document_templates import DocumentTemplate

template_bp = Blueprint("templates", __name__)


@template_bp.route("/<string:module_code>/default", methods=["GET"])
def get_default_template(module_code):
    template = DocumentTemplate.query.filter_by(
        module=module_code,
        is_active=True,
        is_default=True
    ).first()

    if not template:
        return jsonify({"message": "Template not found"}), 404

    return jsonify({
        "template": template.to_dict(include_sections=True)
    }), 200


@template_bp.route("/<string:module_code>/<int:template_id>", methods=["GET"])
def get_template_by_id(module_code, template_id):
    template = DocumentTemplate.query.filter_by(
        id=template_id,
        module=module_code,
        is_active=True
    ).first()

    if not template:
        return jsonify({"message": "Template not found"}), 404

    return jsonify({
        "template": template.to_dict(include_sections=True)
    }), 200


@template_bp.route("/<string:module_code>", methods=["GET"])
def get_templates_by_module(module_code):
    templates = DocumentTemplate.query.filter_by(
        module=module_code,
        is_active=True
    ).order_by(DocumentTemplate.updated_at.desc()).all()

    return jsonify({
        "templates": [template.to_dict(include_sections=True) for template in templates]
    }), 200