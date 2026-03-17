from app.extensions import db
from sqlalchemy.sql import func

class Organization(db.Model):
    __tablename__ = "organizations"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, unique=True)
    logo = db.Column(db.Text)
    contact_email = db.Column(db.String(255))
    subscription_plan = db.Column(db.String(100), nullable=False, default="Basic")
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    organization_members = db.relationship(
        "OrganizationMember",
        back_populates="organization",
        cascade="all, delete-orphan"
    )

    projects = db.relationship(
        "Project",
        back_populates="organization",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "logo": self.logo,
            "contact_email": self.contact_email,
            "subscription_plan": self.subscription_plan,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }