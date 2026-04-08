from flask import Blueprint, jsonify
from app.models.permission import Permission

permission_bp = Blueprint("permissions", __name__)


@permission_bp.route("/", methods=["GET"])
def get_permissions():
    permissions = Permission.query.order_by(
        Permission.module.asc(),
        Permission.label.asc()
    ).all()

    return jsonify([permission.to_dict() for permission in permissions]), 200


@permission_bp.route("/grouped", methods=["GET"])
def get_permissions_grouped():
    permissions = Permission.query.order_by(
        Permission.module.asc(),
        Permission.label.asc()
    ).all()

    grouped = {}

    for permission in permissions:
        if permission.module not in grouped:
            grouped[permission.module] = []

        grouped[permission.module].append(permission.to_dict())

    return jsonify(grouped), 200