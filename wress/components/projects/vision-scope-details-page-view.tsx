"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Pencil } from "lucide-react"
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

type Props = {
  projectId: number
  documentId: number
}

const API_BASE_URL = "http://localhost:5000/api/business-analyst"
const TEMPLATE_API_BASE_URL = "http://localhost:5000/api/templates"

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

export default function VisionScopeDetailsPageView({
  projectId,
  documentId,
}: Props) {
  const router = useRouter()
  const { loading: permissionsLoading, hasPermission } = usePermissions()

  const canViewVisionScope = hasPermission("vision_scope.view")
  const canEditVisionScope = hasPermission("vision_scope.edit")

  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [document, setDocument] = useState<VisionScopeDocument | null>(null)
  const [documents, setDocuments] = useState<VisionScopeDocument[]>([])
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState("")
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({})

  const latestVisionScope = useMemo(() => documents[0] || null, [documents])

  const getFieldValueFromDocument = (fieldId: number) => {
    const value = document?.values?.find((item) => item.template_field_id === fieldId)
    return value?.value_text || ""
  }

  const fetchData = async () => {
    try {
      setFetching(true)
      setMessage("")

      const [templateRes, docsRes] = await Promise.all([
        fetch(`${TEMPLATE_API_BASE_URL}/vision_scope/default`, {
          method: "GET",
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/project/${projectId}/documents`, {
          method: "GET",
          credentials: "include",
        }),
      ])

      const templateData = await templateRes.json()
      const docsData = await docsRes.json()

      if (!templateRes.ok) {
        setMessage(templateData.message || "Failed to fetch template")
        return
      }

      if (!docsRes.ok) {
        setMessage(docsData.message || "Failed to fetch documents")
        return
      }

      const fetchedTemplate = templateData.template as DocumentTemplate
      const sortedDocuments = [...(docsData.documents || [])].sort((a, b) =>
        compareVersions(a.version, b.version)
      )

      const fetchedDocument =
        sortedDocuments.find((item: VisionScopeDocument) => item.id === documentId) || null

      setTemplate(fetchedTemplate)
      setDocuments(sortedDocuments)
      setDocument(fetchedDocument)

      const initialOpenSections: Record<number, boolean> = {}
      fetchedTemplate.sections.forEach((section) => {
        initialOpenSections[section.id] = true
      })
      setOpenSections(initialOpenSections)
    } catch (error) {
      console.error("Failed to fetch vision scope details:", error)
      setMessage("Failed to fetch vision scope details")
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (!permissionsLoading && canViewVisionScope) {
      fetchData()
    } else if (!permissionsLoading && !canViewVisionScope) {
      setFetching(false)
    }
  }, [permissionsLoading, canViewVisionScope, projectId, documentId])

  const toggleSection = (sectionId: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const SectionToggleIcon = ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />

  if (permissionsLoading) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading permissions...
        </div>
      </section>
    )
  }

  if (!canViewVisionScope) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          You do not have permission to view this document.
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
          Document not found.
        </div>
      </section>
    )
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/business-analyst/project/${projectId}?tab=vision-scope`)}
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
              Created {new Date(document.created_at).toLocaleDateString()} · Updated{" "}
              {new Date(document.updated_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {latestVisionScope && latestVisionScope.id !== document.id && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/business-analyst/project/${projectId}/vision-scope/${latestVisionScope.id}`
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Eye className="h-4 w-4" />
                View Latest Version
              </button>
            )}

            {canEditVisionScope && (
              <button
                type="button"
                onClick={() =>
                  router.push(`/business-analyst/project/${projectId}?tab=vision-scope`)
                }
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Pencil className="h-4 w-4" />
                Create New Version
              </button>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium text-muted-foreground">Version</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{document.version}</p>
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
          <h2 className="text-lg font-semibold text-foreground">Document Content</h2>
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
                      <p className="text-sm font-semibold text-foreground">{field.label}</p>

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