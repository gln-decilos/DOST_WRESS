from app.extensions import db


class ProjectDocument(db.Model):
    __tablename__ = "project_documents"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey("document_templates.id"), nullable=False)

    version = db.Column(db.String(50), nullable=False, default="v1.0")
    status = db.Column(db.String(50), nullable=False, default="Draft")

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    values = db.relationship(
        "ProjectDocumentValue",
        back_populates="document",
        cascade="all, delete-orphan"
    )

    def to_dict(self, include_values=False):
        data = {
            "id": self.id,
            "project_id": self.project_id,
            "template_id": self.template_id,
            "version": self.version,
            "status": self.status,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_values:
            data["values"] = [value.to_dict() for value in self.values]

        return data