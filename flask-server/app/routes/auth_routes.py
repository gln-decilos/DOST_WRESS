from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models.user import User
from functools import wraps
import jwt
import os
from datetime import datetime, timedelta

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production-make-it-at-least-32-characters-long')
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