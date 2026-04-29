from app.extensions import db


class ProjectStakeholder(db.Model):
    __tablename__ = "project_stakeholders"

    id = db.Column(db.Integer, primary_key=True)

    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id"),
        nullable=False
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    added_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    status = db.Column(db.String(50), nullable=False, default="Active")

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    project = db.relationship("Project")

    user = db.relationship(
        "User",
        foreign_keys=[user_id]
    )

    added_by_user = db.relationship(
        "User",
        foreign_keys=[added_by]
    )

    __table_args__ = (
        db.UniqueConstraint(
            "project_id",
            "user_id",
            name="uq_project_stakeholder"
        ),
    )

    @property
    def roles(self):
        if not self.user:
            return []

        return [
            user_role.role
            for user_role in self.user.user_roles
            if user_role.project_id == self.project_id and user_role.role
        ]

    def to_dict(self, include_roles=True):
        data = {
            "id": self.id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "added_by": self.added_by,
            "status": self.status,
            "user": {
                "id": self.user.id,
                "first_name": self.user.first_name,
                "last_name": self.user.last_name,
                "full_name": f"{self.user.first_name} {self.user.last_name}",
                "email": self.user.email,
                "is_active": self.user.is_active,
            } if self.user else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_roles:
            data["roles"] = [
                {
                    "id": role.id,
                    "name": role.name,
                    "description": role.description,
                }
                for role in self.roles
            ]
            data["role_ids"] = [role.id for role in self.roles]

        return data