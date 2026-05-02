"use client"

import { useEffect, useMemo, useState } from "react"
import { ClipboardList, Eye, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

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

type DocumentTemplate = {
  id: number
  name: string
}

const API_BASE_URL = "http://localhost:5000/api/business-analyst"
const TEMPLATE_API_BASE_URL = "http://localhost:5000/api/templates"
const ACCESS_API_BASE_URL = "http://localhost:5000/api/access"

function formatDate(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString()
}

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token")
  }

  return null
}

const createAuthHeaders = () => {
  const token = getAuthToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export default function RequirementsTabContent({
  projectId,
}: {
  projectId: number
}) {
  const router = useRouter()

  const [canViewRequirements, setCanViewRequirements] = useState(false)
  const [canCreateRequirements, setCanCreateRequirements] = useState(false)
  const [canDeleteRequirements, setCanDeleteRequirements] = useState(false)
  const [permissionLoading, setPermissionLoading] = useState(true)

  const [documents, setDocuments] = useState<RequirementDocumentSummary[]>([])
  const [requirementsLoading, setRequirementsLoading] = useState(false)
  const [requirementsSearch, setRequirementsSearch] = useState("")
  const [message, setMessage] = useState("")
  const [documentToDelete, setDocumentToDelete] =
    useState<RequirementDocumentSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [defaultTemplate, setDefaultTemplate] =
    useState<DocumentTemplate | null>(null)

  const filteredDocuments = useMemo(() => {
    const keyword = requirementsSearch.trim().toLowerCase()

    if (!keyword) return documents

    return documents.filter((doc) =>
      (
        (doc.version || "") +
        (doc.name || "") +
        (doc.description || "") +
        (doc.status || "")
      )
        .toLowerCase()
        .includes(keyword)
    )
  }, [documents, requirementsSearch])

  const checkProjectPermission = async (permission: string) => {
    try {
      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return false
      }

      const res = await fetch(`${ACCESS_API_BASE_URL}/check`, {
        method: "POST",
        headers: createAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          permission,
          project_id: projectId,
        }),
      })

      const data = await res.json()

      if (!res.ok) return false

      return Boolean(data.allowed)
    } catch (error) {
      console.error(`Failed to check permission: ${permission}`, error)
      return false
    }
  }

  const checkRequirementPermissions = async () => {
    try {
      setPermissionLoading(true)

      const [viewAllowed, createAllowed, deleteAllowed] = await Promise.all([
        checkProjectPermission("requirements.view"),
        checkProjectPermission("requirements.create"),
        checkProjectPermission("requirements.delete"),
      ])

      setCanViewRequirements(viewAllowed)
      setCanCreateRequirements(createAllowed)
      setCanDeleteRequirements(deleteAllowed)

      return viewAllowed
    } finally {
      setPermissionLoading(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      setRequirementsLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents`,
        {
          method: "GET",
          credentials: "include",
          headers: createAuthHeaders(),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/signin")
          return
        }

        throw new Error(data.message || "Failed to fetch requirement documents")
      }

      setDocuments(data.documents || [])
    } catch (err: any) {
      setMessage(err.message || "Failed to fetch requirement documents")
    } finally {
      setRequirementsLoading(false)
    }
  }

  const fetchTemplate = async () => {
    try {
      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return
      }

      const res = await fetch(`${TEMPLATE_API_BASE_URL}/requirements/default`, {
        method: "GET",
        credentials: "include",
        headers: createAuthHeaders(),
      })

      const data = await res.json()

      if (res.ok) {
        setDefaultTemplate(data.template || null)
      }
    } catch {
      setDefaultTemplate(null)
    }
  }

  useEffect(() => {
    const initializeRequirementsTab = async () => {
      const canView = await checkRequirementPermissions()

      await fetchTemplate()

      if (canView) {
        await fetchDocuments()
      } else {
        setRequirementsLoading(false)
      }
    }

    initializeRequirementsTab()
  }, [projectId])

  const createDocument = async () => {
    if (!canCreateRequirements) {
      setMessage("You don't have permission to create requirement documents.")
      return
    }

    if (!defaultTemplate) {
      setMessage("Requirements template not found")
      return
    }

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents`,
        {
          method: "POST",
          credentials: "include",
          headers: createAuthHeaders(),
          body: JSON.stringify({
            template_id: defaultTemplate.id,
            status: "Draft",
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/signin")
          return
        }

        throw new Error(data.message || "Failed to create requirement document")
      }

      router.push(
        `/stakeholder/projects/requirements-document?id=${data.document.id}&projectId=${projectId}`
      )
    } catch (err: any) {
      setMessage(err.message || "Failed to create requirement document")
    } finally {
      setLoading(false)
    }
  }

  const confirmDeleteDocument = async () => {
    if (!canDeleteRequirements) {
      setMessage("You don't have permission to delete requirement documents.")
      return
    }

    if (!documentToDelete) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: createAuthHeaders(),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/signin")
          return
        }

        throw new Error(data.message || "Failed to delete requirement document")
      }

      setDocumentToDelete(null)
      setMessage(data.message || "Requirement document deleted successfully")

      await fetchDocuments()
    } catch (err: any) {
      setMessage(err.message || "Failed to delete requirement document")
    } finally {
      setLoading(false)
    }
  }

  if (permissionLoading) {
    return (
      <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
        Checking requirements permissions...
      </div>
    )
  }

  if (!canViewRequirements) {
    return (
      <div className="rounded-2xl bg-background p-8 text-center ring-1 ring-border">
        <h2 className="text-lg font-semibold text-foreground">
          Requirements access restricted
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view requirement documents for this project.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Requirements Documents
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a document first, then manage the requirements inside that document.
          </p>
        </div>

        {canCreateRequirements && (
          <button
            onClick={createDocument}
            disabled={loading || !defaultTemplate}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Document"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Total Documents
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {documents.length}
          </p>
        </div>

        <div className="w-full md:max-w-sm">
          <input
            type="text"
            value={requirementsSearch}
            onChange={(e) => setRequirementsSearch(e.target.value)}
            placeholder="Search version, name, description, or status..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {requirementsLoading ? (
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading requirement documents...
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-2xl bg-background p-10 text-center ring-1 ring-border">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ClipboardList className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>

          <h3 className="text-base font-semibold text-foreground">
            No Requirement Documents yet
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            Create a requirement document first before adding requirements.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-lg font-semibold text-foreground">
              Requirement Documents
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Each row represents one requirement document version.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Requirements</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date Created</th>
                  <th className="px-4 py-3 font-medium">Date Modified</th>
                  <th className="w-40 px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {doc.version}
                    </td>

                    <td className="px-4 py-3 text-foreground">
                      {doc.name || "-"}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {doc.description || "-"}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {doc.requirement_count}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {doc.status}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(doc.updated_at)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/stakeholder/projects/requirements-document?id=${doc.id}&projectId=${projectId}`
                            )
                          }
                          className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                          title="View Document"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canDeleteRequirements && (
                          <button
                            type="button"
                            onClick={() => setDocumentToDelete(doc)}
                            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            title="Delete Document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {documentToDelete && canDeleteRequirements && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Delete Requirement Document
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete version{" "}
              <span className="font-semibold text-foreground">
                {documentToDelete.version}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDocumentToDelete(null)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteDocument}
                disabled={loading}
                className="rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90 disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}