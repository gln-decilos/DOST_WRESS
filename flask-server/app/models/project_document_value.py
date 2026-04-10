from app.extensions import db


class ProjectDocumentValue(db.Model):
    __tablename__ = "project_document_values"

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(
        db.Integer,
        db.ForeignKey("project_documents.id"),
        nullable=False
    )
    template_field_id = db.Column(
        db.Integer,
        db.ForeignKey("document_template_fields.id"),
        nullable=False
    )
    value_text = db.Column(db.Text)

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    document = db.relationship("ProjectDocument", back_populates="values")

    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "template_field_id": self.template_field_id,
            "value_text": self.value_text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }