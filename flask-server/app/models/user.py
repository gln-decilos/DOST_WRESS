from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = "users"

    USER_TYPES = ("System Admin", "Organization Admin", "Stakeholder")

    id = db.Column(db.Integer, primary_key=True)

    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)

    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    is_active = db.Column(db.Boolean, default=True)

    user_type = db.Column(db.String(50), nullable=False, default="Stakeholder")

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    organization_memberships = db.relationship(
        "OrganizationMember",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    user_roles = db.relationship(
        "UserRole",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    # ✅ NEW: validate user_type
    def set_user_type(self, user_type):
        if user_type not in self.USER_TYPES:
            raise ValueError(f"Invalid user_type: {user_type}")
        self.user_type = user_type

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def organizations(self):
        return [membership.organization for membership in self.organization_memberships]

    @property
    def roles(self):
        return [user_role.role for user_role in self.user_roles]

    @property
    def permissions(self):
        permission_map = {}

        for role in self.roles:
            for role_permission in role.role_permissions:
                permission = role_permission.permission
                permission_map[permission.key] = permission

        return list(permission_map.values())

    @property
    def permission_keys(self):
        return sorted([permission.key for permission in self.permissions])

    def has_permission(self, permission_key):
        return permission_key in self.permission_keys

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": f"{self.first_name} {self.last_name}",
            "email": self.email,
            "user_type": self.user_type, 
            "organizations": [
                {
                    "id": org.id,
                    "name": org.name
                } for org in self.organizations
            ],
            "roles": [
                {
                    "id": role.id,
                    "name": role.name,
                    "description": role.description
                } for role in self.roles
            ],
            "permissions": [
                {
                    "id": permission.id,
                    "key": permission.key,
                    "label": permission.label,
                    "module": permission.module,
                    "description": permission.description
                } for permission in self.permissions
            ],
            "permission_keys": self.permission_keys,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }