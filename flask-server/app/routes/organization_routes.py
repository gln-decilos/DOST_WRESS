from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.organization import Organization

organization_bp = Blueprint("organization", __name__)


@organization_bp.route("/organizations", methods=["GET"])
def get_organizations():
    organizations = Organization.query.order_by(Organization.id.asc()).all()
    return jsonify([org.to_dict() for org in organizations]), 200


@organization_bp.route("/organizations/<int:org_id>", methods=["GET"])
def get_organization(org_id):
    organization = Organization.query.get(org_id)

    if not organization:
        return jsonify({"message": "Organization not found"}), 404

    return jsonify(organization.to_dict()), 200


@organization_bp.route("/organizations", methods=["POST"])
def create_organization():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data provided"}), 400

    name = data.get("name", "").strip()
    logo = data.get("logo", "")
    contact_email = data.get("contact_email", "").strip()
    subscription_plan = data.get("subscription_plan", "").strip() or "Basic"

    if not name:
        return jsonify({"message": "Organization name is required"}), 400

    existing = Organization.query.filter_by(name=name).first()
    if existing:
        return jsonify({"message": "Organization already exists"}), 409

    organization = Organization(
        name=name,
        logo=logo or None,
        contact_email=contact_email or None,
        subscription_plan=subscription_plan,
    )

    db.session.add(organization)
    db.session.commit()

    return jsonify({
        "message": "Organization created successfully",
        "organization": organization.to_dict()
    }), 201


@organization_bp.route("/organizations/<int:org_id>", methods=["PUT"])
def update_organization(org_id):
    organization = Organization.query.get(org_id)

    if not organization:
        return jsonify({"message": "Organization not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    name = data.get("name", organization.name).strip()
    if not name:
        return jsonify({"message": "Organization name is required"}), 400

    existing = Organization.query.filter(
        Organization.name == name,
        Organization.id != org_id
    ).first()

    if existing:
        return jsonify({"message": "Another organization with this name already exists"}), 409

    organization.name = name
    organization.logo = data.get("logo", organization.logo)
    organization.contact_email = data.get("contact_email", organization.contact_email)
    organization.subscription_plan = data.get("subscription_plan", organization.subscription_plan)

    db.session.commit()

    return jsonify({
        "message": "Organization updated successfully",
        "organization": organization.to_dict()
    }), 200

@organization_bp.route("/organizations/<int:org_id>", methods=["DELETE"])
def delete_organization(org_id):
    organization = Organization.query.get(org_id)

    if not organization:
        return jsonify({"message": "Organization not found"}), 404
    
    if organization.user:
        return jsonify({"message": "Cannot delete organization because it still has users assigned"}), 400

    db.session.delete(organization)
    db.session.commit()

    return jsonify({
        "message": "Organization deleted successfully"
    }), 200


