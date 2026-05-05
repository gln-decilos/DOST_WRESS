from app.extensions import db
from app.models.organization import Organization


def seed_organizations():
    print("Seeding default organizations...")

    orgs = [
        ("DOST-ASTI", "asti@example.com", "Basic"),
        ("DOST-STII", "stii@example.com", "Standard"),
        ("BatStateU", "batstateu@example.com", "Premium"),
        ("DOST-ITDI", "itdi@example.com", "Standard"),
        ("DOST-PCAARRD", "pcaarrd@example.com", "Standard"),
        ("NEDA", "neda@example.com", "Enterprise"),
        ("UP Diliman", "updiliman@example.com", "Premium"),
        ("Mapúa University", "mapua@example.com", "Premium"),
        ("UST", "ust@example.com", "Premium"),
        ("De La Salle University", "dlsu@example.com", "Premium"),
        ("Ateneo de Manila University", "admu@example.com", "Premium"),
        ("Philippine Science High School System", "pshs@example.com", "Standard"),
        ("SEI-DOST", "sei@example.com", "Standard"),
        ("Google PH Research", "googleph@example.com", "Enterprise"),
        ("Microsoft Philippines", "msph@example.com", "Enterprise"),
        ("AWS Educate PH", "awsph@example.com", "Enterprise"),
        ("USTP", "ustp@example.com", "Standard"),
        ("Mindanao State University", "msu@example.com", "Standard"),
    ]

    created = 0
    skipped = 0

    for name, email, plan in orgs:
        existing = Organization.query.filter_by(name=name).first()

        if existing:
            skipped += 1
            continue

        db.session.add(Organization(
            name=name,
            contact_email=email,
            subscription_plan=plan
        ))
        created += 1

    db.session.commit()

    print("Organizations seeded successfully.")
    print(f"Created: {created}")
    print(f"Skipped: {skipped}")