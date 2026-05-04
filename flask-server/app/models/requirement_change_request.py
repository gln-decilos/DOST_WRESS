import json

from app.extensions import db


class RequirementChangeRequest(db.Model):
    __tablename__ = "requirement_change_requests"

    id = db.Column(db.Integer, primary_key=True)

    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    document_id = db.Column(
        db.Integer,
        db.ForeignKey("project_documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_id = db.Column(
        db.Integer,
        db.ForeignKey("requirement_items.id", ondelete="CASCADE"),
        nullable=False,
    )

    status = db.Column(db.String(50), nullable=False, default="Draft")

    requested_by_name = db.Column(db.String(255), nullable=False)
    requested_date = db.Column(db.Date, nullable=True)
    change_type = db.Column(db.String(80), nullable=False, default="Modify")
    priority = db.Column(db.String(50), nullable=False, default="Medium")

    intended_change = db.Column(db.Text, nullable=False)
    reason = db.Column(db.Text, nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    current_requirement_snapshot = db.Column(db.Text, nullable=True)

    stakeholder_form_filename = db.Column(db.String(255), nullable=True)
    stakeholder_form_path = db.Column(db.String(500), nullable=True)
    stakeholder_form_mime_type = db.Column(db.String(120), nullable=True)
    stakeholder_form_size = db.Column(db.Integer, nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    submitted_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )

    project = db.relationship("Project")
    document = db.relationship("ProjectDocument")
    requirement_item = db.relationship("RequirementItem")
    creator = db.relationship("User", foreign_keys=[created_by])
    submitter = db.relationship("User", foreign_keys=[submitted_by])

    def get_snapshot(self):
        if not self.current_requirement_snapshot:
            return None

        try:
            return json.loads(self.current_requirement_snapshot)
        except (TypeError, json.JSONDecodeError):
            return None

    def to_dict(self, include_snapshot=True):
        data = {
            "id": self.id,
            "project_id": self.project_id,
            "document_id": self.document_id,
            "item_id": self.item_id,
            "status": self.status,
            "requested_by_name": self.requested_by_name,
            "requested_date": self.requested_date.isoformat() if self.requested_date else None,
            "change_type": self.change_type,
            "priority": self.priority,
            "intended_change": self.intended_change,
            "reason": self.reason,
            "remarks": self.remarks,
            "stakeholder_form_filename": self.stakeholder_form_filename,
            "stakeholder_form_path": self.stakeholder_form_path,
            "stakeholder_form_mime_type": self.stakeholder_form_mime_type,
            "stakeholder_form_size": self.stakeholder_form_size,
            "created_by": self.created_by,
            "submitted_by": self.submitted_by,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_snapshot:
            data["current_requirement_snapshot"] = self.get_snapshot()

        return data