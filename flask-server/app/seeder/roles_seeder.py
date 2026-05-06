from app.extensions import db
from app.models.role import Role


def seed_roles():
    print("Seeding default roles for DOST-ASTI...")

    organization_id = 1

    default_roles = [
        ("Business Analyst", "Manages requirements elicitation, analysis, and specification"),
        ("Product Owner", "Defines priorities and approves scope"),
        ("Project Manager", "Monitors scope, schedule, and risks"),
        ("Developer", "Implements requirements and provides technical feedback"),
        ("Tester", "Validates requirements and derives test cases"),
        ("Stakeholder", "Read-only access for review and approval"),
    ]

    created = 0
    skipped = 0

    for name, description in default_roles:

        existing = Role.query.filter_by(
            name=name,
            organization_id=organization_id
        ).first()

        if existing:
            skipped += 1
            continue

        db.session.add(Role(
            name=name,
            description=description,
            organization_id=organization_id,
            is_system=True
        ))

        created += 1

    db.session.commit()

    print("Default roles seeded successfully for DOST-ASTI.")
    print(f"Created: {created}")
    print(f"Skipped: {skipped}")