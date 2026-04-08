from app import create_app
from app.seeder.permission_seeder import seed_permissions

app = create_app()

with app.app_context():
    seed_permissions()