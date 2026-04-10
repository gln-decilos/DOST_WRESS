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