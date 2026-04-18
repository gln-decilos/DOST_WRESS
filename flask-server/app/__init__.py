from flask import Flask
from flask_cors import CORS
from app.extensions import db, migrate, mail
from flask_jwt_extended import JWTManager


def create_app():
    app = Flask(__name__)

    # CONFIG
    app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://wress_admin:postgres123!@localhost:5432/wress_db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = "dev-secret-key"

    # SESSION / COOKIE
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = False

    app.config["MAIL_SERVER"] = "smtp.gmail.com"
    app.config["MAIL_PORT"] = 587
    app.config["MAIL_USE_TLS"] = True
    app.config["MAIL_USERNAME"] = "libraryservices.nasugbu@gmail.com"
    app.config["MAIL_PASSWORD"] = "knvyqygysjcueazz"
    app.config["MAIL_DEFAULT_SENDER"] = app.config["MAIL_USERNAME"]

    app.config["JWT_SECRET_KEY"] = "dev-jwt-secret-key"
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_HEADER_NAME"] = "Authorization"
    app.config["JWT_HEADER_TYPE"] = "Bearer"

    # CORS - Updated to include all necessary routes
    CORS(
        app,
        supports_credentials=True,
        resources={
            r"/api/*": {
                "origins": [
                    "http://127.0.0.1:3000",
                    "http://localhost:3000",
                    "http://localhost:3001",
                ],
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "expose_headers": ["Content-Type", "Authorization"],
            }
        },
    )

    # EXTENSIONS
    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)

    jwt = JWTManager()
    jwt.init_app(app)
    
    # MODELS
    from app.models.organization import Organization
    from app.models.organization_member import OrganizationMember
    from app.models.project import Project
    from app.models.user import User
    from app.models.role import Role
    from app.models.permission import Permission
    from app.models.user_roles import UserRole
    from app.models.role_permissions import RolePermission

    from app.models.document_templates import DocumentTemplate
    from app.models.document_template_section import DocumentTemplateSection
    from app.models.document_template_field import DocumentTemplateField

    from app.models.project_document import ProjectDocument
    from app.models.project_document_value import ProjectDocumentValue

    from app.models.requirement_item import RequirementItem
    from app.models.requirement_item_value import RequirementItemValue

    # ROUTES
    from app.routes.auth_routes import auth_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.organization_routes import organization_bp
    from app.routes.user_routes import user_bp
    from app.routes.role_routes import role_bp
    from app.routes.permission_routes import permission_bp
    from app.routes.access_routes import access_bp

    from app.routes.business_analyst.project_routes import business_project_bp
    from app.routes.template_routes import template_bp
    from app.routes.vision_scope_routes import vision_scope_bp
    from app.routes.requirements_routes import requirements_bp

    from app.routes.admin_template_routes import admin_template_bp
    from app.routes.admin_template_section_routes import admin_template_section_bp
    from app.routes.admin_template_field_routes import admin_template_field_bp

    # BLUEPRINT REGISTRATION
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(organization_bp, url_prefix="/api/admin/organizations")
    # FIXED: Register user_bp with /api/users prefix (not /api/admin/users)
    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(role_bp, url_prefix="/api/admin/roles")
    app.register_blueprint(permission_bp, url_prefix="/api/admin/permissions")
    app.register_blueprint(access_bp, url_prefix="/api/access")

    app.register_blueprint(business_project_bp, url_prefix="/api/business-analyst")
    app.register_blueprint(template_bp, url_prefix="/api/templates")
    app.register_blueprint(vision_scope_bp, url_prefix="/api/business-analyst")
    app.register_blueprint(requirements_bp, url_prefix="/api/business-analyst")

    app.register_blueprint(admin_template_bp)
    app.register_blueprint(admin_template_section_bp)
    app.register_blueprint(admin_template_field_bp)

    return app