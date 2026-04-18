from app.extensions import db


class RequirementItemValue(db.Model):
    __tablename__ = "requirement_item_values"

    id = db.Column(db.Integer, primary_key=True)

    item_id = db.Column(
        db.Integer,
        db.ForeignKey("requirement_items.id"),
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

    item = db.relationship("RequirementItem", back_populates="values")

    def to_dict(self):
        return {
            "id": self.id,
            "item_id": self.item_id,
            "template_field_id": self.template_field_id,
            "value_text": self.value_text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }