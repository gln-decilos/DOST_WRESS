from app.extensions import db


class RequirementComment(db.Model):
    __tablename__ = "requirement_comments"

    id = db.Column(db.Integer, primary_key=True)

    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id"),
        nullable=False
    )

    document_id = db.Column(
        db.Integer,
        db.ForeignKey("project_documents.id"),
        nullable=False
    )

    item_id = db.Column(
        db.Integer,
        db.ForeignKey("requirement_items.id"),
        nullable=False
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    comment_text = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    project = db.relationship("Project")
    document = db.relationship("ProjectDocument")
    item = db.relationship("RequirementItem")
    user = db.relationship("User")

    def to_dict(self):
        first_name = self.user.first_name if self.user else ""
        last_name = self.user.last_name if self.user else ""
        full_name = f"{first_name} {last_name}".strip()

        return {
            "id": self.id,
            "project_id": self.project_id,
            "document_id": self.document_id,
            "item_id": self.item_id,
            "user_id": self.user_id,
            "comment_text": self.comment_text,
            "user": {
                "id": self.user.id,
                "first_name": self.user.first_name,
                "last_name": self.user.last_name,
                "full_name": full_name,
                "email": self.user.email,
            } if self.user else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }