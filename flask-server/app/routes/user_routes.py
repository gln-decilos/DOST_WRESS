from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models.user import User
from app.models.organization_member import OrganizationMember
from app.models.organization import Organization
from app.utils.password import generate_password
from app.utils.email import send_user_credentials
from functools import wraps
import jwt
from datetime import datetime, timedelta
import os

user_bp = Blueprint("users", __name__, url_prefix="/api/users")

# Use consistent JWT secret key
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production-make-it-at-least-32-characters-long')

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

def system_admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not g.user:
            return jsonify({"error": "User not found"}), 401
        
        if g.user.user_type != "System Admin":
            return jsonify({"error": "System Admin privileges required"}), 403
        
        return f(*args, **kwargs)
    return decorated_function


# ============ SYSTEM ADMIN FUNCTIONS ============
@user_bp.route("", methods=["GET"])
@login_required
@system_admin_required
def get_users():
    """System Admin: Get all users"""
    users = User.query.order_by(User.id.asc()).all()
    return jsonify([user.to_dict() for user in users]), 200


@user_bp.route("/me", methods=["GET"])
@login_required
def get_current_user():
    """Get current logged-in user info (works for both System Admin and Organization Admin)"""
    user = User.query.get(g.user_id)
    return jsonify(user.to_dict()), 200


@user_bp.route("/<int:user_id>", methods=["GET"])
@login_required
@system_admin_required
def get_user(user_id):
    """System Admin: Get specific user"""
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict()), 200


@user_bp.route("/organizations", methods=["GET"])
@login_required
@system_admin_required
def get_all_organizations():
    """System Admin: Get all organizations"""
    organizations = Organization.query.all()
    return jsonify([org.to_dict() for org in organizations]), 200


@user_bp.route("", methods=["POST"])
@login_required
@system_admin_required
def create_user():
    """System Admin: Create user with any user_type and organization"""
    data = request.get_json() or {}

    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    email = data.get("email", "").strip().lower()
    user_type = data.get("user_type", "Stakeholder")
    organization_ids = data.get("organization_ids", [])

    if not first_name or not last_name or not email:
        return jsonify({"error": "First name, last name, email are required"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already exists"}), 409

    # Validate user_type
    valid_user_types = ["System Admin", "Organization Admin", "Stakeholder"]
    if user_type not in valid_user_types:
        return jsonify({"error": f"Invalid user_type. Must be one of: {', '.join(valid_user_types)}"}), 400

    # Check organization admin limit
    if user_type == "Organization Admin" and organization_ids:
        organization = Organization.query.get(organization_ids[0])
        if organization:
            existing_admin = User.query.filter(
                User.user_type == "Organization Admin",
                User.organizations.any(Organization.id == organization.id),
                User.is_active == True
            ).first()
            if existing_admin:
                return jsonify({"error": f"Organization already has an admin: {existing_admin.first_name} {existing_admin.last_name}"}), 400

    if len(organization_ids) > 1:
        return jsonify({"error": "User can only belong to one organization"}), 400

    organization = None
    if organization_ids:
        organization = Organization.query.get(organization_ids[0])
        if not organization:
            return jsonify({"error": "Invalid organization ID"}), 400

    generated_password = generate_password()

    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        user_type=user_type,
        is_active=data.get("is_active", True),
    )

    user.set_password(generated_password)

    db.session.add(user)
    db.session.flush()

    if organization:
        db.session.add(
            OrganizationMember(
                user_id=user.id,
                organization_id=organization.id
            )
        )

    db.session.commit()

    # Send email with credentials
    send_user_credentials(
        email=email,
        password=generated_password,
        full_name=f"{first_name} {last_name}"
    )

    return jsonify(user.to_dict()), 201


@user_bp.route("/<int:user_id>", methods=["PUT"])
@login_required
@system_admin_required
def update_user(user_id):
    """System Admin: Update user with any user_type and organization"""
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}

    email = data.get("email", user.email).strip().lower()

    existing_user = User.query.filter(User.email == email, User.id != user.id).first()
    if existing_user:
        return jsonify({"error": "Email already exists"}), 409

    user.first_name = data.get("first_name", user.first_name).strip()
    user.last_name = data.get("last_name", user.last_name).strip()
    user.email = email
    user.is_active = data.get("is_active", user.is_active)

    # User type update
    user_type = data.get("user_type", user.user_type)
    valid_user_types = ["System Admin", "Organization Admin", "Stakeholder"]
    if user_type not in valid_user_types:
        return jsonify({"error": f"Invalid user_type. Must be one of: {', '.join(valid_user_types)}"}), 400
    
    # Check organization admin limit when changing to Organization Admin
    if user_type == "Organization Admin" and user.user_type != "Organization Admin":
        organization_ids = data.get("organization_ids", None)
        if organization_ids is None and user.organizations:
            organization_ids = [user.organizations[0].id]
        
        if organization_ids:
            organization = Organization.query.get(organization_ids[0])
            if organization:
                existing_admin = User.query.filter(
                    User.user_type == "Organization Admin",
                    User.organizations.any(Organization.id == organization.id),
                    User.id != user_id,
                    User.is_active == True
                ).first()
                if existing_admin:
                    return jsonify({"error": f"Organization already has an admin: {existing_admin.first_name} {existing_admin.last_name}"}), 400
    
    user.user_type = user_type

    # Organization update
    organization_ids = data.get("organization_ids", None)

    if organization_ids is not None:
        if len(organization_ids) > 1:
            return jsonify({"error": "User can only belong to one organization"}), 400

        # Delete old membership
        OrganizationMember.query.filter_by(user_id=user.id).delete()

        if organization_ids:
            organization = Organization.query.get(organization_ids[0])
            if not organization:
                return jsonify({"error": "Invalid organization ID"}), 400

            db.session.add(
                OrganizationMember(
                    user_id=user.id,
                    organization_id=organization.id
                )
            )

    db.session.commit()
    return jsonify(user.to_dict()), 200


@user_bp.route("/<int:user_id>", methods=["DELETE"])
@login_required
@system_admin_required
def delete_user(user_id):
    """System Admin: Delete any user"""
    user = User.query.get_or_404(user_id)

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "User deleted successfully"}), 200


# ============ ORGANIZATION ADMIN FUNCTIONS ============
@user_bp.route("/organization/users", methods=["GET"])
@login_required
@organization_admin_required
def get_organization_users():
    """Organization Admin: Get all users from the same organization"""
    print(f"User ID from token: {g.user_id}")
    print(f"User object: {g.user}")
    
    current_user = User.query.get(g.user_id)
    print(f"Current user: {current_user.email if current_user else 'None'}")
    
    if not current_user.organizations:
        print("No organizations found for user")
        return jsonify({"error": "No organization found"}), 404
    
    org_id = current_user.organizations[0].id
    print(f"Organization ID: {org_id}")
    
    users = User.query.join(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id
    ).order_by(User.id.asc()).all()
    
    print(f"Found {len(users)} users in organization")
    return jsonify([user.to_dict() for user in users]), 200


@user_bp.route("/organization/users", methods=["POST"])
@login_required
@organization_admin_required
def create_organization_user():
    """Organization Admin: Create a user within their organization (always as Stakeholder)"""
    data = request.get_json() or {}
    current_user = User.query.get(g.user_id)
    
    if not current_user.organizations:
        return jsonify({"error": "No organization found"}), 404
    
    org_id = current_user.organizations[0].id
    organization = Organization.query.get(org_id)
    
    if not organization:
        return jsonify({"error": "Organization not found"}), 404
    
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    is_active = data.get("is_active", True)
    
    if not first_name or not last_name or not email:
        return jsonify({"error": "First name, last name, email are required"}), 400
    
    # Password is required for organization admin creating users
    if not password:
        return jsonify({"error": "Password is required"}), 400
    
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already exists"}), 409
    
    # Always create as Stakeholder for organization admins
    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        user_type="Stakeholder",  # Force Stakeholder role
        is_active=is_active,
    )
    
    user.set_password(password)
    
    db.session.add(user)
    db.session.flush()
    
    # Add to the admin's organization
    db.session.add(
        OrganizationMember(
            user_id=user.id,
            organization_id=org_id
        )
    )
    
    db.session.commit()
    
    # Send email with credentials
    send_user_credentials(
        email=email,
        password=password,
        full_name=f"{first_name} {last_name}"
    )
    
    return jsonify(user.to_dict()), 201


@user_bp.route("/organization/users/<int:user_id>", methods=["PUT"])
@login_required
@organization_admin_required
def update_organization_user(user_id):
    """Organization Admin: Update a user within their organization"""
    current_user = User.query.get(g.user_id)
    org_id = current_user.organizations[0].id
    
    # Check if user belongs to the same organization
    user = User.query.join(OrganizationMember).filter(
        User.id == user_id,
        OrganizationMember.organization_id == org_id
    ).first_or_404()
    
    data = request.get_json() or {}
    
    email = data.get("email", user.email).strip().lower()
    
    existing_user = User.query.filter(User.email == email, User.id != user.id).first()
    if existing_user:
        return jsonify({"error": "Email already exists"}), 409
    
    user.first_name = data.get("first_name", user.first_name).strip()
    user.last_name = data.get("last_name", user.last_name).strip()
    user.email = email
    user.is_active = data.get("is_active", user.is_active)
    
    # Update password if provided
    password = data.get("password", "")
    if password:
        user.set_password(password)
    
    db.session.commit()
    return jsonify(user.to_dict()), 200


@user_bp.route("/organization/users/<int:user_id>", methods=["DELETE"])
@login_required
@organization_admin_required
def delete_organization_user(user_id):
    """Organization Admin: Delete a user within their organization"""
    current_user = User.query.get(g.user_id)
    org_id = current_user.organizations[0].id
    
    # Check if user belongs to the same organization
    user = User.query.join(OrganizationMember).filter(
        User.id == user_id,
        OrganizationMember.organization_id == org_id
    ).first_or_404()
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        return jsonify({"error": "You cannot delete your own account"}), 400
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({"message": "User deleted successfully"}), 200


@user_bp.route("/organization/organizations", methods=["GET"])
@login_required
@organization_admin_required
def get_my_organizations():
    """Organization Admin: Get only the organization(s) the admin belongs to"""
    user = User.query.get(g.user_id)
    organizations = [org.to_dict() for org in user.organizations]
    return jsonify(organizations), 200


# ============ HELPER ENDPOINTS ============
@user_bp.route("/check-organization-admin", methods=["POST"])
@login_required
@system_admin_required
def check_organization_admin():
    """Check if organization already has an admin (for System Admin use)"""
    data = request.get_json()
    organization_id = data.get("organization_id")
    exclude_user_id = data.get("exclude_user_id")
    
    if not organization_id:
        return jsonify({"valid": True, "message": ""}), 200
    
    query = User.query.filter(
        User.user_type == "Organization Admin",
        User.organizations.any(Organization.id == organization_id),
        User.is_active == True
    )
    
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
    
    existing_admin = query.first()
    
    if existing_admin:
        return jsonify({
            "valid": False,
            "message": f"Organization already has an admin: {existing_admin.first_name} {existing_admin.last_name}"
        }), 200
    
    return jsonify({"valid": True, "message": ""}), 200