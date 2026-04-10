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