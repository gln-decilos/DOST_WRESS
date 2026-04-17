from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "5f76725e0195"
down_revision = "12176ade09ea"
branch_labels = None
depends_on = None


def upgrade():
    # Drop old dependent tables first if they still exist
    op.execute("DROP TABLE IF EXISTS project_document_item_values CASCADE")
    op.execute("DROP TABLE IF EXISTS project_document_items CASCADE")

    # Drop FK dependency from project_documents -> requirement_documents
    op.execute("""
        ALTER TABLE project_documents
        DROP CONSTRAINT IF EXISTS project_documents_requirement_document_id_fkey
    """)

    # Drop old column if it still exists
    op.execute("""
        ALTER TABLE project_documents
        DROP COLUMN IF EXISTS requirement_document_id
    """)

    # Now requirement_documents can be dropped safely
    op.execute("DROP TABLE IF EXISTS requirement_documents CASCADE")

    # Create new requirement_items table
    op.create_table(
        "requirement_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_document_id", sa.Integer(), nullable=False),
        sa.Column("requirement_code", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=50), nullable=False, server_default="Medium"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="Draft"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["project_document_id"], ["project_documents.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("requirement_items")

    op.create_table(
        "requirement_documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("template_id", sa.Integer(), nullable=True),
        sa.Column("version", sa.String(length=50), nullable=False, server_default="1.0"),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="Draft"),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["document_templates.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column(
        "project_documents",
        sa.Column("requirement_document_id", sa.Integer(), nullable=True)
    )

    op.create_foreign_key(
        "project_documents_requirement_document_id_fkey",
        "project_documents",
        "requirement_documents",
        ["requirement_document_id"],
        ["id"]
    )