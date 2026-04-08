from app.extensions import db
from sqlalchemy.sql import func


class VisionScopeDocument(db.Model):
    __tablename__ = "vision_scope_documents"

    id = db.Column(db.Integer, primary_key=True)

    version = db.Column(db.String(50), nullable=False)

    background = db.Column(db.Text)
    business_opportunity = db.Column(db.Text)
    business_objectives = db.Column(db.Text)
    success_metrics = db.Column(db.Text)
    project_vision_statement = db.Column(db.Text)

    scope_and_limitations = db.Column(db.Text)
    stakeholders_profile = db.Column(db.Text)

    business_context = db.Column(db.Text)

    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id"),
        nullable=False
    )

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    project = db.relationship("Project", back_populates="vision_scope_documents")

    def to_dict(self):
        return {
            "id": self.id,
            "version": self.version,
            "background": self.background,
            "business_opportunity": self.business_opportunity,
            "business_objectives": self.business_objectives,
            "success_metrics": self.success_metrics,
            "project_vision_statement": self.project_vision_statement,
            "scope_and_limitations": self.scope_and_limitations,
            "stakeholders_profile": self.stakeholders_profile,
            "business_context": self.business_context,
            "project_id": self.project_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }