from app.extensions import db


class DocumentTemplateField(db.Model):
    __tablename__ = "document_template_fields"

    id = db.Column(db.Integer, primary_key=True)
    section_id = db.Column(
        db.Integer,
        db.ForeignKey("document_template_sections.id"),
        nullable=False
    )

    key = db.Column(db.String(100), nullable=False)
    label = db.Column(db.String(150), nullable=False)
    field_type = db.Column(db.String(50), nullable=False, default="textarea")
    placeholder = db.Column(db.String(255))
    help_text = db.Column(db.String(255))
    default_value = db.Column(db.Text)
    options_json = db.Column(db.Text)  # for select/radio/checkbox options
    is_required = db.Column(db.Boolean, default=False)
    sort_order = db.Column(db.Integer, default=1)

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    section = db.relationship("DocumentTemplateSection", back_populates="fields")

    def to_dict(self):
        return {
            "id": self.id,
            "section_id": self.section_id,
            "key": self.key,
            "label": self.label,
            "field_type": self.field_type,
            "placeholder": self.placeholder,
            "help_text": self.help_text,
            "default_value": self.default_value,
            "options_json": self.options_json,
            "is_required": self.is_required,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }