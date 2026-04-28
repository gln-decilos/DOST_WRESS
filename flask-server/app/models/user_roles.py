from app.extensions import db


class UserRole(db.Model):
    __tablename__ = "user_roles"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    role_id = db.Column(
        db.Integer,
        db.ForeignKey("roles.id"),
        nullable=False
    )

    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id"),
        nullable=True
    )

    created_at = db.Column(db.DateTime, server_default=db.func.now())

    user = db.relationship("User", back_populates="user_roles")
    role = db.relationship("Role", back_populates="user_roles")
    project = db.relationship("Project")

    __table_args__ = (
        db.UniqueConstraint(
            "user_id",
            "project_id",
            "role_id",
            name="uq_user_project_role"
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role_id": self.role_id,
            "project_id": self.project_id,
            "role": {
                "id": self.role.id,
                "name": self.role.name,
                "description": self.role.description,
            } if self.role else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }