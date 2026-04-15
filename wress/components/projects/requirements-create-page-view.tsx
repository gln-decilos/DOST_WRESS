"use client"

import { FormEvent, useEffect, useState } from "react"
import { ChevronLeft, Save } from "lucide-react"
import usePermissions from "@/features/access/use-permissions"
import DynamicTemplateForm from "@/components/vision-scope/dynamic-form-template"

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

type RequirementDocument = {
  id: number
  project_id: number
  template_id: number
  version: string
  status: string
  created_by?: number | null
  created_at: string
  updated_at: string
}

type RequirementResponse = {
  requirement?: {
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
}

type LinkOption = {
  value: string
  label: string
  requirement_id: string
  title: string
  status: string
}

const API_BASE_URL = "http://localhost:5000/api/business-analyst"
const TEMPLATE_API_BASE_URL = "http://localhost:5000/api/templates"

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

export default function RequirementsCreatePageView({
  projectId,
}: {
  projectId: number
}) {
  const { loading: permissionsLoading, hasPermission } = usePermissions()

  const canCreateRequirements = hasPermission("requirements.create")
  const canEditRequirements = hasPermission("requirements.edit")

  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [templateLoading, setTemplateLoading] = useState(true)
  const [values, setValues] = useState<Record<string, string>>({})
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  const navigateTo = (url: string) => {
    window.location.href = url
  }

  const goToRequirementsTable = () => {
    navigateTo(`/project/${projectId}?tab=requirements`)
  }

  const initializeBlankValues = (sourceTemplate: DocumentTemplate) => {
    const initialValues: Record<string, string> = {}
    const initialOpenSections: Record<number, boolean> = {}

    sourceTemplate.sections.forEach((section) => {
      initialOpenSections[section.id] = true

      section.fields.forEach((field) => {
        initialValues[field.key] = field.default_value || ""
      })
    })

    setOpenSections(initialOpenSections)
    setValues(initialValues)
  }

  const fetchInitialData = async () => {
    try {
      setTemplateLoading(true)
      setMessage("")

      const [templateRes, linkOptionsRes] = await Promise.all([
        fetch(`${TEMPLATE_API_BASE_URL}/requirements/default`, {
          method: "GET",
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/project/${projectId}/requirements/link-options`, {
          method: "GET",
          credentials: "include",
        }),
      ])

      const templateData = await parseJsonSafely(templateRes)
      const linkOptionsData = await parseJsonSafely(linkOptionsRes)

      if (!templateRes.ok) {
        setMessage(templateData.message || "Failed to fetch requirements template.")
        return
      }

      if (!linkOptionsRes.ok) {
        setMessage(linkOptionsData.message || "Failed to fetch linked requirement options.")
        return
      }

      const fetchedTemplate = templateData.template as DocumentTemplate
      const linkOptions = (linkOptionsData.options || []) as LinkOption[]

      const hydratedTemplate = injectLinkedRequirementOptions(fetchedTemplate, linkOptions)

      setTemplate(hydratedTemplate)
      initializeBlankValues(hydratedTemplate)
    } catch (error) {
      console.error("Failed to fetch requirements form data:", error)
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to fetch requirements template."
      )
    } finally {
      setTemplateLoading(false)
    }
  }

  useEffect(() => {
    if (!permissionsLoading && (canCreateRequirements || canEditRequirements)) {
      fetchInitialData()
    } else if (!permissionsLoading && !canCreateRequirements && !canEditRequirements) {
      setTemplateLoading(false)
    }
  }, [permissionsLoading, canCreateRequirements, canEditRequirements, projectId])

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

  const submitForm = async (status: "Draft" | "Published") => {
    if (!template) return

    try {
      setSubmitting(true)
      setMessage("")

      const res = await fetch(`${API_BASE_URL}/project/${projectId}/requirements`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: template.id,
          status,
          values,
        }),
      })

      const data = (await parseJsonSafely(res)) as RequirementResponse

      if (!res.ok) {
        setMessage(
          (data as any).message ||
            `Failed to ${status === "Draft" ? "save draft" : "publish requirement"}.`
        )
        return
      }

      goToRequirementsTable()
    } catch (error) {
      console.error("Failed to submit requirement:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to submit requirement."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitPublished = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitForm("Published")
  }

  if (permissionsLoading || templateLoading) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading requirements form...
        </div>
      </section>
    )
  }

  if (!canCreateRequirements && !canEditRequirements) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          You do not have permission to create requirements.
        </div>
      </section>
    )
  }

  if (!template) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Requirements template not found.
        </div>
      </section>
    )
  }

  return (
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
          Create Requirement
        </h1>
        <p className="mt-2 text-muted-foreground">
          Provide the requirement details below.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Using template: <span className="font-medium text-foreground">{template.name}</span>
        </p>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmitPublished} className="space-y-6">
        <DynamicTemplateForm
          template={template}
          values={values}
          openSections={openSections}
          onToggleSection={toggleSection}
          onChangeValue={handleChangeValue}
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitForm("Draft")}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {submitting ? "Saving..." : "Save as Draft"}
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {submitting ? "Saving..." : "Publish Requirement"}
          </button>
        </div>
      </form>
    </section>
  )
}