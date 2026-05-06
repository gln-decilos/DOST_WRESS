from app.extensions import db
from app.models.user import User
from werkzeug.security import generate_password_hash


def seed_users():
    print("Seeding users...")

    users_data = [
        ("Admin", "User", "admin@wress.com", "System Admin"),
        ("Org", "Admin", "dost.org@wress.com", "Organization Admin"),
        ("Business", "Analyst", "ba@wress.com", "Stakeholder"),
        ("Product", "Owner", "po@wress.com", "Stakeholder"),
        ("Project", "Manager", "pm@wress.com", "Stakeholder"),
        ("Developer", "User", "dev@wress.com", "Stakeholder"),
        ("Tester", "User", "tester@wress.com", "Stakeholder"),
        ("Stakeholder", "User", "stakeholder@wress.com", "Stakeholder"),
    ]

    created = 0
    skipped = 0

    for first_name, last_name, email, user_type in users_data:

        existing = User.query.filter_by(email=email).first()

        if existing:
            skipped += 1
            continue

        db.session.add(User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password_hash=generate_password_hash("Password123!"),
            is_active=True,
            user_type=user_type
        ))

        created += 1

    db.session.commit()

    print("Users seeded successfully.")
    print(f"Created: {created}")
    print(f"Skipped: {skipped}")