from app.extensions import db


class DocumentTemplate(db.Model):
    __tablename__ = "document_templates"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(100), unique=True, nullable=False)
    module = db.Column(db.String(100), nullable=False)  # e.g. vision_scope
    description = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    is_default = db.Column(db.Boolean, default=False)

    organization_id = db.Column(
        db.Integer,
        db.ForeignKey("organizations.id"),
        nullable=True
    )

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    sections = db.relationship(
        "DocumentTemplateSection",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="DocumentTemplateSection.sort_order.asc()"
    )

    def to_dict(self, include_sections=False):
        data = {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "module": self.module,
            "description": self.description,
            "is_active": self.is_active,
            "is_default": self.is_default,
            "organization_id": self.organization_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_sections:
            data["sections"] = [section.to_dict(include_fields=True) for section in self.sections]

        return data