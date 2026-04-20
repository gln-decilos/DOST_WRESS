from flask import Blueprint, jsonify, request, g
from datetime import datetime
from app.extensions import db
from app.models.project import Project
from app.models.user import User
from app.models.role import Role
from app.models.user_roles import UserRole
from functools import wraps
import jwt
import os

orgadmin_project_bp = Blueprint("orgadmin_project_bp", __name__)

# Use consistent JWT secret key
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'xK9mP2nQ5rS8tU1vW3yZ4aB6cD7eF0gH2jK5lN7pR9sT2uV4wX6yZ8aB1cD3eF5gH7jK9lN1pR3sT5uV7wX9z')

# ============ AUTHENTICATION DECORATORS ============
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        print(f"Auth header received: {auth_header}")
        
        if not auth_header or not auth_header.startswith('Bearer '):
            print("No valid Authorization header found")
            return jsonify({"error": "Authentication required"}), 401
        
        token = auth_header.split(' ')[1]
        print(f"Token received (first 20 chars): {token[:20]}...")
        
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            print(f"Token decoded successfully. User ID: {payload.get('user_id')}")
            g.user_id = payload['user_id']
            g.user = User.query.get(g.user_id)
            
            if not g.user:
                print(f"User not found for ID: {g.user_id}")
                return jsonify({"error": "User not found"}), 401
            
            if not g.user.is_active:
                print(f"User is inactive: {g.user.email}")
                return jsonify({"error": "User account is deactivated"}), 401
                
        except jwt.ExpiredSignatureError:
            print("Token has expired")
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError as e:
            print(f"Invalid token error: {str(e)}")
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


# ============ HELPER FUNCTIONS ============
def get_project_manager(project_id):
    """Get the project manager user for a specific project"""
    # Find the Project Manager role
    pm_role = Role.query.filter_by(name="Project Manager").first()
    if not pm_role:
        return None
    
    # Find the user assigned as Project Manager for this project
    user_role = UserRole.query.filter_by(
        project_id=project_id,
        role_id=pm_role.id
    ).first()
    
    if user_role:
        return User.query.get(user_role.user_id)
    return None

def assign_project_manager(project_id, user_id):
    """Assign a user as Project Manager for a project"""
    # Find the Project Manager role
    pm_role = Role.query.filter_by(name="Project Manager").first()
    if not pm_role:
        raise Exception("Project Manager role not found")
    
    # Remove existing assignment if any
    UserRole.query.filter_by(
        project_id=project_id,
        role_id=pm_role.id
    ).delete()
    
    # Create new assignment if user_id is provided
    if user_id:
        user_role = UserRole(
            project_id=project_id,
            user_id=user_id,
            role_id=pm_role.id
        )
        db.session.add(user_role)
    
    db.session.flush()


# ============ ORGANIZATION ADMIN PROJECT ROUTES ============

@orgadmin_project_bp.route("/projects", methods=["GET"])
@login_required
@organization_admin_required
def get_organization_projects():
    """Organization Admin: Get all projects from their organization with project manager info"""
    current_user = g.user
    
    if not current_user.organizations:
        print("No organizations found for user")
        return jsonify([]), 200
    
    # Get the organization ID (assuming admin belongs to one organization)
    org_id = current_user.organizations[0].id
    print(f"Organization ID: {org_id}")
    
    # Get all projects for this organization
    projects = Project.query.filter_by(organization_id=org_id).order_by(Project.created_at.desc()).all()
    
    # Convert to dict with project manager info
    result = []
    for project in projects:
        project_dict = project.to_dict()
        # Get project manager for this project
        project_manager = get_project_manager(project.id)
        project_dict['project_manager_id'] = project_manager.id if project_manager else None
        project_dict['project_manager_name'] = f"{project_manager.first_name} {project_manager.last_name}" if project_manager else None
        result.append(project_dict)
    
    print(f"Found {len(result)} projects in organization")
    return jsonify(result), 200


@orgadmin_project_bp.route("/projects/<int:project_id>", methods=["GET"])
@login_required
@organization_admin_required
def get_project(project_id):
    """Organization Admin: Get a specific project from their organization"""
    current_user = g.user
    
    if not current_user.organizations:
        return jsonify({"error": "No organization found"}), 404
    
    org_id = current_user.organizations[0].id
    
    # Check if project belongs to user's organization
    project = Project.query.filter_by(id=project_id, organization_id=org_id).first()
    
    if not project:
        return jsonify({"message": "Project not found or you don't have permission"}), 404
    
    project_dict = project.to_dict()
    # Get project manager for this project
    project_manager = get_project_manager(project.id)
    project_dict['project_manager_id'] = project_manager.id if project_manager else None
    project_dict['project_manager_name'] = f"{project_manager.first_name} {project_manager.last_name}" if project_manager else None
    
    return jsonify(project_dict), 200


@orgadmin_project_bp.route("/projects", methods=["POST"])
@login_required
@organization_admin_required
def create_project():
    """Organization Admin: Create a new project for their organization"""
    current_user = g.user
    
    if not current_user.organizations:
        return jsonify({"error": "No organization found"}), 404
    
    org_id = current_user.organizations[0].id
    
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    status = (data.get("status") or "Pending").strip()
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    project_manager_id = data.get("project_manager_id")

    if not name:
        return jsonify({"message": "Project title is required"}), 400

    parsed_start_date = None
    parsed_end_date = None

    try:
        if start_date:
            parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        if end_date:
            parsed_end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400

    if parsed_start_date and parsed_end_date and parsed_end_date < parsed_start_date:
        return jsonify({"message": "End date cannot be earlier than start date"}), 400

    # Validate project manager if provided
    if project_manager_id:
        project_manager = User.query.get(project_manager_id)
        if not project_manager:
            return jsonify({"message": "Project manager not found"}), 404
        
        # Check if user belongs to the same organization
        user_orgs = [org.id for org in project_manager.organizations]
        if org_id not in user_orgs:
            return jsonify({"message": "Project manager must be from the same organization"}), 400

    project = Project(
        name=name,
        description=description,
        status=status,
        organization_id=org_id,
        start_date=parsed_start_date,
        end_date=parsed_end_date,
    )

    db.session.add(project)
    db.session.flush()  # This assigns an ID to the project
    
    # Assign project manager through user_roles table
    if project_manager_id:
        try:
            assign_project_manager(project.id, project_manager_id)
        except Exception as e:
            db.session.rollback()
            return jsonify({"message": str(e)}), 400
    
    db.session.commit()
    
    # Get the created project with manager info
    project_dict = project.to_dict()
    project_manager = get_project_manager(project.id)
    project_dict['project_manager_id'] = project_manager.id if project_manager else None
    project_dict['project_manager_name'] = f"{project_manager.first_name} {project_manager.last_name}" if project_manager else None

    return jsonify({
        "message": "Project created successfully",
        "project": project_dict
    }), 201


@orgadmin_project_bp.route("/projects/<int:project_id>", methods=["PUT"])
@login_required
@organization_admin_required
def update_project(project_id):
    """Organization Admin: Update a project from their organization"""
    current_user = g.user
    
    if not current_user.organizations:
        return jsonify({"error": "No organization found"}), 404
    
    org_id = current_user.organizations[0].id
    
    # Check if project belongs to user's organization
    project = Project.query.filter_by(id=project_id, organization_id=org_id).first()
    
    if not project:
        return jsonify({"message": "Project not found or you don't have permission"}), 404

    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    status = (data.get("status") or project.status).strip()
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    project_manager_id = data.get("project_manager_id")

    if not name:
        return jsonify({"message": "Project title is required"}), 400

    parsed_start_date = None
    parsed_end_date = None

    try:
        if start_date:
            parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        if end_date:
            parsed_end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400

    if parsed_start_date and parsed_end_date and parsed_end_date < parsed_start_date:
        return jsonify({"message": "End date cannot be earlier than start date"}), 400

    # Validate project manager if provided
    if project_manager_id:
        project_manager = User.query.get(project_manager_id)
        if not project_manager:
            return jsonify({"message": "Project manager not found"}), 404
        
        # Check if user belongs to the same organization
        user_orgs = [org.id for org in project_manager.organizations]
        if org_id not in user_orgs:
            return jsonify({"message": "Project manager must be from the same organization"}), 400

    # Update project details
    project.name = name
    project.description = description
    project.status = status
    project.start_date = parsed_start_date
    project.end_date = parsed_end_date

    db.session.flush()
    
    # Update project manager assignment through user_roles table
    try:
        assign_project_manager(project.id, project_manager_id)
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 400
    
    db.session.commit()
    
    # Get the updated project with manager info
    project_dict = project.to_dict()
    project_manager = get_project_manager(project.id)
    project_dict['project_manager_id'] = project_manager.id if project_manager else None
    project_dict['project_manager_name'] = f"{project_manager.first_name} {project_manager.last_name}" if project_manager else None

    return jsonify({
        "message": "Project updated successfully",
        "project": project_dict
    }), 200


@orgadmin_project_bp.route("/projects/<int:project_id>", methods=["DELETE"])
@login_required
@organization_admin_required
def delete_project(project_id):
    """Organization Admin: Delete a project from their organization"""
    current_user = g.user
    
    if not current_user.organizations:
        return jsonify({"error": "No organization found"}), 404
    
    org_id = current_user.organizations[0].id
    
    # Check if project belongs to user's organization
    project = Project.query.filter_by(id=project_id, organization_id=org_id).first()
    
    if not project:
        return jsonify({"message": "Project not found or you don't have permission"}), 404

    # First, delete all user_roles entries for this project
    UserRole.query.filter_by(project_id=project_id).delete()
    
    # Then delete the project
    db.session.delete(project)
    db.session.commit()

    return jsonify({"message": "Project deleted successfully"}), 200