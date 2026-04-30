from app.extensions import db
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permissions import RolePermission


ROLE_PERMISSION_MAP = {
    "System Admin": "ALL",

    "Organization Admin": [
        "dashboard.view",

        "users.view",
        "users.create",
        "users.edit",
        "users.delete",

        "roles.view",
        "roles.create",
        "roles.edit",
        "roles.delete",

        "organization.view",
        "organization.create",
        "organization.edit",
        "organization.delete",

        "project.view",
        "project.create",
        "project.edit",
        "project.delete",

        "project_members.view",
        "project_members.manage",

        "vision_scope.view",
        "vision_scope.create",
        "vision_scope.edit",
        "vision_scope.delete",

        "templates.view",
        "templates.create",
        "templates.edit",
        "templates.delete",

        "requirements.view",
        "requirements.create",
        "requirements.edit",
        "requirements.delete",
        "requirements.submit_approval",
        "requirements.freeze",

        "notifications.view",
        "notifications.manage",
    ],

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
        "requirements.freeze",

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

        "notifications.view",
    ],

    "Developer": [
        "dashboard.view",

        "project.view",

        "project_members.view",

        "vision_scope.view",

        "requirements.view",

        "notifications.view",
    ],

    "QA Tester": [
        "dashboard.view",

        "project.view",

        "project_members.view",

        "vision_scope.view",

        "requirements.view",

        "notifications.view",
    ],

    "Stakeholder": [
        "dashboard.view",

        "project.view",

        "project_members.view",

        "vision_scope.view",

        "requirements.view",

        "notifications.view",
    ],

    "Viewer": [
        "dashboard.view",

        "project.view",

        "project_members.view",

        "vision_scope.view",

        "requirements.view",

        "notifications.view",
    ],
}


def get_permission_ids(permission_keys):
    if permission_keys == "ALL":
        permissions = Permission.query.all()
    else:
        permissions = Permission.query.filter(
            Permission.key.in_(permission_keys)
        ).all()

    return {
        permission.key: permission.id
        for permission in permissions
    }


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

    created_count = 0
    skipped_count = 0
    missing_roles = []
    missing_permissions = []

    for role_name, permission_keys in ROLE_PERMISSION_MAP.items():
        role = Role.query.filter_by(name=role_name).first()

        if not role:
            missing_roles.append(role_name)
            continue

        permission_map = get_permission_ids(permission_keys)

        if permission_keys == "ALL":
            target_permission_keys = list(permission_map.keys())
        else:
            target_permission_keys = permission_keys

        for permission_key in target_permission_keys:
            permission_id = permission_map.get(permission_key)

            if not permission_id:
                missing_permissions.append(permission_key)
                continue

            created = create_role_permission(
                role_id=role.id,
                permission_id=permission_id
            )

            if created:
                created_count += 1
            else:
                skipped_count += 1

    db.session.commit()

    unique_missing_roles = sorted(set(missing_roles))
    unique_missing_permissions = sorted(set(missing_permissions))

    print("Role permissions seeded successfully.")
    print(f"Created: {created_count}")
    print(f"Skipped: {skipped_count}")

    if unique_missing_roles:
        print("Missing roles:")
        for role_name in unique_missing_roles:
            print(f"- {role_name}")

    if unique_missing_permissions:
        print("Missing permissions:")
        for permission_key in unique_missing_permissions:
            print(f"- {permission_key}")