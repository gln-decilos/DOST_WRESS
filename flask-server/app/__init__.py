from flask import Flask
from flask_cors import CORS
from app.extensions import db, migrate

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://wress_admin:postgres123!@localhost:5432/wress_db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = "dev-secret-key"

    db.init_app(app)
    migrate.init_app(app, db)

    from app.models.organization import Organization
    from app.models.role import Role
    from app.models.user import User

    from app.routes.auth_routes import auth_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.organization_routes import organization_bp
    from app.routes.role_routes import role_bp
    from app.routes.user_routes import user_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(organization_bp, url_prefix="/api/admin")
    app.register_blueprint(role_bp, url_prefix="/api/admin")
    app.register_blueprint(user_bp, url_prefix="/api/admin")

    return app