"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Save } from "lucide-react"
import DynamicTemplateForm from "@/components/vision-scope/dynamic-form-template"
import usePermissions from "@/features/access/use-permissions"
import { getDefaultTemplate } from "@/features/templates/api"
import type { DocumentTemplate } from "@/features/templates/types"

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
}

type Props = {
  projectId: number
  documentId: number
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

export default function RequirementsEditPageView({
  projectId,
  documentId,
}: Props) {
  const router = useRouter()
  const { loading: permissionsLoading, hasPermission } = usePermissions()

  const canEditRequirements = hasPermission("requirements.edit")

  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({})
  const [templateLoading, setTemplateLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setTemplateLoading(true)
        setMessage("")

        const [fetchedTemplate, requirementRes] = await Promise.all([
          getDefaultTemplate("requirements"),
          fetch(`${API_BASE_URL}/project/${projectId}/requirements/${documentId}`, {
            method: "GET",
            credentials: "include",
          }),
        ])

        const requirementData = await parseJsonSafely(requirementRes)

        if (!requirementRes.ok) {
          setMessage(requirementData.message || "Failed to fetch requirement.")
          return
        }

        const requirementPayload = requirementData as RequirementResponse

        setTemplate(fetchedTemplate)

        const initialValues: Record<string, string> = {}
        const initialOpenSections: Record<number, boolean> = {}

        fetchedTemplate.sections.forEach((section) => {
          initialOpenSections[section.id] = true

          section.fields.forEach((field) => {
            const matchedValue =
              requirementPayload.document.values?.find(
                (item) => item.template_field_id === field.id
              )?.value_text || ""

            initialValues[field.key] = matchedValue || field.default_value || ""
          })
        })

        setValues(initialValues)
        setOpenSections(initialOpenSections)
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirements/${documentId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: values.requirement_status || values.status || "Draft",
            values,
          }),
        }
      )

      const data = await parseJsonSafely(res)

      if (!res.ok) {
        setMessage(data.message || "Failed to update requirement.")
        return
      }

      router.push(`/project/${projectId}/requirements/${documentId}`)
    } catch (error) {
      console.error("Failed to update requirement:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to update requirement."
      )
    } finally {
      setSubmitting(false)
    }
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
          onClick={() => router.push(`/project/${projectId}/requirements/${documentId}`)}
          className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Requirement
        </button>

        <h1 className="text-2xl font-semibold text-foreground">Edit Requirement</h1>
        <p className="mt-2 text-muted-foreground">
          Update the requirement details below.
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
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {submitting ? "Saving..." : "Update Requirement"}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/project/${projectId}/requirements/${documentId}`)}
            className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}