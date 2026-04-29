from flask import Blueprint, jsonify, g
from app.extensions import db
from app.models.notification import Notification
from app.routes.auth_routes import login_required

notification_bp = Blueprint("notifications", __name__)


@notification_bp.route("/notifications", methods=["GET"])
@login_required
def get_notifications():
    user_id = g.user_id

    notifications = (
        Notification.query
        .filter_by(user_id=user_id)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )

    unread_count = (
        Notification.query
        .filter_by(user_id=user_id, is_read=False)
        .count()
    )

    return jsonify({
        "notifications": [notification.to_dict() for notification in notifications],
        "unread_count": unread_count,
    }), 200


@notification_bp.route("/notifications/<int:notification_id>/read", methods=["PATCH"])
@login_required
def mark_notification_as_read(notification_id):
    user_id = g.user_id

    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=user_id,
    ).first()

    if not notification:
        return jsonify({"message": "Notification not found"}), 404

    notification.is_read = True
    db.session.commit()

    return jsonify({
        "message": "Notification marked as read",
        "notification": notification.to_dict(),
    }), 200


@notification_bp.route("/notifications/read-all", methods=["PATCH"])
@login_required
def mark_all_notifications_as_read():
    user_id = g.user_id

    Notification.query.filter_by(
        user_id=user_id,
        is_read=False,
    ).update({"is_read": True})

    db.session.commit()

    return jsonify({"message": "All notifications marked as read"}), 200