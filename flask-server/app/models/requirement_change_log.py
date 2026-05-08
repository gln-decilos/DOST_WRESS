import json

from app.extensions import db


class RequirementChangeLog(db.Model):
    __tablename__ = "requirement_change_logs"

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

    action = db.Column(db.String(80), nullable=False)
    description = db.Column(db.Text, nullable=True)
    before_snapshot = db.Column(db.Text, nullable=True)
    after_snapshot = db.Column(db.Text, nullable=True)

    changed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now())

    project = db.relationship("Project")
    document = db.relationship("ProjectDocument")
    requirement_item = db.relationship("RequirementItem")
    user = db.relationship("User")

    def _parse_json(self, value):
        if not value:
            return None

        try:
            return json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return None

    def to_dict(self):
        first_name = self.user.first_name if self.user else ""
        last_name = self.user.last_name if self.user else ""
        full_name = f"{first_name} {last_name}".strip()

        return {
            "id": self.id,
            "project_id": self.project_id,
            "document_id": self.document_id,
            "item_id": self.item_id,
            "action": self.action,
            "description": self.description,
            "before_snapshot": self._parse_json(self.before_snapshot),
            "after_snapshot": self._parse_json(self.after_snapshot),
            "changed_by": self.changed_by,
            "user": {
                "id": self.user.id,
                "first_name": self.user.first_name,
                "last_name": self.user.last_name,
                "full_name": full_name or self.user.email,
                "email": self.user.email,
            } if self.user else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
