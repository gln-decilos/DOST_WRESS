from app.extensions import db


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    is_system = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    user_roles = db.relationship(
        "UserRole",
        back_populates="role",
        cascade="all, delete-orphan"
    )

    role_permissions = db.relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan"
    )

    @property
    def permissions(self):
        return [role_permission.permission for role_permission in self.role_permissions]

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "is_system": self.is_system,
            "permissions": [
                {
                    "id": permission.id,
                    "key": permission.key,
                    "label": permission.label,
                    "module": permission.module,
                    "description": permission.description
                } for permission in self.permissions
            ],
            "permission_ids": [permission.id for permission in self.permissions],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }