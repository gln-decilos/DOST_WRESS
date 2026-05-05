from app import create_app
from app.extensions import db

from app.seeder.permission_seeder import seed_permissions
from app.seeder.organization_seeder import seed_organizations
from app.seeder.document_template_seeder import seed_vision_scope_template
from app.seeder.document_template_seeder import seed_requirements_template
from app.seeder.roles_seeder import seed_roles
from app.seeder.users_seeder import seed_users
from app.seeder.organization_member_seeder import seed_organization_members
from app.seeder.role_permissions_seeder import seed_role_permissions


def run_seeders():
    print("Seeding permissions...")
    seed_permissions()

    print("Seeding organizations...")
    seed_organizations()

    print("Seeding roles...")
    seed_roles()

    print("Seeding document templates...")
    seed_vision_scope_template()
    seed_requirements_template()
    
    print("Seeding users...")
    seed_users()

    print ("Seeding organization members...")
    seed_organization_members()

    print("Seeding roles permissions...")
    seed_role_permissions()

    print("Seeding completed successfully.")


if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        run_seeders()