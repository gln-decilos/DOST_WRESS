"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, ChevronLeft, ChevronRight, Pencil } from "lucide-react"

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

type VisionScopeDocument = {
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

type DocumentContextResponse = {
  document: VisionScopeDocument
  template: DocumentTemplate | null
  latest_default_template: DocumentTemplate | null
  has_template_update: boolean
  is_template_inactive?: boolean
}

const API_BASE_URL = "http://localhost:5000/api/business-analyst"
const ACCESS_API_BASE_URL = "http://localhost:5000/api/access"

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

function normalizeVersion(version: string) {
  return version.replace(/^v/i, "").trim()
}

function parseVersion(version: string) {
  const clean = normalizeVersion(version)
  const [majorStr, minorStr] = clean.split(".")
  const major = Number(majorStr || 1)
  const minor = Number(minorStr || 0)

  return {
    major: Number.isNaN(major) ? 1 : major,
    minor: Number.isNaN(minor) ? 0 : minor,
  }
}

function compareVersions(a: string, b: string) {
  const va = parseVersion(a)
  const vb = parseVersion(b)

  if (va.major !== vb.major) return vb.major - va.major

  return vb.minor - va.minor
}

async function readJsonResponse(res: Response) {
  const text = await res.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Expected JSON but received: ${text.slice(0, 80)}`)
  }
}

export default function VisionScopePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const id = searchParams.get("id")
  const documentIdParam = searchParams.get("documentId")

  const projectId = id ? Number(id) : null
  const documentId = documentIdParam ? Number(documentIdParam) : null

  const [canViewVisionScope, setCanViewVisionScope] = useState(false)
  const [canCreateVisionScope, setCanCreateVisionScope] = useState(false)
  const [canUpdateVisionScope, setCanUpdateVisionScope] = useState(false)
  const [permissionLoading, setPermissionLoading] = useState(true)

  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [document, setDocument] = useState<VisionScopeDocument | null>(null)
  const [documents, setDocuments] = useState<VisionScopeDocument[]>([])
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState("")
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({})

  const draftVisionScope = useMemo(() => {
    return documents.find((item) => item.status === "Draft") || null
  }, [documents])

  const publishedVisionScopes = useMemo(() => {
    return [...documents]
      .filter((item) => item.status !== "Draft")
      .sort((a, b) => compareVersions(a.version, b.version))
  }, [documents])

  const latestVisionScope = useMemo(() => {
    return publishedVisionScopes[0] || null
  }, [publishedVisionScopes])

  const canCreateNewVersion = draftVisionScope
    ? canUpdateVisionScope
    : canCreateVisionScope

  const getFieldValueFromDocument = (fieldId: number) => {
    const value = document?.values?.find(
      (item) => item.template_field_id === fieldId
    )

    return value?.value_text || ""
  }

  const checkProjectPermission = async (permission: string) => {
    if (!projectId || isNaN(projectId)) return false

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

  const checkVisionScopePermissions = async () => {
    if (!projectId || isNaN(projectId)) {
      setCanViewVisionScope(false)
      setCanCreateVisionScope(false)
      setCanUpdateVisionScope(false)
      setPermissionLoading(false)
      return
    }

    try {
      setPermissionLoading(true)

      const [viewAllowed, createAllowed, updateAllowed] = await Promise.all([
        checkProjectPermission("vision_scope.view"),
        checkProjectPermission("vision_scope.create"),
        checkProjectPermission("vision_scope.update"),
      ])

      setCanViewVisionScope(viewAllowed)
      setCanCreateVisionScope(createAllowed)
      setCanUpdateVisionScope(updateAllowed)
    } finally {
      setPermissionLoading(false)
    }
  }

  const fetchData = async () => {
    if (!projectId || !documentId) {
      setFetching(false)
      setMessage(`Invalid IDs: projectId=${projectId}, documentId=${documentId}`)
      return
    }

    try {
      setFetching(true)
      setMessage("")

      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return
      }

      const documentUrl = `${API_BASE_URL}/project/${projectId}/vision-scope/documents/${documentId}`
      const documentsUrl = `${API_BASE_URL}/project/${projectId}/vision-scope/documents`

      const [documentRes, docsRes] = await Promise.all([
        fetch(documentUrl, {
          method: "GET",
          credentials: "include",
          headers: createAuthHeaders(),
        }),
        fetch(documentsUrl, {
          method: "GET",
          credentials: "include",
          headers: createAuthHeaders(),
        }),
      ])

      const documentData =
        (await readJsonResponse(documentRes)) as DocumentContextResponse | null
      const docsData = await readJsonResponse(docsRes)

      if (!documentRes.ok) {
        if (documentRes.status === 401) {
          router.push("/signin")
          return
        }

        setMessage(
          (documentData as any)?.message ||
            `Failed to fetch document (Status: ${documentRes.status})`
        )
        return
      }

      if (!docsRes.ok) {
        if (docsRes.status === 401) {
          router.push("/signin")
          return
        }

        setMessage(
          docsData?.message ||
            `Failed to fetch documents (Status: ${docsRes.status})`
        )
        return
      }

      if (!documentData?.template) {
        setMessage("Template not found for this document")
        return
      }

      setTemplate(documentData.template)
      setDocument(documentData.document)
      setDocuments(Array.isArray(docsData?.documents) ? docsData.documents : [])

      const initialOpenSections: Record<number, boolean> = {}

      documentData.template.sections.forEach((section) => {
        initialOpenSections[section.id] = true
      })

      setOpenSections(initialOpenSections)
    } catch (error) {
      console.error("Failed to fetch vision scope details:", error)
      setMessage(
        `Failed to fetch vision scope details: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (projectId && !isNaN(projectId) && projectId > 0) {
      checkVisionScopePermissions()
    }
  }, [projectId])

  useEffect(() => {
    if (projectId && documentId) {
      fetchData()
    } else if (projectId === null || documentId === null) {
      setFetching(false)
      setMessage(`Missing parameters: id=${id}, documentId=${documentIdParam}`)
    }
  }, [projectId, documentId])

  const toggleSection = (sectionId: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const SectionToggleIcon = ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? (
      <ChevronDown className="h-4 w-4" />
    ) : (
      <ChevronRight className="h-4 w-4" />
    )

  if (!id || !documentIdParam) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center ring-1 ring-border">
          <h2 className="mb-4 text-xl font-semibold text-red-600">
            Missing Parameters
          </h2>

          <p className="mb-2 text-muted-foreground">
            Unable to load the Vision & Scope document.
          </p>

          <p className="mb-4 text-sm text-muted-foreground">
            Expected URL format:{" "}
            <code className="rounded bg-muted px-2 py-1">
              /stakeholder/projects/vision-scope?id=PROJECT_ID&documentId=DOCUMENT_ID
            </code>
          </p>

          <p className="text-xs text-muted-foreground">
            Received: id={id || "undefined"}, documentId=
            {documentIdParam || "undefined"}
          </p>

          <button
            onClick={() => router.push("/stakeholder/projects/projects-page")}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Go Back to Projects
          </button>
        </div>
      </section>
    )
  }

  if (fetching) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading vision & scope document...
        </div>
      </section>
    )
  }

  if (!template || !document) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          {message || "Document not found."}
        </div>
      </section>
    )
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6">
        <button
          onClick={() =>
            router.push(
              `/stakeholder/projects/project-details?id=${projectId}&tab=vision-scope`
            )
          }
          className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Vision & Scope
        </button>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Vision & Scope {document.version}
            </h1>

            <p className="mt-2 text-muted-foreground">
              Created {new Date(document.created_at).toLocaleDateString()} ·
              Updated {new Date(document.updated_at).toLocaleDateString()}
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              Template used:{" "}
              <span className="font-medium text-foreground">
                {template.name}
              </span>
            </p>
          </div>

          {!permissionLoading && canViewVisionScope && canCreateNewVersion && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/stakeholder/projects/project-details?id=${projectId}&tab=vision-scope`
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Pencil className="h-4 w-4" />
                {draftVisionScope ? "Continue Draft" : "Create New Version"}
              </button>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      {!permissionLoading && !canViewVisionScope && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          You do not have permission to view Vision & Scope documents.
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium text-muted-foreground">Version</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {document.version}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium text-muted-foreground">Created</p>
          <p className="mt-1 text-foreground">
            {new Date(document.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium text-muted-foreground">Updated</p>
          <p className="mt-1 text-foreground">
            {new Date(document.updated_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-background ring-1 ring-border">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Document Content
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Review the full Vision & Scope document below.
          </p>
        </div>

        <div className="space-y-4 p-4 md:p-6">
          {template.sections.map((section) => (
            <div key={section.id} className="rounded-xl border border-border bg-card">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <div>
                  <p className="font-medium text-foreground">{section.title}</p>

                  {section.description && (
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  )}
                </div>

                <SectionToggleIcon isOpen={openSections[section.id]} />
              </button>

              {openSections[section.id] && (
                <div className="space-y-5 border-t border-border px-4 py-4">
                  {section.fields.map((field) => (
                    <div key={field.id}>
                      <p className="text-sm font-semibold text-foreground">
                        {field.label}
                      </p>

                      <div className="mt-2 rounded-lg border border-border bg-background px-4 py-3">
                        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                          {getFieldValueFromDocument(field.id) || "-"}
                        </p>
                      </div>

                      {field.help_text && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {field.help_text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}