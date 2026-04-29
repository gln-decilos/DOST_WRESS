from app.extensions import db


class UserRole(db.Model):
    __tablename__ = "user_roles"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)

    created_at = db.Column(db.DateTime, server_default=db.func.now())

    project = db.relationship("Project", backref="user_roles") 
    user = db.relationship("User", back_populates="user_roles")
    role = db.relationship("Role", back_populates="user_roles")
    project = db.relationship("Project")

    __table_args__ = (
        db.UniqueConstraint("user_id", "role_id", "project_id", name="uq_user_role_project"),
    )