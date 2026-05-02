from app.extensions import db


class RequirementApproval(db.Model):
    __tablename__ = "requirement_approvals"

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

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    status = db.Column(db.String(50), nullable=False, default="Approved")
    rejection_reason = db.Column(db.Text, nullable=True)

    approved_at = db.Column(db.DateTime, nullable=True)
    rejected_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    project = db.relationship("Project")
    document = db.relationship("ProjectDocument")
    user = db.relationship("User")

    __table_args__ = (
        db.UniqueConstraint(
            "document_id",
            "user_id",
            name="uq_requirement_approval_document_user"
        ),
    )

    def to_dict(self):
        first_name = self.user.first_name if self.user else ""
        last_name = self.user.last_name if self.user else ""
        full_name = f"{first_name} {last_name}".strip()

        return {
            "id": self.id,
            "project_id": self.project_id,
            "document_id": self.document_id,
            "user_id": self.user_id,
            "status": self.status,
            "rejection_reason": self.rejection_reason,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "rejected_at": self.rejected_at.isoformat() if self.rejected_at else None,
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