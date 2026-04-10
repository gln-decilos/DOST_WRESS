from app.extensions import db


class DocumentTemplateSection(db.Model):
    __tablename__ = "document_template_sections"

    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(
        db.Integer,
        db.ForeignKey("document_templates.id"),
        nullable=False
    )
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.String(255))
    sort_order = db.Column(db.Integer, default=1)
    is_collapsible = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    template = db.relationship("DocumentTemplate", back_populates="sections")
    fields = db.relationship(
        "DocumentTemplateField",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="DocumentTemplateField.sort_order.asc()"
    )

    def to_dict(self, include_fields=False):
        data = {
            "id": self.id,
            "template_id": self.template_id,
            "title": self.title,
            "description": self.description,
            "sort_order": self.sort_order,
            "is_collapsible": self.is_collapsible,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_fields:
            data["fields"] = [field.to_dict() for field in self.fields]

        return data