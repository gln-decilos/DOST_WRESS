"""Add reset password token table

Revision ID: e767bd7b71ae
Revises: d383d877ebcc
Create Date: 2026-05-06 13:48:08.351550

"""
from alembic import op
import sqlalchemy as sa


revision = "e767bd7b71ae"
down_revision = "d383d877ebcc"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "password_reset_token",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token", name="uq_password_reset_token_token"),
    )


def downgrade():
    op.drop_table("password_reset_token")