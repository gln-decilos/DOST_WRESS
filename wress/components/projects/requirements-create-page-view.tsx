"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

type Props = {
  projectId: number
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

export default function RequirementsCreatePageView({ projectId }: Props) {
  const router = useRouter()
  const { loading: permissionsLoading, hasPermission } = usePermissions()

  const canEditRequirements = hasPermission("requirements.edit")

  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [templateLoading, setTemplateLoading] = useState(true)
  const [values, setValues] = useState<Record<string, string>>({})
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  const fetchTemplate = async () => {
    try {
      setTemplateLoading(true)
      setMessage("")

      const res = await fetch(`${TEMPLATE_API_BASE_URL}/requirements/default`, {
        method: "GET",
        credentials: "include",
      })

      const data = await parseJsonSafely(res)

      if (!res.ok) {
        setMessage(data.message || "Failed to fetch requirements template.")
        return
      }

      const fetchedTemplate = data.template as DocumentTemplate
      setTemplate(fetchedTemplate)

      const initialValues: Record<string, string> = {}
      const initialOpenSections: Record<number, boolean> = {}

      fetchedTemplate.sections.forEach((section) => {
        initialOpenSections[section.id] = true

        section.fields.forEach((field) => {
          initialValues[field.key] = field.default_value || ""
        })
      })

      setValues(initialValues)
      setOpenSections(initialOpenSections)
    } catch (error) {
      console.error("Failed to fetch requirements template:", error)
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
    if (!permissionsLoading && canEditRequirements) {
      fetchTemplate()
    } else if (!permissionsLoading && !canEditRequirements) {
      setTemplateLoading(false)
    }
  }, [permissionsLoading, canEditRequirements])

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setMessage("")

      console.log("submitting requirement values:", values)

      const res = await fetch(`${API_BASE_URL}/project/${projectId}/requirements`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: values.requirement_status || values.status || "Draft",
          values,
        }),
      })

      const data = await parseJsonSafely(res)
      console.log("create requirement response:", data)

      if (!res.ok) {
        setMessage(data.message || "Failed to create requirement.")
        return
      }

      const createdId = data.requirement?.id

      if (createdId) {
        router.push(`/project/${projectId}/requirements/${createdId}`)
        return
      }

      router.push(`/project/${projectId}?tab=requirements`)
    } catch (error) {
      console.error("Failed to create requirement:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to create requirement."
      )
    } finally {
      setSubmitting(false)
    }
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

  if (!canEditRequirements) {
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
          onClick={() => router.push(`/project/${projectId}?tab=requirements`)}
          className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Requirements
        </button>

        <h1 className="text-2xl font-semibold text-foreground">Create Requirement</h1>
        <p className="mt-2 text-muted-foreground">
          Provide the requirements details below.
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

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {submitting ? "Saving..." : "Save Requirement"}
          </button>
        </div>
      </form>
    </section>
  )
}