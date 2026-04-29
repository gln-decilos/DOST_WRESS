"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ChevronLeft,
  Eye,
  FileCheck,
  Pencil,
  Plus,
  Snowflake,
  Trash2,
} from "lucide-react"
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

type RequirementDocumentSummary = {
  id: number
  project_id: number
  template_id?: number | null
  version: string
  name: string
  description: string
  status: string
  created_by?: number | null
  created_at: string
  updated_at: string
  requirement_count: number
}

type RequirementItemSummary = {
  id: number
  project_document_id: number
  requirement_code: string
  title: string
  description?: string | null
  rationale?: string | null
  priority: string
  status: string
  sort_order: number
  created_by?: number | null
  created_at: string
  updated_at: string
}

type RequirementDocumentDetailsResponse = {
  document_summary: RequirementDocumentSummary
  document: {
    id: number
    project_id: number
    template_id: number
    version: string
    status: string
    created_by?: number | null
    created_at: string
    updated_at: string
    requirement_items?: RequirementItemSummary[]
  }
  template: DocumentTemplate | null
  latest_default_template: DocumentTemplate | null
  has_template_update: boolean
  is_template_inactive?: boolean
  requirements: RequirementItemSummary[]
}

type RequirementItemDetailsResponse = {
  item: {
    id: number
    project_document_id: number
    sort_order: number
    created_by?: number | null
    created_at: string
    updated_at: string
    values?: Array<{
      id: number
      item_id: number
      template_field_id: number
      value_text: string
    }>
  }
  summary: RequirementItemSummary
  template: DocumentTemplate | null
}

const API_BASE_URL = "http://localhost:5000/api/business-analyst"

const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    return token;
  }
  return null;
};

const createAuthHeaders = () => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

function formatDate(value: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString()
}

function getStatusDescription(status: string) {
  switch (status) {
    case "Draft":
      return "The current requirements set is under stakeholder review."
    case "For Approval":
      return "The current requirements set is under stakeholder review."
    case "Approved":
      return "All required stakeholders have approved this document."
    case "Frozen":
      return "This requirements is locked and used for development."
    default:
      return "-"
  }
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "Draft":
      return "bg-amber-100 text-amber-700 ring-amber-200"
    case "For Approval":
      return "bg-blue-100 text-blue-700 ring-blue-200"
    case "Approved":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200"
    case "Frozen":
      return "bg-slate-100 text-slate-700 ring-slate-200"
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200"
  }
}

export default function RequirementsDocumentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get values from URL query parameters
  const projectIdParam = searchParams.get("projectId")
  const documentIdParam = searchParams.get("id")

  // Validate required parameters
  if (!projectIdParam || !documentIdParam) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">
            Missing project or document information. Please go back and try again.
          </div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            <ChevronLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Convert to numbers
  const projectId = parseInt(projectIdParam)
  const documentId = parseInt(documentIdParam)

  const [documentSummary, setDocumentSummary] = useState<RequirementDocumentSummary | null>(null)
  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [requirements, setRequirements] = useState<RequirementItemSummary[]>([])
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [requirementModalOpen, setRequirementModalOpen] = useState(false)
  const [editingRequirementId, setEditingRequirementId] = useState<number | null>(null)
  const [requirementValues, setRequirementValues] = useState<Record<string, string>>({})
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({})
  const [requirementToDelete, setRequirementToDelete] = useState<RequirementItemSummary | null>(null)
  const [isApprovalSummaryOpen, setIsApprovalSummaryOpen] = useState(false)
  const [approvalSummary, setApprovalSummary] = useState<any>(null)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)

  const canModify = documentSummary?.status === "Draft"

  const fetchData = async () => {
    try {
      setFetching(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentId}`,
        {
          method: "GET",
          headers: createAuthHeaders(),
        }
      )

      const data: RequirementDocumentDetailsResponse = await res.json()

      if (!res.ok) {
        setMessage((data as any).message || "Failed to fetch requirement document.")
        return
      }

      setDocumentSummary(data.document_summary)
      setTemplate(data.template || null)
      setRequirements(data.requirements || [])

      if (data.template) {
        const initialOpenSections: Record<number, boolean> = {}
        data.template.sections.forEach((section) => {
          initialOpenSections[section.id] = true
        })
        setOpenSections(initialOpenSections)
      }
    } catch (error) {
      console.error("Failed to fetch requirement document page:", error)
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to fetch requirement document page."
      )
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [projectId, documentId])

  const toggleSection = (sectionId: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const initializeBlankRequirementValues = (docTemplate: DocumentTemplate) => {
    const initialValues: Record<string, string> = {}
    const initialOpenSections: Record<number, boolean> = {}

    docTemplate.sections.forEach((section) => {
      initialOpenSections[section.id] = true
      section.fields.forEach((field) => {
        initialValues[field.key] = field.default_value || ""
      })
    })

    setOpenSections(initialOpenSections)
    setRequirementValues(initialValues)
  }

  const buildValuesFromRequirementRecord = (
    docTemplate: DocumentTemplate,
    item: RequirementItemDetailsResponse["item"]
  ) => {
    const fieldMap = new Map<number, string>()
    docTemplate.sections.forEach((section) => {
      section.fields.forEach((field) => {
        fieldMap.set(field.id, field.key)
      })
    })

    const values: Record<string, string> = {}
      ; (item.values || []).forEach((entry) => {
        const fieldKey = fieldMap.get(entry.template_field_id)
        if (fieldKey) {
          values[fieldKey] = entry.value_text || ""
        }
      })

    docTemplate.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (values[field.key] === undefined) {
          values[field.key] = field.default_value || ""
        }
      })
    })

    return values
  }

  const openCreateRequirementModal = () => {
    if (!template) return
    initializeBlankRequirementValues(template)
    setEditingRequirementId(null)
    setRequirementModalOpen(true)
  }

  const openEditRequirementModal = async (requirementId: number) => {
    if (!template || !documentSummary) return

    try {
      setLoading(true)
      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${requirementId}`,
        {
          method: "GET",
          headers: createAuthHeaders(),
        }
      )

      const data: RequirementItemDetailsResponse = await res.json()

      if (!res.ok || !data.template) {
        setMessage((data as any).message || "Failed to load requirement.")
        return
      }

      const values = buildValuesFromRequirementRecord(template, data.item)
      setRequirementValues(values)
      setEditingRequirementId(requirementId)
      setRequirementModalOpen(true)
    } catch (error) {
      console.error("Failed to load requirement:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to load requirement."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRequirementChange = (fieldKey: string, value: string) => {
    setRequirementValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
  }

  const buildRequirementValuesPayload = () => {
    if (!template) return []

    return template.sections.flatMap((section) =>
      section.fields.map((field) => ({
        template_field_id: field.id,
        value_text: requirementValues[field.key] || "",
      }))
    )
  }

  const saveRequirement = async () => {
    if (!template || !documentSummary) return

    try {
      setLoading(true)
      setMessage("")

      const payload = {
        values: buildRequirementValuesPayload(),
      }

      const url = editingRequirementId
        ? `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${editingRequirementId}`
        : `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items`

      const method = editingRequirementId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: createAuthHeaders(),
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to save requirement.")
        return
      }

      setRequirementModalOpen(false)
      setEditingRequirementId(null)
      await fetchData()
    } catch (error) {
      console.error("Failed to save requirement:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to save requirement."
      )
    } finally {
      setLoading(false)
    }
  }

  const confirmDeleteRequirement = async () => {
    if (!documentSummary || !requirementToDelete) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${requirementToDelete.id}`,
        {
          method: "DELETE",
          headers: createAuthHeaders(),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to delete requirement")
        return
      }

      setRequirementToDelete(null)
      await fetchData()
    } catch (error) {
      console.error("Failed to delete requirement:", error)
      setMessage("Failed to delete requirement")
    } finally {
      setLoading(false)
    }
  }

  const submitForApproval = async () => {
    if (!documentSummary) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/submit-approval`,
        {
          method: "POST",
          headers: createAuthHeaders(),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to submit for approval")
        return
      }

      await fetchData()
    } catch (error) {
      console.error("Failed to submit for approval:", error)
      setMessage("Failed to submit for approval")
    } finally {
      setLoading(false)
    }
  }

  const freezeDocument = async () => {
    if (!documentSummary) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/freeze`,
        {
          method: "POST",
          headers: createAuthHeaders(),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to freeze document")
        return
      }

      await fetchData()
    } catch (error) {
      console.error("Failed to freeze document:", error)
      setMessage("Failed to freeze document")
    } finally {
      setLoading(false)
    }
  }

  const loadApprovalSummary = async () => {
    if (!documentSummary) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/approval-summary`,
        {
          method: "GET",
          headers: createAuthHeaders(),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to load approval summary")
        return
      }

      setApprovalSummary(data.summary)
      setIsApprovalSummaryOpen(true)
    } catch (error) {
      console.error("Failed to load approval summary:", error)
      setMessage("Failed to load approval summary")
    } finally {
      setLoading(false)
    }
  }

  const createNewVersion = async (changeType: "minor" | "major") => {
    if (!documentSummary) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/create-version`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          body: JSON.stringify({ change_type: changeType }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to create new version")
        return
      }

      // Navigate to the new document using the stakeholder route
      router.push(`/stakeholder/projects/requirement-document?id=${data.document.id}&projectId=${projectId}`)
    } catch (error) {
      console.error("Failed to create new version:", error)
      setMessage("Failed to create new version")
    } finally {
      setLoading(false)
      setIsVersionModalOpen(false)
    }
  }

  if (fetching) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading requirement document...
        </div>
      </section>
    )
  }

  if (!documentSummary) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          {message || "Requirement document not found."}
        </div>
      </section>
    )
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/stakeholder/projects/project-details?id=${projectId}&tab=requirements`)}
          className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Requirements
        </button>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {documentSummary.name || `Requirements ${documentSummary.version}`}
            </h1>
            <p className="mt-2 text-muted-foreground">Version {documentSummary.version}</p>
            <p className="mt-1 text-muted-foreground">
              Created {formatDate(documentSummary.created_at)} · Updated {formatDate(documentSummary.updated_at)}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="mb-6 rounded-2xl bg-background p-6 ring-1 ring-border">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">Current Status:</p>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusBadgeClasses(documentSummary.status)}`}
          >
            {documentSummary.status}
          </span>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {getStatusDescription(documentSummary.status)}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {documentSummary.status === "Draft" && (
            <button
              type="button"
              onClick={submitForApproval}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <FileCheck className="h-4 w-4" />
              Submit for Approval
            </button>
          )}

          {documentSummary.status !== "Draft" && (
            <button
              type="button"
              onClick={loadApprovalSummary}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Eye className="h-4 w-4" />
              View Approval Summary
            </button>
          )}

          {documentSummary.status === "Approved" && (
            <button
              type="button"
              onClick={freezeDocument}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Snowflake className="h-4 w-4" />
              Freeze Document
            </button>
          )}

          {documentSummary.status === "Frozen" && (
            <button
              type="button"
              onClick={() => setIsVersionModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border">
        <div className="flex flex-col gap-3 border-b border-border px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Requirements Table</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These requirements use the dynamic template.
            </p>
          </div>

          {canModify && template && (
            <button
              type="button"
              onClick={openCreateRequirementModal}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Requirement
            </button>
          )}
        </div>

        {requirements.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No requirements in this document yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Requirement ID</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date Modified</th>
                  <th className="w-40 px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {requirements.map((requirement) => (
                  <tr key={requirement.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {requirement.requirement_code}
                    </td>
                    <td className="px-4 py-3 text-foreground">{requirement.title || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{requirement.priority || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{requirement.status || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(requirement.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canModify && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditRequirementModal(requirement.id)}
                              className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                              title="Edit Requirement"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setRequirementToDelete(requirement)}
                              className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                              title="Delete Requirement"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {requirementModalOpen && template && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto max-w-4xl rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              {editingRequirementId ? "Edit Requirement" : "Create Requirement"}
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              This uses the dynamic template for the requirement itself.
            </p>

            <div className="mt-5">
              <DynamicTemplateForm
                template={template}
                values={requirementValues}
                openSections={openSections}
                onToggleSection={toggleSection}
                onChangeValue={handleRequirementChange}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRequirementModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={saveRequirement}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Saving..." : editingRequirementId ? "Update Requirement" : "Create Requirement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {requirementToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">Delete Requirement</h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {requirementToDelete.requirement_code}
              </span>
              ?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRequirementToDelete(null)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteRequirement}
                disabled={loading}
                className="rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90 disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isApprovalSummaryOpen && approvalSummary && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">Approval Summary</h3>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-muted-foreground">Version</p>
                <p className="mt-1 text-foreground">{approvalSummary.version}</p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="mt-1 text-foreground">{approvalSummary.status}</p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                <p className="mt-1 text-foreground">{approvalSummary.submitted ? "Yes" : "No"}</p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-muted-foreground">Frozen</p>
                <p className="mt-1 text-foreground">{approvalSummary.frozen ? "Yes" : "No"}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-medium text-foreground">Notes</p>
              <p className="mt-1 text-sm text-muted-foreground">{approvalSummary.note}</p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsApprovalSummaryOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isVersionModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">Create New Version</h3>

            <p className="mt-3 text-sm text-muted-foreground">
              This document is frozen. Choose whether the next editable version should be a minor or major update.
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => createNewVersion("minor")}
                disabled={loading}
                className="w-full rounded-lg border border-border px-4 py-3 text-left hover:bg-muted disabled:opacity-60"
              >
                <p className="font-medium text-foreground">Minor Update</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Creates the next minor version, for example 1.0 to 1.1.
                </p>
              </button>

              <button
                type="button"
                onClick={() => createNewVersion("major")}
                disabled={loading}
                className="w-full rounded-lg border border-border px-4 py-3 text-left hover:bg-muted disabled:opacity-60"
              >
                <p className="font-medium text-foreground">Major Update</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Creates the next major version, for example 1.0 to 2.0.
                </p>
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}