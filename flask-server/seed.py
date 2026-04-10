from app import create_app
from app.extensions import db

from app.seeder.permission_seeder import seed_permissions
from app.seeder.document_template_seeder import seed_vision_scope_template


def run_seeders():
    print("Seeding permissions...")
    seed_permissions()

    print("Seeding document templates...")
    seed_vision_scope_template()

    print("Seeding completed successfully.")


if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        run_seeders()