from app.extensions import db
from app.models.user import User
from app.models.organization_member import OrganizationMember


def seed_organization_members():
    print("Seeding organization members...")

    organization_id = 1

    system_admin_email = "admin@wress.com"

    users = User.query.filter(User.email != system_admin_email).all()

    created = 0
    skipped = 0

    for user in users:

        existing = OrganizationMember.query.filter_by(
            user_id=user.id,
            organization_id=organization_id
        ).first()

        if existing:
            skipped += 1
            continue

        db.session.add(OrganizationMember(
            user_id=user.id,
            organization_id=organization_id
        ))

        created += 1

    db.session.commit()

    print("Organization members seeded successfully.")
    print(f"Created: {created}")
    print(f"Skipped: {skipped}")