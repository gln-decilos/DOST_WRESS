from app.extensions import db
from app.models.user import User
from app.models.role import Role
from app.models.user_roles import UserRole
from werkzeug.security import generate_password_hash


def seed_users_with_roles():
    print("Seeding users and user_roles...")

    users_data = [
        ("Admin", "User", "admin@wress.com", "System Admin", "System Admin"),
        ("Org", "Admin", "org@wress.com", "Organization Admin", "Organization Admin"),
        ("Business", "Analyst", "ba@wress.com", "Business Analyst", "Stakeholder"),
        ("Product", "Owner", "po@wress.com", "Product Owner", "Stakeholder"),
        ("Project", "Manager", "pm@wress.com", "Project Manager", "Stakeholder"),
        ("Developer", "User", "dev@wress.com", "Developer", "Stakeholder"),
        ("Tester", "User", "tester@wress.com", "Tester", "Stakeholder"),
        ("Stakeholder", "User", "stakeholder@wress.com", "Stakeholder", "Stakeholder"),
    ]

    created_users = 0
    created_links = 0
    skipped_users = 0
    skipped_links = 0

    for first_name, last_name, email, role_name, user_type in users_data:

        user = User.query.filter_by(email=email).first()

        if not user:
            user = User(
                first_name=first_name,
                last_name=last_name,
                email=email,
                password_hash=generate_password_hash("Password123!"),
                is_active=True,
                user_type=user_type
            )
            db.session.add(user)
            db.session.flush()
            created_users += 1
        else:
            skipped_users += 1

        role = Role.query.filter_by(name=role_name).first()

        if not role:
            print(f"Missing role: {role_name}")
            continue

        existing_link = UserRole.query.filter_by(
            user_id=user.id,
            role_id=role.id
        ).first()

        if not existing_link:
            db.session.add(UserRole(
                user_id=user.id,
                role_id=role.id
            ))
            created_links += 1
        else:
            skipped_links += 1

    db.session.commit()

    print("Users and roles seeded successfully.")
    print(f"Users created: {created_users}")
    print(f"Users skipped: {skipped_users}")
    print(f"Links created: {created_links}")
    print(f"Links skipped: {skipped_links}")