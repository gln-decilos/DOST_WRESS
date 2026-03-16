from app.extensions import db

class OrganizationMember(db.Model):
    __tablename__ = "organization_members"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=False)

    user = db.relationship("User", back_populates="organization_memberships")
    organization = db.relationship("Organization", back_populates="organization_members")