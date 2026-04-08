from app.extensions import db
from app.models.permission import Permission


PERMISSIONS = [
    # Dashboard
    {
        "key": "dashboard.view",
        "label": "View Dashboard",
        "module": "dashboard",
        "description": "Allows user to view the dashboard.",
    },

    # Users
    {
        "key": "users.view",
        "label": "View Users",
        "module": "users",
        "description": "Allows user to view the users list.",
    },
    {
        "key": "users.create",
        "label": "Create Users",
        "module": "users",
        "description": "Allows user to create new users.",
    },
    {
        "key": "users.edit",
        "label": "Edit Users",
        "module": "users",
        "description": "Allows user to edit existing users.",
    },
    {
        "key": "users.delete",
        "label": "Delete Users",
        "module": "users",
        "description": "Allows user to delete users.",
    },

    # Roles
    {
        "key": "roles.view",
        "label": "View Roles",
        "module": "roles",
        "description": "Allows user to view roles.",
    },
    {
        "key": "roles.create",
        "label": "Create Roles",
        "module": "roles",
        "description": "Allows user to create roles.",
    },
    {
        "key": "roles.edit",
        "label": "Edit Roles",
        "module": "roles",
        "description": "Allows user to edit roles.",
    },
    {
        "key": "roles.delete",
        "label": "Delete Roles",
        "module": "roles",
        "description": "Allows user to delete roles.",
    },

    # Organizations
    {
        "key": "organization.view",
        "label": "View Organizations",
        "module": "organization",
        "description": "Allows user to view organizations.",
    },
    {
        "key": "organization.create",
        "label": "Create Organizations",
        "module": "organization",
        "description": "Allows user to create organizations.",
    },
    {
        "key": "organization.edit",
        "label": "Edit Organizations",
        "module": "organization",
        "description": "Allows user to edit organizations.",
    },
    {
        "key": "organization.delete",
        "label": "Delete Organizations",
        "module": "organization",
        "description": "Allows user to delete organizations.",
    },

    # Project
    {
        "key": "project.view",
        "label": "View Projects",
        "module": "project",
        "description": "Allows user to view projects.",
    },
    {
        "key": "project.create",
        "label": "Create Projects",
        "module": "project",
        "description": "Allows user to create projects.",
    },
    {
        "key": "project.edit",
        "label": "Edit Projects",
        "module": "project",
        "description": "Allows user to edit projects.",
    },
    {
        "key": "project.delete",
        "label": "Delete Projects",
        "module": "project",
        "description": "Allows user to delete projects.",
    },

    # Vision and Scope
    {
        "key": "vision_scope.view",
        "label": "View Vision and Scope",
        "module": "vision_scope",
        "description": "Allows user to view vision and scope documents.",
    },
    {
        "key": "vision_scope.create",
        "label": "Create Vision and Scope",
        "module": "vision_scope",
        "description": "Allows user to create vision and scope documents.",
    },
    {
        "key": "vision_scope.edit",
        "label": "Edit Vision and Scope",
        "module": "vision_scope",
        "description": "Allows user to edit vision and scope documents.",
    },
    {
        "key": "vision_scope.delete",
        "label": "Delete Vision and Scope",
        "module": "vision_scope",
        "description": "Allows user to delete vision and scope documents.",
    },

    # Requirements
    {
        "key": "requirements.view",
        "label": "View Requirements",
        "module": "requirements",
        "description": "Allows user to view requirements.",
    },
    {
        "key": "requirements.create",
        "label": "Create Requirements",
        "module": "requirements",
        "description": "Allows user to create requirements.",
    },
    {
        "key": "requirements.edit",
        "label": "Edit Requirements",
        "module": "requirements",
        "description": "Allows user to edit requirements.",
    },
    {
        "key": "requirements.delete",
        "label": "Delete Requirements",
        "module": "requirements",
        "description": "Allows user to delete requirements.",
    },
]


def seed_permissions():
    created_count = 0
    skipped_count = 0

    for permission_data in PERMISSIONS:
        existing_permission = Permission.query.filter_by(
            key=permission_data["key"]
        ).first()

        if existing_permission:
            skipped_count += 1
            continue

        permission = Permission(
            key=permission_data["key"],
            label=permission_data["label"],
            module=permission_data["module"],
            description=permission_data["description"],
        )
        db.session.add(permission)
        created_count += 1

    db.session.commit()

    print(f"Permissions seeded successfully.")
    print(f"Created: {created_count}")
    print(f"Skipped: {skipped_count}")