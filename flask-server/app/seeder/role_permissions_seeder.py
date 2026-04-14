from app.extensions import db
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permissions import RolePermission


def seed_role_permissions():
    print("Seeding role permissions...")

    admin_role = Role.query.filter_by(name="System Admin").first()

    if not admin_role:
        print("Administrator role not found. Run role seeder first.")
        return

    permissions = Permission.query.all()

    created = 0
    skipped = 0

    for permission in permissions:
        existing = RolePermission.query.filter_by(
            role_id=admin_role.id,
            permission_id=permission.id
        ).first()

        if existing:
            skipped += 1
            continue

        db.session.add(RolePermission(
            role_id=admin_role.id,
            permission_id=permission.id
        ))
        created += 1

    db.session.commit()

    print("Role permissions seeded successfully.")
    print(f"Created: {created}")
    print(f"Skipped: {skipped}")