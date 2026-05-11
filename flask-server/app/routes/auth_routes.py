from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models.user import User
from functools import wraps
from app.models.password_reset_token import PasswordResetToken
from app.utils.email import send_password_reset_email
import jwt
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
import secrets

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'xK9mP2nQ5rS8tU1vW3yZ4aB6cD7eF0gH2jK5lN7pR9sT2uV4wX6yZ8aB1cD3eF5gH7jK9lN1pR3sT5uV7wX9z')
JWT_EXPIRATION_HOURS = 24

def generate_token(user_id):
    """Generate JWT token for user"""
    expiration = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'exp': expiration,
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')
    return token

def login_required(f):
    """Decorator to require authentication for routes"""
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


@auth_bp.route("/signin", methods=["POST"])
def signin():
    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "User account is inactive"}), 403

    token = generate_token(user.id)

    return jsonify({
        "message": "Sign in successful",
        "token": token,
        "user": user.to_dict()
    }), 200

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "If email exists, reset link sent"}), 200

    token = secrets.token_urlsafe(64)
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    reset_entry = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )

    db.session.add(reset_entry)
    db.session.commit()

    reset_link = f"http://localhost:3000/reset-password?token={token}"
    send_password_reset_email(
    email=user.email,
    full_name=f"{user.first_name} {user.last_name}",
    reset_link=reset_link
)

    return jsonify({"message": "If email exists, reset link sent"}), 200

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}

    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return jsonify({"error": "Token and new password required"}), 400

    reset_entry = PasswordResetToken.query.filter_by(
        token=token,
        used=False
    ).first()

    if not reset_entry:
        return jsonify({"error": "Invalid or used token"}), 400

    if reset_entry.expires_at < datetime.utcnow():
        return jsonify({"error": "Token expired"}), 400

    user = User.query.get(reset_entry.user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    user.password_hash = generate_password_hash(new_password)

    reset_entry.used = True

    db.session.commit()

    return jsonify({"message": "Password updated successfully"}), 200
    
@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    """Get current authenticated user info"""
    user = User.query.get(g.user_id)
    return jsonify(user.to_dict()), 200


@auth_bp.route("/signout", methods=["POST"])
def signout():
    """Sign out user (client-side token removal required)"""
    return jsonify({"message": "Signed out successfully"}), 200


@auth_bp.route("/verify-token", methods=["GET"])
@login_required
def verify_token():
    """Verify if token is still valid"""
    return jsonify({"valid": True, "user": g.user.to_dict()}), 200