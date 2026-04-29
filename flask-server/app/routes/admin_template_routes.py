from flask import Blueprint, jsonify, request, g
from app.extensions import db
from app.models.document_templates import DocumentTemplate
from app.models.document_template_section import DocumentTemplateSection
from app.models.document_template_field import DocumentTemplateField
from app.models.organization_member import OrganizationMember
from app.models.user import User
from functools import wraps
import jwt
import os
import time

admin_template_bp = Blueprint("admin_templates", __name__, url_prefix="/api/admin/templates")

# Use consistent JWT secret key (same as in users.py)
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'xK9mP2nQ5rS8tU1vW3yZ4aB6cD7eF0gH2jK5lN7pR9sT2uV4wX6yZ8aB1cD3eF5gH7jK9lN1pR3sT5uV7wX9z')

# ============ AUTHENTICATION DECORATORS ============
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authentication required"}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            g.user_id = payload['user_id']
            g.user = User.query.get(g.user_id)
            
            if not g.user:
                return jsonify({"error": "User not found"}), 401
            
            if not g.user.is_active:
                return jsonify({"error": "User account is deactivated"}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        
        return f(*args, **kwargs)
    return decorated_function

def organization_admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not g.user:
            return jsonify({"error": "User not found"}), 401
        
        if g.user.user_type != "Organization Admin":
            return jsonify({"error": "Organization Admin privileges required"}), 403
        
        return f(*args, **kwargs)
    return decorated_function

# Helper function to get user's organization_id
def get_user_organization_id():
    """Get organization_id from organization_members table for current user"""
    if not hasattr(g, 'user') or not g.user:
        return None
    
    org_member = OrganizationMember.query.filter_by(user_id=g.user.id).first()
    return org_member.organization_id if org_member else None

# ============ CORS OPTIONS HANDLER ============
@admin_template_bp.route('', methods=['OPTIONS'])
@admin_template_bp.route('/<int:template_id>', methods=['OPTIONS'])
@admin_template_bp.route('/<int:template_id>/set-default', methods=['OPTIONS'])
@admin_template_bp.route('/<int:template_id>/duplicate', methods=['OPTIONS'])
def handle_options(template_id=None):
    """Handle CORS preflight requests"""
    response = jsonify({})
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response, 200

# ============ TEMPLATE ROUTES ============

@admin_template_bp.route("", methods=["GET"])
@login_required
@organization_admin_required
def get_templates():
    """Get all templates for the current user's organization"""
    organization_id = get_user_organization_id()
    if not organization_id:
        return jsonify({"error": "User is not associated with any organization"}), 403
    
    module_code = request.args.get("module")
    
    # Filter by organization_id
    query = DocumentTemplate.query.filter_by(organization_id=organization_id)
    
    if module_code:
        query = query.filter_by(module=module_code)
    
    templates = query.order_by(DocumentTemplate.created_at.desc()).all()
    
    return jsonify({
        "templates": [template.to_dict(include_sections=True) for template in templates]
    }), 200


@admin_template_bp.route("/<int:template_id>", methods=["GET"])
@login_required
@organization_admin_required
def get_template(template_id):
    """Get a specific template by ID"""
    organization_id = get_user_organization_id()
    if not organization_id:
        return jsonify({"error": "User is not associated with any organization"}), 403
    
    # Only allow access to templates belonging to user's organization
    template = DocumentTemplate.query.filter_by(id=template_id, organization_id=organization_id).first()
    if not template:
        return jsonify({"error": "Template not found"}), 404
    
    return jsonify({
        "template": template.to_dict(include_sections=True)
    }), 200


@admin_template_bp.route("", methods=["POST"])
@login_required
@organization_admin_required
def create_template():
    """Create a new template for the current user's organization"""
    data = request.get_json() or {}
    
    organization_id = get_user_organization_id()
    if not organization_id:
        return jsonify({"error": "User is not associated with any organization"}), 403
    
    name = (data.get("name") or "").strip()
    code = (data.get("code") or "").strip()
    module = (data.get("module") or "").strip()
    description = data.get("description")
    is_active = data.get("is_active", True)
    is_default = data.get("is_default", False)
    
    if not name or not code or not module:
        return jsonify({"error": "Name, code, and module are required"}), 400
    
    # Check for existing template with same code within the organization
    existing = DocumentTemplate.query.filter_by(code=code, organization_id=organization_id).first()
    if existing:
        return jsonify({"error": "Template code already exists in your organization"}), 400
    
    # If setting as default, remove default status from other templates in same module and organization
    if is_default:
        DocumentTemplate.query.filter_by(
            module=module, 
            organization_id=organization_id
        ).update({"is_default": False})
    
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
@login_required
@organization_admin_required
def update_template(template_id):
    """Update a template"""
    organization_id = get_user_organization_id()
    if not organization_id:
        return jsonify({"error": "User is not associated with any organization"}), 403
    
    # Only allow access to templates belonging to user's organization
    template = DocumentTemplate.query.filter_by(id=template_id, organization_id=organization_id).first()
    if not template:
        return jsonify({"error": "Template not found"}), 404
    
    data = request.get_json() or {}
    
    name = data.get("name")
    code = data.get("code")
    description = data.get("description")
    is_active = data.get("is_active")
    is_default = data.get("is_default")
    
    # Check code uniqueness within organization if changing
    if code and code != template.code:
        code = code.strip()
        existing = DocumentTemplate.query.filter_by(code=code, organization_id=organization_id).first()
        if existing:
            return jsonify({"error": "Template code already exists in your organization"}), 400
        template.code = code
    
    if name is not None:
        template.name = name.strip()
    
    if description is not None:
        template.description = description
    
    if is_active is not None:
        template.is_active = bool(is_active)
    
    # Handle default status within organization
    if is_default is not None and bool(is_default):
        DocumentTemplate.query.filter_by(
            module=template.module, 
            organization_id=organization_id
        ).update({"is_default": False})
        template.is_default = True
    elif is_default is not None:
        template.is_default = False
    
    db.session.commit()
    
    return jsonify({
        "message": "Template updated successfully",
        "template": template.to_dict(include_sections=True)
    }), 200


@admin_template_bp.route("/<int:template_id>", methods=["DELETE"])
@login_required
@organization_admin_required
def delete_template(template_id):
    """Delete a template"""
    organization_id = get_user_organization_id()
    if not organization_id:
        return jsonify({"error": "User is not associated with any organization"}), 403
    
    # Only allow access to templates belonging to user's organization
    template = DocumentTemplate.query.filter_by(id=template_id, organization_id=organization_id).first()
    if not template:
        return jsonify({"error": "Template not found"}), 404
    
    # Delete related sections and fields
    for section in template.sections:
        for field in section.fields:
            db.session.delete(field)
        db.session.delete(section)
    
    db.session.delete(template)
    db.session.commit()
    
    return jsonify({"message": "Template deleted successfully"}), 200


@admin_template_bp.route("/<int:template_id>/set-default", methods=["PUT"])
@login_required
@organization_admin_required
def set_template_default(template_id):
    """Set a template as default for its module within the organization"""
    organization_id = get_user_organization_id()
    if not organization_id:
        return jsonify({"error": "User is not associated with any organization"}), 403
    
    # Only allow access to templates belonging to user's organization
    template = DocumentTemplate.query.filter_by(id=template_id, organization_id=organization_id).first()
    if not template:
        return jsonify({"error": "Template not found"}), 404
    
    # Remove default status from other templates in same module within organization
    DocumentTemplate.query.filter_by(
        module=template.module, 
        organization_id=organization_id
    ).update({"is_default": False})
    
    template.is_default = True
    template.is_active = True
    
    db.session.commit()
    
    return jsonify({
        "message": "Template set as default successfully",
        "template": template.to_dict(include_sections=True)
    }), 200


@admin_template_bp.route("/<int:template_id>/duplicate", methods=["POST"])
@login_required
@organization_admin_required
def duplicate_template(template_id):
    """Duplicate a template within the same organization"""
    organization_id = get_user_organization_id()
    if not organization_id:
        return jsonify({"error": "User is not associated with any organization"}), 403
    
    # Only allow duplicating templates from the same organization
    source = DocumentTemplate.query.filter_by(id=template_id, organization_id=organization_id).first()
    if not source:
        return jsonify({"error": "Template not found"}), 404
    
    unique_suffix = int(time.time() * 1000)
    
    # Create new template with same organization_id
    new_template = DocumentTemplate(
        name=f"{source.name} Copy",
        code=f"{source.code}_copy_{unique_suffix}",
        module=source.module,
        description=source.description,
        is_active=True,
        is_default=False,
        organization_id=organization_id,
    )
    db.session.add(new_template)
    db.session.flush()
    
    # Duplicate sections and fields
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