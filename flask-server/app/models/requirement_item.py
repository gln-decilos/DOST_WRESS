from app.extensions import db


class RequirementItem(db.Model):
    __tablename__ = "requirement_items"

    id = db.Column(db.Integer, primary_key=True)
    project_document_id = db.Column(
        db.Integer,
        db.ForeignKey("project_documents.id"),
        nullable=False
    )

    sort_order = db.Column(db.Integer, nullable=False, default=1)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    document = db.relationship("ProjectDocument", back_populates="requirement_items")

    values = db.relationship(
        "RequirementItemValue",
        back_populates="item",
        cascade="all, delete-orphan"
    )

    def to_dict(self, include_values=False):
        data = {
            "id": self.id,
            "project_document_id": self.project_document_id,
            "sort_order": self.sort_order,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_values:
            data["values"] = [value.to_dict() for value in self.values]

        return data