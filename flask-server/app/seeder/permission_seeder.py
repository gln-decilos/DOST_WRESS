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

    # Projects
    {
        "key": "project.view",
        "label": "View Projects",
        "module": "project",
        "description": "Allows user to view projects assigned to them.",
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
        "description": "Allows user to edit project details and update project status.",
    },
    {
        "key": "project.delete",
        "label": "Delete Projects",
        "module": "project",
        "description": "Allows user to delete projects.",
    },

    # Project Members / Stakeholders
    {
        "key": "project_members.view",
        "label": "View Project Members",
        "module": "project_members",
        "description": "Allows user to view project members and stakeholders.",
    },
    {
        "key": "project_members.manage",
        "label": "Manage Project Members",
        "module": "project_members",
        "description": "Allows user to add, update, and remove project members and stakeholders.",
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

    # Templates
    {
        "key": "templates.view",
        "label": "View Templates",
        "module": "templates",
        "description": "Allows user to view document templates.",
    },
    {
        "key": "templates.create",
        "label": "Create Templates",
        "module": "templates",
        "description": "Allows user to create document templates.",
    },
    {
        "key": "templates.edit",
        "label": "Edit Templates",
        "module": "templates",
        "description": "Allows user to edit document templates.",
    },
    {
        "key": "templates.delete",
        "label": "Delete Templates",
        "module": "templates",
        "description": "Allows user to delete document templates.",
    },

    # Requirements
    {
        "key": "requirements.view",
        "label": "View Requirements",
        "module": "requirements",
        "description": "Allows user to view requirement documents and requirements.",
    },
    {
        "key": "requirements.create",
        "label": "Create Requirements",
        "module": "requirements",
        "description": "Allows user to create requirement documents and requirements.",
    },
    {
        "key": "requirements.edit",
        "label": "Edit Requirements",
        "module": "requirements",
        "description": "Allows user to edit requirement documents and requirements.",
    },
    {
        "key": "requirements.delete",
        "label": "Delete Requirements",
        "module": "requirements",
        "description": "Allows user to delete requirement documents and requirements.",
    },
    {
        "key": "requirements.submit_approval",
        "label": "Submit Requirements for Approval",
        "module": "requirements",
        "description": "Allows user to submit requirement documents for approval.",
    },
    {
        "key": "requirements.freeze",
        "label": "Freeze Requirements",
        "module": "requirements",
        "description": "Allows user to freeze approved requirement documents.",
    },

    # Notifications
    {
        "key": "notifications.view",
        "label": "View Notifications",
        "module": "notifications",
        "description": "Allows user to view notifications.",
    },
    {
        "key": "notifications.manage",
        "label": "Manage Notifications",
        "module": "notifications",
        "description": "Allows user to manage notifications.",
    },
]


def seed_permissions():
    print("Seeding permissions...")

    created_count = 0
    updated_count = 0
    skipped_count = 0

    for permission_data in PERMISSIONS:
        existing_permission = Permission.query.filter_by(
            key=permission_data["key"]
        ).first()

        if existing_permission:
            has_changes = False

            if existing_permission.label != permission_data["label"]:
                existing_permission.label = permission_data["label"]
                has_changes = True

            if existing_permission.module != permission_data["module"]:
                existing_permission.module = permission_data["module"]
                has_changes = True

            if existing_permission.description != permission_data["description"]:
                existing_permission.description = permission_data["description"]
                has_changes = True

            if has_changes:
                updated_count += 1
            else:
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

    print("Permissions seeded successfully.")
    print(f"Created: {created_count}")
    print(f"Updated: {updated_count}")
    print(f"Skipped: {skipped_count}")