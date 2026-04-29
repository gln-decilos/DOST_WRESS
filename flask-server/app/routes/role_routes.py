from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permissions import RolePermission
from functools import wraps
import jwt
import os

role_bp = Blueprint("roles", __name__)

JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'xK9mP2nQ5rS8tU1vW3yZ4aB6cD7eF0gH2jK5lN7pR9sT2uV4wX6yZ8aB1cD3eF5gH7jK9lN1pR3sT5uV7wX9z')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authentication required"}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            from app.models.user import User
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

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not g.user:
            return jsonify({"error": "User not found"}), 401
        
        if g.user.user_type not in ["System Admin", "Organization Admin"]:
            return jsonify({"error": "Admin privileges required"}), 403
        
        return f(*args, **kwargs)
    return decorated_function

def get_organization_id():
    if not g.user:
        return None
    
    if g.user.user_type == "System Admin":
        return None
    
    if g.user.user_type == "Organization Admin" and g.user.organizations:
        return g.user.organizations[0].id
    
    return None

@role_bp.route("/", methods=["GET"])
@login_required
@admin_required
def get_roles():
    organization_id = get_organization_id()
    
    if organization_id:
        roles = Role.query.filter_by(organization_id=organization_id).order_by(Role.id.asc()).all()
    else:
        roles = Role.query.order_by(Role.id.asc()).all()
    
    return jsonify([role.to_dict() for role in roles]), 200

@role_bp.route("/<int:role_id>", methods=["GET"])
@login_required
@admin_required
def get_role(role_id):
    role = Role.query.get_or_404(role_id)
    organization_id = get_organization_id()
    
    if organization_id and role.organization_id != organization_id:
        return jsonify({"error": "You don't have permission to access this role"}), 403
    
    return jsonify(role.to_dict()), 200

@role_bp.route("/", methods=["POST"])
@login_required
@admin_required
def create_role():
    data = request.get_json() or {}
    
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    permission_ids = data.get("permission_ids", [])
    
    if not name:
        return jsonify({"error": "Role name is required"}), 400
    
    organization_id = get_organization_id()
    
    query = Role.query.filter_by(name=name)
    if organization_id:
        query = query.filter_by(organization_id=organization_id)
    else:
        query = query.filter_by(organization_id=None)
    
    existing_role = query.first()
    if existing_role:
        return jsonify({"error": "Role name already exists in your organization"}), 409
    
    role = Role(
        name=name,
        description=description,
        is_system=data.get("is_system", False),
        organization_id=organization_id
    )
    
    db.session.add(role)
    db.session.flush()
    
    if permission_ids:
        permissions = Permission.query.filter(Permission.id.in_(permission_ids)).all()
        found_permission_ids = {permission.id for permission in permissions}
        
        missing_ids = [
            permission_id
            for permission_id in permission_ids
            if permission_id not in found_permission_ids
        ]
        if missing_ids:
            db.session.rollback()
            return jsonify({"error": f"Invalid permission IDs: {missing_ids}"}), 400
        
        for permission in permissions:
            db.session.add(RolePermission(role_id=role.id, permission_id=permission.id))
    
    db.session.commit()
    return jsonify(role.to_dict()), 201

@role_bp.route("/<int:role_id>", methods=["PUT"])
@login_required
@admin_required
def update_role(role_id):
    role = Role.query.get_or_404(role_id)
    data = request.get_json() or {}
    
    organization_id = get_organization_id()
    
    if organization_id and role.organization_id != organization_id:
        return jsonify({"error": "You don't have permission to update this role"}), 403
    
    if role.is_system and organization_id:
        return jsonify({"error": "System roles cannot be modified by Organization Admins"}), 403
    
    name = data.get("name", role.name).strip()
    description = data.get("description", role.description or "").strip()
    permission_ids = data.get("permission_ids", None)
    
    if not name:
        return jsonify({"error": "Role name is required"}), 400
    
    query = Role.query.filter(Role.name == name, Role.id != role.id)
    if organization_id:
        query = query.filter_by(organization_id=organization_id)
    else:
        query = query.filter_by(organization_id=None)
    
    existing_role = query.first()
    if existing_role:
        return jsonify({"error": "Role name already exists in your organization"}), 409
    
    role.name = name
    role.description = description
    
    if permission_ids is not None:
        permissions = Permission.query.filter(Permission.id.in_(permission_ids)).all()
        found_permission_ids = {permission.id for permission in permissions}
        
        missing_ids = [
            permission_id
            for permission_id in permission_ids
            if permission_id not in found_permission_ids
        ]
        if missing_ids:
            db.session.rollback()
            return jsonify({"error": f"Invalid permission IDs: {missing_ids}"}), 400
        
        RolePermission.query.filter_by(role_id=role.id).delete()
        
        for permission in permissions:
            db.session.add(RolePermission(role_id=role.id, permission_id=permission.id))
    
    db.session.commit()
    return jsonify(role.to_dict()), 200

@role_bp.route("/<int:role_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_role(role_id):
    role = Role.query.get_or_404(role_id)
    organization_id = get_organization_id()
    
    if organization_id and role.organization_id != organization_id:
        return jsonify({"error": "You don't have permission to delete this role"}), 403
    
    if role.is_system:
        return jsonify({"error": "System roles cannot be deleted"}), 403
    
    from app.models.user_roles import UserRole
    assigned_users = UserRole.query.filter_by(role_id=role.id).first()
    if assigned_users:
        return jsonify({"error": "Cannot delete role that is assigned to users"}), 400
    
    db.session.delete(role)
    db.session.commit()
    
    return jsonify({"message": "Role deleted successfully"}), 200