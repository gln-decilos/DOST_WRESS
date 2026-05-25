# WRESS

**WRESS** stands for **Web-based Requirements Engineering Support System**. It is a full-stack web application designed to help software teams manage requirements engineering activities in one organized workspace. The system supports project management, stakeholder collaboration, role-based permissions, document templates, vision and scope documentation, requirements approval, change requests, and notifications.

---

## Overview

WRESS helps teams handle the requirements engineering process from early project definition up to requirement review and change control. It provides separate workspaces for system administrators, organization administrators, business analysts, project members, and stakeholders.

The application is built with a **Next.js frontend** and a **Flask REST API backend** connected to a **PostgreSQL database**.

---

## Main Features

### Authentication and User Access
- Sign in and sign out
- Forgot password and reset password flow
- JWT-based authentication
- Role-based and permission-based access control
- Separate access views for System Admin, Organization Admin, Business Analyst, Project Manager, Developer, Tester, Product Owner, and Stakeholder roles

### Organization Management
- Create, view, update, and delete organizations
- Manage organization details such as name, contact email, logo, and subscription plan
- Assign users to organizations

### User and Role Management
- Manage system users
- Manage organization users
- Create and update roles
- Assign permissions to roles
- Support project-specific user roles

### Project Management
- Create, update, archive, unarchive, and delete projects
- Assign project members and stakeholders
- Track project status, timeline, organization, and project manager
- Display project dashboards based on the current user’s access level

### Vision and Scope Documents
- Create project Vision and Scope documents
- Use configurable document templates
- Edit document fields such as background, business opportunity, business objectives, success metrics, project vision statement, scope and limitations, stakeholder profile, and business context

### Requirements Management
- Create requirements documents
- Add, edit, view, and delete requirement items
- Store requirement details using configurable template fields
- Submit requirements for approval
- Approve or reject requirement documents and items
- Freeze and unfreeze approved requirements
- View approval summaries
- Add and delete requirement comments
- Track requirement change logs
- Create new document versions

### Change Request Workflow
- Request requirement changes
- Support change types such as Modify, Add, Remove, Clarify, and Other
- Set request priority from Low to Critical
- Upload supporting files and impact analysis files
- Move change requests through review and decision stages
- Decide whether requested changes should proceed or be declined

### Notifications
- View user notifications
- Mark individual notifications as read
- Mark all notifications as read
- Notify project members during requirement review and change workflows

---

## Tech Stack

### Frontend
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Radix UI
- Lucide React icons
- Recharts

### Backend
- Python
- Flask
- Flask SQLAlchemy
- Flask Migrate
- Flask Mail
- Flask CORS
- Flask JWT Extended
- PostgreSQL
- Alembic migrations

---

## Project Structure

```text
WRESS/
├── wress/                  # Next.js frontend
│   ├── app/                # App router pages and route groups
│   ├── components/         # Reusable UI and page components
│   ├── contexts/           # Authentication context
│   ├── features/           # Feature-level API and utility files
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Shared utilities
│   ├── public/             # Static assets
│   ├── sections/           # Landing page sections
│   └── package.json
│
└── flask-server/           # Flask backend
    ├── app/
    │   ├── models/         # Database models
    │   ├── routes/         # API route handlers
    │   ├── seeder/         # Default data seeders
    │   ├── utils/          # Helper functions and decorators
    │   ├── extensions.py   # Flask extension instances
    │   └── __init__.py     # App factory and blueprint registration
    ├── migrations/         # Alembic migration files
    ├── uploads/            # Uploaded change request files
    ├── seed.py             # Runs default seeders
    ├── server.py           # Backend entry point
    └── check_connection.py # PostgreSQL connection checker
```

---

## Prerequisites

Before running the project, install the following:

- Node.js 18 or higher
- npm, pnpm, yarn, or bun
- Python 3.10 or higher
- PostgreSQL
- Git

---

## Backend Setup

Go to the backend folder:

```bash
cd flask-server
```

Create and activate a virtual environment:

```bash
python -m venv venv
```

For Windows:

```bash
venv\Scripts\activate
```

For macOS/Linux:

```bash
source venv/bin/activate
```

Install the required Python packages:

```bash
pip install flask flask-cors flask-sqlalchemy flask-migrate flask-mail flask-jwt-extended psycopg2-binary PyJWT Werkzeug
```

Create the PostgreSQL database and user. The current backend configuration expects a local PostgreSQL database named `wress_db`. You may either create a database that matches the current configuration in `flask-server/app/__init__.py`, or update the database URI in that file to match your own local PostgreSQL credentials.

Example PostgreSQL setup:

```sql
CREATE DATABASE wress_db;
CREATE USER wress_admin WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE wress_db TO wress_admin;
```

Check the database connection:

```bash
python check_connection.py
```

Run database migrations:

```bash
flask db upgrade
```

Seed the database with default organizations, roles, permissions, templates, and users:

```bash
python seed.py
```

Start the Flask server:

```bash
python server.py
```

The backend will run at:

```text
http://localhost:5000
```

---

## Frontend Setup

Open another terminal, then go to the frontend folder:

```bash
cd wress
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The frontend will run at:

```text
http://localhost:3000
```

---

## Default Seeded Accounts

After running `python seed.py`, the system creates default users for testing. All seeded accounts use the same default password:

```text
Password123!
```

| Role | Email |
|---|---|
| System Admin | admin@wress.com |
| Organization Admin | dost.org@wress.com |
| Business Analyst | ba@wress.com |
| Product Owner | po@wress.com |
| Project Manager | pm@wress.com |
| Developer | dev@wress.com |
| Tester | tester@wress.com |
| Stakeholder | stakeholder@wress.com |

---

## Main User Dashboards

### System Admin
The System Admin can manage platform-level records such as organizations, users, and roles.

### Organization Admin
The Organization Admin can manage users, projects, roles, templates, and organization-level records within their assigned organization.

### Business Analyst
The Business Analyst can work on assigned projects, prepare Vision and Scope documents, create requirements documents, manage requirement items, and submit requirements for review.

### Stakeholder and Project Members
Stakeholders and project members can view assigned projects, review documents, comment on requirements, approve or reject requirements, and participate in change request workflows depending on their assigned permissions.

---

## Important API Areas

The Flask backend exposes API routes for:

- Authentication: `/api/auth`
- Users: `/api/users`
- Admin records: `/api/admin`
- Organizations: `/api/admin/organizations`
- Roles: `/api/admin/roles`
- Permissions: `/api/admin/permissions`
- Project access: `/api/business-analyst`
- Templates: `/api/templates`
- Profile: `/api/profile`
- Notifications: `/api/notifications`
- Organization admin projects: `/api/orgadmin/projects`

---

## Development Notes

- The frontend currently uses `http://localhost:5000` as the backend API base URL in several files.
- The backend allows local frontend origins such as `http://localhost:3000`, `http://localhost:3001`, and `http://127.0.0.1:3000`.
- Some configuration values are currently written directly in the Flask app setup. For production, move database credentials, mail credentials, and JWT secrets into environment variables.
- The repository contains generated folders such as `node_modules`, `.next`, virtual environments, and Git metadata in the uploaded copy. These should not be committed to a clean repository.

---

## Recommended `.gitignore`

Make sure these files and folders are ignored:

```gitignore
# Node / Next.js
wress/node_modules/
wress/.next/
wress/out/
wress/.env.local

# Python
flask-server/venv/
flask-server/__pycache__/
flask-server/app/__pycache__/
*.pyc

# Local environment
.env
*.env

# Uploads and local files
flask-server/uploads/

# OS files
.DS_Store
Thumbs.db
```

---

## Security Reminder

Before deploying or sharing this project publicly, remove all hardcoded credentials from the source code and rotate any credentials that were already committed or shared. Store secrets in environment variables instead of writing them directly inside the codebase.

---

## License

This project is for academic and development use. Update this section if the project will be released under a specific license.
