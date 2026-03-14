from app import create_app
from app.extensions import db
from app.models.role import Role

default_roles = [
    ("Administrator", "Full administrative access"),
    ("Business Analyst", "Manages requirements elicitation, analysis, and specification"),
    ("Product Owner", "Defines priorities and approves scope"),
    ("Project Manager", "Monitors scope, schedule, and risks"),
    ("Developer", "Implements requirements and provides technical feedback"),
    ("Tester", "Validates requirements and derives test cases"),
    ("Stakeholder", "Read-only access for review and approval"),
]

app = create_app()

with app.app_context():
    for name, description in default_roles:
        existing = Role.query.filter_by(name=name).first()
        if not existing:
            db.session.add(Role(name=name, description=description))

    db.session.commit()
    print("Default roles seeded successfully.")