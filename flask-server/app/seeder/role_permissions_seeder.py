from app.extensions import db
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permissions import RolePermission


ROLE_PERMISSION_MAP = {
    "Project Manager": [
        "dashboard.view",
        "project.view",
        "project.edit",
        "project_members.view",
        "project_members.manage",
        "vision_scope.view",
        "vision_scope.create",
        "vision_scope.edit",
        "vision_scope.delete",
        "requirements.view",
        "requirements.create",
        "requirements.edit",
        "requirements.delete",
        "requirements.submit_approval",
        "requirements.approve",
        "requirements.reject",
        "requirements.freeze",
        "requirements.comment",
        "requirements.request_change",
        "notifications.view",
    ],
    "Business Analyst": [
        "dashboard.view",
        "project.view",
        "project_members.view",
        "vision_scope.view",
        "vision_scope.create",
        "vision_scope.edit",
        "vision_scope.delete",
        "requirements.view",
        "requirements.create",
        "requirements.edit",
        "requirements.delete",
        "requirements.submit_approval",
        "requirements.freeze",
        "requirements.comment",
        "requirements.request_change",
        "notifications.view",
    ],
    "Developer": [
        "dashboard.view",
        "project.view",
        "project_members.view",
        "vision_scope.view",
        "requirements.view",
        "requirements.approve",
        "requirements.reject",
        "requirements.comment",
        "notifications.view",
    ],
    "Tester": [
        "dashboard.view",
        "project.view",
        "project_members.view",
        "vision_scope.view",
        "requirements.view",
        "requirements.approve",
        "requirements.reject",
        "requirements.comment",
        "notifications.view",
    ],
    "Stakeholder": [
        "dashboard.view",
        "project.view",
        "project_members.view",
        "vision_scope.view",
        "requirements.view",
        "requirements.approve",
        "requirements.reject",
        "requirements.comment",
        "notifications.view",
    ],
}


def get_permission_ids(permission_keys):
    permissions = Permission.query.filter(
        Permission.key.in_(permission_keys)
    ).all()

    return {p.key: p.id for p in permissions}


def create_role_permission(role_id, permission_id):
    existing = RolePermission.query.filter_by(
        role_id=role_id,
        permission_id=permission_id
    ).first()

    if existing:
        return False

    db.session.add(RolePermission(
        role_id=role_id,
        permission_id=permission_id
    ))
    return True


def seed_role_permissions():
    print("Seeding role permissions...")

    organization_id = 1

    created_count = 0
    skipped_count = 0
    missing_roles = []
    missing_permissions = []

    for role_name, permission_keys in ROLE_PERMISSION_MAP.items():

        role = Role.query.filter_by(
            name=role_name,
            organization_id=organization_id
        ).first()

        if not role:
            missing_roles.append(role_name)
            continue

        permission_map = get_permission_ids(permission_keys)

        for key in permission_keys:
            permission_id = permission_map.get(key)

            if not permission_id:
                missing_permissions.append(key)
                continue

            created = create_role_permission(role.id, permission_id)

            if created:
                created_count += 1
            else:
                skipped_count += 1

    db.session.commit()

    print("Role permissions seeded successfully.")
    print(f"Created: {created_count}")
    print(f"Skipped: {skipped_count}")

    if missing_roles:
        print("Missing roles:")
        for r in sorted(set(missing_roles)):
            print(f"- {r}")

    if missing_permissions:
        print("Missing permissions:")
        for p in sorted(set(missing_permissions)):
            print(f"- {p}")