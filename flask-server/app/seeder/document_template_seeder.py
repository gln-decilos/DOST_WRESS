from app.extensions import db
from app.models.document_templates import DocumentTemplate
from app.models.document_template_section import DocumentTemplateSection
from app.models.document_template_field import DocumentTemplateField


def seed_vision_scope_template():
    existing = DocumentTemplate.query.filter_by(code="vision_scope_default").first()
    if existing:
        print("Vision & Scope default template already exists.")
        return

    template = DocumentTemplate(
        name="Vision & Scope Default",
        code="vision_scope_default",
        module="vision_scope",
        description="Default configurable template for Vision & Scope documents.",
        is_active=True,
        is_default=True,
    )
    db.session.add(template)
    db.session.flush()

    section1 = DocumentTemplateSection(
        template_id=template.id,
        title="1. Business Requirements",
        description="1.1 to 1.5",
        sort_order=1,
        is_collapsible=True,
    )
    db.session.add(section1)
    db.session.flush()

    section2 = DocumentTemplateSection(
        template_id=template.id,
        title="2. Scope and Limitations",
        description="Includes stakeholders profile",
        sort_order=2,
        is_collapsible=True,
    )
    db.session.add(section2)
    db.session.flush()

    section3 = DocumentTemplateSection(
        template_id=template.id,
        title="3. Business Context",
        description="Market, competitors, constraints",
        sort_order=3,
        is_collapsible=True,
    )
    db.session.add(section3)
    db.session.flush()

    fields = [
        DocumentTemplateField(
            section_id=section1.id,
            key="background",
            label="1.1 Background",
            field_type="textarea",
            is_required=False,
            sort_order=1,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="business_opportunity",
            label="1.2 Business Opportunity",
            field_type="textarea",
            is_required=False,
            sort_order=2,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="business_objectives",
            label="1.3 Business Objectives",
            field_type="textarea",
            is_required=False,
            sort_order=3,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="success_metrics",
            label="1.4 Success Metrics with Target Values",
            field_type="textarea",
            is_required=False,
            sort_order=4,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="project_vision_statement",
            label="1.5 Project Vision Statement",
            field_type="textarea",
            is_required=False,
            sort_order=5,
        ),
        DocumentTemplateField(
            section_id=section2.id,
            key="scope_and_limitations",
            label="2. Scope and Limitations",
            field_type="textarea",
            is_required=False,
            sort_order=1,
        ),
        DocumentTemplateField(
            section_id=section2.id,
            key="stakeholders_profile",
            label="2.1 Stakeholders Profile",
            field_type="textarea",
            is_required=False,
            sort_order=2,
        ),
        DocumentTemplateField(
            section_id=section3.id,
            key="business_context",
            label="3. Business Context (market, competitors, constraints)",
            field_type="textarea",
            is_required=False,
            sort_order=1,
        ),
    ]

    db.session.add_all(fields)
    db.session.commit()

    print("Vision & Scope default template seeded successfully.")


def seed_requirements_template():
    existing = DocumentTemplate.query.filter_by(code="requirements_default").first()
    if existing:
        print("Requirements default template already exists.")
        return

    template = DocumentTemplate(
        name="Requirements Default",
        code="requirements_default",
        module="requirements",
        description="Default configurable template for Requirements documents.",
        is_active=True,
        is_default=True,
    )
    db.session.add(template)
    db.session.flush()

    section1 = DocumentTemplateSection(
        template_id=template.id,
        title="Requirement Details",
        description="Default fields for requirement definition and tracking",
        sort_order=1,
        is_collapsible=True,
    )
    db.session.add(section1)
    db.session.flush()

    fields = [
        DocumentTemplateField(
            section_id=section1.id,
            key="requirement_title",
            label="Requirement Title",
            field_type="text",
            placeholder="Enter requirement title",
            is_required=True,
            sort_order=1,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="requirement_description",
            label="Requirement Description",
            field_type="textarea",
            placeholder="Enter requirement description",
            is_required=True,
            sort_order=2,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="acceptance_criteria",
            label="Acceptance Criteria",
            field_type="textarea",
            placeholder="Enter acceptance criteria",
            help_text="Use this field to specify the conditions that must be met for the requirement to be considered complete.",
            is_required=False,
            sort_order=3,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="source_origin",
            label="Source / Origin",
            field_type="select",
            options_json='["Stakeholder","Client","User","Business Analyst","Regulation","System Analysis","Other"]',
            is_required=False,
            sort_order=4,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="linked_requirement",
            label="Linked Requirement",
            field_type="select",
            options_json='[]',
            help_text="Use this field to link to another requirement that is related or dependent.",
            is_required=False,
            sort_order=5,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="requirement_type",
            label="Requirement Type",
            field_type="select",
            options_json='["Functional","Non-Functional","Business","User","System","Constraint"]',
            is_required=True,
            sort_order=6,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="priority",
            label="Priority",
            field_type="select",
            options_json='["Low","Medium","High","Critical"]',
            is_required=False,
            sort_order=7,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="status",
            label="Status",
            field_type="select",
            options_json='["Draft","Proposed","Approved","In Progress","Implemented","Rejected"]',
            is_required=False,
            sort_order=8,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="risk_level",
            label="Risk Level",
            field_type="select",
            options_json='["Low","Medium","High"]',
            is_required=False,
            sort_order=9,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="stability",
            label="Stability",
            field_type="select",
            options_json='["Stable","Moderately Stable","Volatile"]',
            is_required=False,
            sort_order=10,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="effort_estimate",
            label="Effort Estimate",
            field_type="number",
            placeholder="Enter effort estimate",
            is_required=False,
            sort_order=11,
        ),
        DocumentTemplateField(
            section_id=section1.id,
            key="target_release",
            label="Target Release",
            field_type="text",
            placeholder="Enter target release if applicable",
            help_text="Optional. Use this when the requirement is planned for a specific release/version.",
            is_required=False,
            sort_order=12,
        ),
    ]

    db.session.add_all(fields)
    db.session.commit()

    print("Requirements default template seeded successfully.")