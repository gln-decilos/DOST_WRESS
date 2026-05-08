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

    item_id = db.Column(
        db.Integer,
        db.ForeignKey("requirement_items.id", ondelete="CASCADE"),
        nullable=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    status = db.Column(db.String(50), nullable=False, default="Pending")
    rejection_reason = db.Column(db.Text, nullable=True)

    review_requested_at = db.Column(db.DateTime, nullable=True)
    review_due_at = db.Column(db.DateTime, nullable=True)
    requested_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    approved_at = db.Column(db.DateTime, nullable=True)
    rejected_at = db.Column(db.DateTime, nullable=True)
    auto_approved_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    project = db.relationship("Project")
    document = db.relationship("ProjectDocument")
    requirement_item = db.relationship("RequirementItem")
    user = db.relationship("User", foreign_keys=[user_id])
    requester = db.relationship("User", foreign_keys=[requested_by])

    __table_args__ = (
        db.UniqueConstraint(
            "item_id",
            "user_id",
            name="uq_requirement_approval_item_user"
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
            "item_id": self.item_id,
            "user_id": self.user_id,
            "status": self.status,
            "rejection_reason": self.rejection_reason,
            "review_requested_at": self.review_requested_at.isoformat() if self.review_requested_at else None,
            "review_due_at": self.review_due_at.isoformat() if self.review_due_at else None,
            "requested_by": self.requested_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "rejected_at": self.rejected_at.isoformat() if self.rejected_at else None,
            "auto_approved_at": self.auto_approved_at.isoformat() if self.auto_approved_at else None,
            "user": {
                "id": self.user.id,
                "first_name": self.user.first_name,
                "last_name": self.user.last_name,
                "full_name": full_name or self.user.email,
                "email": self.user.email,
            } if self.user else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
