"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, Save } from "lucide-react"
import DynamicTemplateForm from "@/components/vision-scope/dynamic-form-template"
import usePermissions from "@/features/access/use-permissions"

type TemplateField = {
  id: number
  section_id: number
  key: string
  label: string
  field_type: string
  placeholder?: string | null
  help_text?: string | null
  default_value?: string | null
  options_json?: string | null
  is_required: boolean
  sort_order: number
}

type TemplateSection = {
  id: number
  template_id: number
  title: string
  description?: string | null
  sort_order: number
  is_collapsible: boolean
  fields: TemplateField[]
}

type DocumentTemplate = {
  id: number
  name: string
  code: string
  module: string
  description?: string | null
  is_active: boolean
  is_default: boolean
  organization_id?: number | null
  sections: TemplateSection[]
}

type ProjectDocumentValue = {
  id: number
  document_id: number
  template_field_id: number
  value_text: string
  created_at?: string
  updated_at?: string
}

type RequirementDocument = {
  id: number
  project_id: number
  template_id: number
  version: string
  status: string
  created_by?: number | null
  created_at: string
  updated_at: string
  values?: ProjectDocumentValue[]
}

type RequirementResponse = {
  requirement: {
    id: number
    requirement_id: string
    title: string
    priority: string
    status: string
    description?: string | null
    rationale?: string | null
    created_at: string
    updated_at: string
  }
  document: RequirementDocument
  template: DocumentTemplate | null
  latest_default_template: DocumentTemplate | null
  has_template_update: boolean
  is_template_inactive?: boolean
}

type TemplateSwitchPreview = {
  values: Array<{
    template_field_id: number
    value_text: string
    field_key: string
    field_label: string
    is_transferred: boolean
  }>
  transferred_count: number
  unmatched_old_fields: string[]
  new_empty_fields: Array<{
    field_key: string
    field_label: string
  }>
}

type LinkOption = {
  value: string
  label: string
  requirement_id: string
  title: string
  status: string
}

const API_BASE_URL = "http://localhost:5000/api/business-analyst"

async function parseJsonSafely(res: Response) {
  const contentType = res.headers.get("content-type") || ""
  const text = await res.text()

  if (!contentType.includes("application/json")) {
    throw new Error("Server returned non-JSON response.")
  }

  return text ? JSON.parse(text) : {}
}

function injectLinkedRequirementOptions(
  sourceTemplate: DocumentTemplate,
  options: LinkOption[]
): DocumentTemplate {
  return {
    ...sourceTemplate,
    sections: sourceTemplate.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        if (field.key !== "linked_requirement") return field

        return {
          ...field,
          options_json: JSON.stringify(
            options.map((item) => ({
              value: item.value,
              label: item.label,
            }))
          ),
        }
      }),
    })),
  }
}

function normalizeLinkedRequirementValue(
  mappedValues: Record<string, string>,
  linkOptions: LinkOption[]
): Record<string, string> {
  const currentValue = String(mappedValues["linked_requirement"] || "").trim()

  if (!currentValue) {
    return mappedValues
  }

  const directMatch = linkOptions.find((item) => item.value === currentValue)
  if (directMatch) {
    return mappedValues
  }

  const requirementIdMatch = linkOptions.find(
    (item) => item.requirement_id === currentValue
  )
  if (requirementIdMatch) {
    return {
      ...mappedValues,
      linked_requirement: requirementIdMatch.value,
    }
  }

  const labelMatch = linkOptions.find((item) => item.label === currentValue)
  if (labelMatch) {
    return {
      ...mappedValues,
      linked_requirement: labelMatch.value,
    }
  }

  return {
    ...mappedValues,
    linked_requirement: "",
  }
}

export default function RequirementsEditPageView({
  projectId,
  documentId,
}: {
  projectId: number
  documentId: number
}) {
  const { loading: permissionsLoading, hasPermission } = usePermissions()

  const canEditRequirements = hasPermission("requirements.edit")

  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [documentState, setDocumentState] = useState<RequirementDocument | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({})
  const [templateLoading, setTemplateLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  const [isTemplateSwitchModalOpen, setIsTemplateSwitchModalOpen] = useState(false)
  const [templateSwitchSourceTemplate, setTemplateSwitchSourceTemplate] =
    useState<DocumentTemplate | null>(null)
  const [templateSwitchTargetTemplate, setTemplateSwitchTargetTemplate] =
    useState<DocumentTemplate | null>(null)
  const [templateSwitchPreview, setTemplateSwitchPreview] =
    useState<TemplateSwitchPreview | null>(null)

  const navigateTo = (url: string) => {
    window.location.href = url
  }

  const goToRequirementsTable = () => {
    navigateTo(`/project/${projectId}?tab=requirements`)
  }

  const buildValuesFromDocument = (
    sourceDocument: RequirementDocument,
    sourceTemplate: DocumentTemplate
  ) => {
    const valuesByFieldId = new Map<number, string>()
    sourceDocument.values?.forEach((item) => {
      valuesByFieldId.set(item.template_field_id, item.value_text || "")
    })

    const mappedValues: Record<string, string> = {}
    sourceTemplate.sections.forEach((section) => {
      section.fields.forEach((field) => {
        mappedValues[field.key] =
          valuesByFieldId.get(field.id) || field.default_value || ""
      })
    })

    return mappedValues
  }

  const buildValuesFromSwitchPreview = (
    targetTemplate: DocumentTemplate,
    preview: TemplateSwitchPreview
  ) => {
    const previewByFieldId = new Map(
      preview.values.map((item) => [item.template_field_id, item.value_text])
    )

    const mappedValues: Record<string, string> = {}
    targetTemplate.sections.forEach((section) => {
      section.fields.forEach((field) => {
        mappedValues[field.key] =
          previewByFieldId.get(field.id) || field.default_value || ""
      })
    })

    return mappedValues
  }

  const resetOpenSections = (selectedTemplate: DocumentTemplate) => {
    const initialOpenSections: Record<number, boolean> = {}
    selectedTemplate.sections.forEach((section) => {
      initialOpenSections[section.id] = true
    })
    setOpenSections(initialOpenSections)
  }

  const openFormWithTemplate = (
    selectedTemplate: DocumentTemplate,
    selectedValues: Record<string, string>
  ) => {
    setTemplate(selectedTemplate)
    setValues(selectedValues)
    resetOpenSections(selectedTemplate)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setTemplateLoading(true)
        setMessage("")

        const [requirementRes, linkOptionsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/project/${projectId}/requirements/${documentId}`, {
            method: "GET",
            credentials: "include",
          }),
          fetch(
            `${API_BASE_URL}/project/${projectId}/requirements/link-options?exclude_document_id=${documentId}`,
            {
              method: "GET",
              credentials: "include",
            }
          ),
        ])

        const requirementData =
          (await parseJsonSafely(requirementRes)) as RequirementResponse
        const linkOptionsData = await parseJsonSafely(linkOptionsRes)

        if (!requirementRes.ok) {
          setMessage(
            (requirementData as any).message || "Failed to fetch requirement."
          )
          return
        }

        if (!linkOptionsRes.ok) {
          setMessage(
            linkOptionsData.message || "Failed to fetch linked requirement options."
          )
          return
        }

        if (!requirementData.template) {
          setMessage("Template not found for this requirement.")
          return
        }

        const linkOptions = (linkOptionsData.options || []) as LinkOption[]
        const hydratedSourceTemplate = injectLinkedRequirementOptions(
          requirementData.template,
          linkOptions
        )

        setDocumentState(requirementData.document)

        const normalizedSourceValues = normalizeLinkedRequirementValue(
          buildValuesFromDocument(requirementData.document, hydratedSourceTemplate),
          linkOptions
        )

        if (
          requirementData.has_template_update &&
          requirementData.latest_default_template &&
          requirementData.template.id !== requirementData.latest_default_template.id
        ) {
          const previewRes = await fetch(
            `${API_BASE_URL}/project/${projectId}/requirements/${documentId}/template-switch-preview?target_template_id=${requirementData.latest_default_template.id}`,
            {
              method: "GET",
              credentials: "include",
            }
          )

          const previewData = await parseJsonSafely(previewRes)

          if (!previewRes.ok) {
            setMessage(
              previewData.message || "Failed to load template switch preview."
            )

            openFormWithTemplate(
              hydratedSourceTemplate,
              normalizedSourceValues
            )
            return
          }

          const hydratedTargetTemplate = injectLinkedRequirementOptions(
            requirementData.latest_default_template,
            linkOptions
          )

          setTemplateSwitchSourceTemplate(hydratedSourceTemplate)
          setTemplateSwitchTargetTemplate(hydratedTargetTemplate)
          setTemplateSwitchPreview(previewData.preview)
          setIsTemplateSwitchModalOpen(true)

          openFormWithTemplate(
            hydratedSourceTemplate,
            normalizedSourceValues
          )
          return
        }

        openFormWithTemplate(
          hydratedSourceTemplate,
          normalizedSourceValues
        )
      } catch (error) {
        console.error("Failed to fetch requirement edit data:", error)
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to load requirement edit form."
        )
      } finally {
        setTemplateLoading(false)
      }
    }

    if (!permissionsLoading && canEditRequirements) {
      fetchData()
    } else if (!permissionsLoading && !canEditRequirements) {
      setTemplateLoading(false)
    }
  }, [permissionsLoading, canEditRequirements, projectId, documentId])

  const handleChangeValue = (fieldKey: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
  }

  const toggleSection = (sectionId: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const handleKeepCurrentTemplate = () => {
    if (!templateSwitchSourceTemplate || !documentState) return

    const currentValues = normalizeLinkedRequirementValue(
      buildValuesFromDocument(documentState, templateSwitchSourceTemplate),
      JSON.parse(
        templateSwitchSourceTemplate.sections
          .flatMap((section) => section.fields)
          .find((field) => field.key === "linked_requirement")?.options_json || "[]"
      ).map((item: { value: string; label: string }) => ({
        value: String(item.value),
        label: String(item.label),
        requirement_id: "",
        title: "",
        status: "",
      }))
    )

    openFormWithTemplate(
      templateSwitchSourceTemplate,
      currentValues
    )

    setIsTemplateSwitchModalOpen(false)
    setTemplateSwitchSourceTemplate(null)
    setTemplateSwitchTargetTemplate(null)
    setTemplateSwitchPreview(null)
  }

  const handleSwitchToLatestTemplate = () => {
    if (!templateSwitchTargetTemplate || !templateSwitchPreview) return

    openFormWithTemplate(
      templateSwitchTargetTemplate,
      buildValuesFromSwitchPreview(
        templateSwitchTargetTemplate,
        templateSwitchPreview
      )
    )

    setIsTemplateSwitchModalOpen(false)
    setTemplateSwitchSourceTemplate(null)
    setTemplateSwitchTargetTemplate(null)
    setTemplateSwitchPreview(null)
  }

  const submitForm = async (targetStatus: "Draft" | "Published") => {
    if (!template || !documentState) return

    try {
      setSubmitting(true)
      setMessage("")

      const effectiveStatus =
        documentState.status === "Draft" ? targetStatus : "Published"

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirements/${documentId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template_id: template.id,
            status: effectiveStatus,
            values,
          }),
        }
      )

      const data = await parseJsonSafely(res)

      if (!res.ok) {
        setMessage(
          data.message ||
            `Failed to ${
              effectiveStatus === "Draft" ? "save draft" : "update requirement"
            }.`
        )
        return
      }

      goToRequirementsTable()
    } catch (error) {
      console.error("Failed to update requirement:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to update requirement."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitForm("Published")
  }

  if (permissionsLoading || templateLoading) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading requirement form...
        </div>
      </section>
    )
  }

  if (!canEditRequirements) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          You do not have permission to edit requirements.
        </div>
      </section>
    )
  }

  if (!template || !documentState) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Requirements template not found.
        </div>
      </section>
    )
  }

  const isEditingDraft = documentState.status === "Draft"

  return (
    <>
      <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={goToRequirementsTable}
            className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Requirements
          </button>

          <h1 className="text-2xl font-semibold text-foreground">
            {isEditingDraft ? "Edit Requirement Draft" : "Edit Requirement"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Update the requirement details below.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Using template:{" "}
            <span className="font-medium text-foreground">{template.name}</span>
          </p>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <DynamicTemplateForm
            template={template}
            values={values}
            openSections={openSections}
            onToggleSection={toggleSection}
            onChangeValue={handleChangeValue}
          />

          <div className="flex items-center gap-3">
            {isEditingDraft && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitForm("Draft")}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {submitting ? "Saving..." : "Save as Draft"}
              </button>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {submitting
                ? "Saving..."
                : isEditingDraft
                  ? "Publish Requirement"
                  : "Update Requirement"}
            </button>

            <button
              type="button"
              onClick={goToRequirementsTable}
              className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>

      {isTemplateSwitchModalOpen &&
        templateSwitchSourceTemplate &&
        templateSwitchTargetTemplate &&
        templateSwitchPreview && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
              <h3 className="text-lg font-semibold text-foreground">
                A newer template is available
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This requirement is currently using{" "}
                <span className="font-medium text-foreground">
                  {templateSwitchSourceTemplate.name}
                </span>
                . A newer template,{" "}
                <span className="font-medium text-foreground">
                  {templateSwitchTargetTemplate.name}
                </span>
                , is now available.
              </p>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                You can continue using your current template, or switch to the newer
                one. If you switch, matching information will be carried over
                automatically.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Information carried over
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {templateSwitchPreview.transferred_count}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Information that won’t be included
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {templateSwitchPreview.unmatched_old_fields.length}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    New information to fill in
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {templateSwitchPreview.new_empty_fields.length}
                  </p>
                </div>
              </div>

              {templateSwitchPreview.unmatched_old_fields.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900">
                    Some information from your current template is not part of the
                    newer template
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    This information will not be carried over if you switch.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {templateSwitchPreview.unmatched_old_fields.map((fieldKey) => (
                      <span
                        key={fieldKey}
                        className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
                      >
                        {fieldKey}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {templateSwitchPreview.new_empty_fields.length > 0 && (
                <div className="mt-4 rounded-xl border border-border bg-background p-4">
                  <p className="text-sm font-medium text-foreground">
                    New information you may need to complete
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You can review and fill these in after switching templates.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {templateSwitchPreview.new_empty_fields.map((field) => (
                      <span
                        key={field.field_key}
                        className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                      >
                        {field.field_label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTemplateSwitchModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleKeepCurrentTemplate}
                  className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
                >
                  Keep current template
                </button>

                <button
                  type="button"
                  onClick={handleSwitchToLatestTemplate}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
                >
                  Use newer template
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  )
}