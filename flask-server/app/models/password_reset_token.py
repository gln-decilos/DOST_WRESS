from app.extensions import db
from datetime import datetime

class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_token"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    token = db.Column(db.String(500), nullable=False, unique=True)

    expires_at = db.Column(db.DateTime, nullable=False)

    used = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, server_default=db.func.now())

    user = db.relationship("User", back_populates="password_reset_token")