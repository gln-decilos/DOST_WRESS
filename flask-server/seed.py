from app import create_app
from app.extensions import db

from app.seeder.permission_seeder import seed_permissions
from app.seeder.document_template_seeder import seed_vision_scope_template
from app.seeder.document_template_seeder import seed_requirements_template
from app.seeder.roles_seeder import seed_roles
from app.seeder.users_seeder import seed_users_with_roles
from app.seeder.role_permissions_seeder import seed_role_permissions


def run_seeders():
    print("Seeding permissions...")
    seed_permissions()

    print("Seeding document templates...")
    seed_vision_scope_template()
    seed_requirements_template()
    

    print("Seeding roles...")
    seed_roles()
    
    print("Seeding users with roles...")
    seed_users_with_roles()

    print("Seeding roles permissions...")
    seed_role_permissions()

    print("Seeding completed successfully.")


if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        run_seeders()