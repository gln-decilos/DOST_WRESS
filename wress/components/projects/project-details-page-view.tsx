"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react"
import usePermissions from "@/features/access/use-permissions"

type Project = {
  id: number
  name: string
  description: string
  status: string
  start_date?: string | null
  end_date?: string | null
  organization_id: number
  organization_name?: string | null
  created_at?: string
  updated_at?: string
}

type ProjectForm = {
  name: string
  description: string
  start_date: string
  end_date: string
  status: string
}

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

type VersionIncrementType = "minor" | "major"

const API_BASE_URL = "http://localhost:5000/api/business-analyst"
const TEMPLATE_API_BASE_URL = "http://localhost:5000/api/templates"

function getStatusClasses(status: string) {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200"
    case "In Progress":
      return "bg-amber-100 text-amber-700 ring-amber-200"
    case "Pending":
      return "bg-slate-100 text-slate-700 ring-slate-200"
    case "Archived":
      return "bg-red-100 text-red-700 ring-red-200"
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200"
  }
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

function getNextMinorVersion(version: string) {
  const { major, minor } = parseVersion(version)
  return `${major}.${minor + 1}`
}

function getNextMajorVersion(version: string) {
  const { major } = parseVersion(version)
  return `${major + 1}.0`
}

export default function ProjectDetailsPageView() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id

  const initialTab = searchParams.get("tab")
  const { loading: permissionsLoading, hasPermission } = usePermissions()

  const canViewProject = hasPermission("project.view")
  const canEditProject = hasPermission("project.edit")
  const canViewVisionScope = hasPermission("vision_scope.view")
  const canCreateVisionScope = hasPermission("vision_scope.create")
  const canEditVisionScope = hasPermission("vision_scope.edit")
  const canDeleteVisionScope = hasPermission("vision_scope.delete")

  const [project, setProject] = useState<Project | null>(null)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState<
    "overview" | "stakeholders" | "vision-scope" | "requirements"
  >(
    initialTab === "vision-scope"
      ? "vision-scope"
      : initialTab === "stakeholders"
        ? "stakeholders"
        : initialTab === "requirements"
          ? "requirements"
          : "overview"
  )
  const [isEditMode, setIsEditMode] = useState(false)

  const [projectForm, setProjectForm] = useState<ProjectForm>({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "Pending",
  })

  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)

  const [visionScopeDocuments, setVisionScopeDocuments] = useState<
    VisionScopeDocument[]
  >([])
  const [selectedVisionScopeIds, setSelectedVisionScopeIds] = useState<number[]>([])
  const [visionScopeToDelete, setVisionScopeToDelete] =
    useState<VisionScopeDocument | null>(null)

  const [isVisionScopeFormOpen, setIsVisionScopeFormOpen] = useState(false)
  const [isSaveVersionModalOpen, setIsSaveVersionModalOpen] = useState(false)

  const [visionScopeVersion, setVisionScopeVersion] = useState("")
  const [visionScopeValues, setVisionScopeValues] = useState<Record<string, string>>({})
  const [editingVisionScope, setEditingVisionScope] =
    useState<VisionScopeDocument | null>(null)

  const [openSections, setOpenSections] = useState<Record<number, boolean>>({})

  const draftVisionScope = useMemo(
    () => visionScopeDocuments.find((doc) => doc.status === "Draft") || null,
    [visionScopeDocuments]
  )

  const publishedVisionScopes = useMemo(
    () =>
      [...visionScopeDocuments]
        .filter((doc) => doc.status !== "Draft")
        .sort((a, b) => compareVersions(a.version, b.version)),
    [visionScopeDocuments]
  )

  const latestVisionScope = useMemo(
    () => publishedVisionScopes[0] || null,
    [publishedVisionScopes]
  )

  const previousVisionScopes = useMemo(
    () => publishedVisionScopes.slice(1),
    [publishedVisionScopes]
  )

  const getFieldValueFromDocument = (
    document: VisionScopeDocument,
    fieldId: number
  ) => {
    const value = document.values?.find((item) => item.template_field_id === fieldId)
    return value?.value_text || ""
  }

  const buildVisionScopeValuesFromDocument = (document: VisionScopeDocument) => {
    const values: Record<string, string> = {}

    if (!template) return values

    template.sections.forEach((section) => {
      section.fields.forEach((field) => {
        values[field.key] = getFieldValueFromDocument(document, field.id)
      })
    })

    return values
  }

  const resetOpenSections = () => {
    if (!template) return
    const initialOpenSections: Record<number, boolean> = {}
    template.sections.forEach((section) => {
      initialOpenSections[section.id] = true
    })
    setOpenSections(initialOpenSections)
  }

  const fetchProject = async () => {
    try {
      setFetching(true)
      setMessage("")

      const res = await fetch(`${API_BASE_URL}/project/${projectId}`, {
        method: "GET",
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to fetch project")
        return
      }

      setProject(data.project)
      setProjectForm({
        name: data.project.name || "",
        description: data.project.description || "",
        start_date: data.project.start_date || "",
        end_date: data.project.end_date || "",
        status: data.project.status || "Pending",
      })
    } catch (error) {
      console.error("Failed to fetch project:", error)
      setMessage("Failed to fetch project")
    } finally {
      setFetching(false)
    }
  }

  const fetchVisionScopeTemplate = async () => {
    try {
      setTemplateLoading(true)

      const res = await fetch(`${TEMPLATE_API_BASE_URL}/vision_scope/default`, {
        method: "GET",
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to fetch Vision & Scope template")
        return
      }

      const fetchedTemplate: DocumentTemplate = data.template
      setTemplate(fetchedTemplate)

      const initialOpenSections: Record<number, boolean> = {}
      fetchedTemplate.sections.forEach((section) => {
        initialOpenSections[section.id] = true
      })
      setOpenSections(initialOpenSections)
    } catch (error) {
      console.error("Failed to fetch Vision & Scope template:", error)
      setMessage("Failed to fetch Vision & Scope template")
    } finally {
      setTemplateLoading(false)
    }
  }

  const fetchVisionScopeDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/project/${projectId}/documents`, {
        method: "GET",
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to fetch Vision & Scope documents")
        return
      }

      setVisionScopeDocuments(data.documents || [])
    } catch (error) {
      console.error("Failed to fetch Vision & Scope documents:", error)
      setMessage("Failed to fetch Vision & Scope documents")
    }
  }

  useEffect(() => {
    if (!permissionsLoading && canViewProject && projectId) {
      fetchProject()
    } else if (!permissionsLoading && !canViewProject) {
      setFetching(false)
    }
  }, [permissionsLoading, canViewProject, projectId])

  useEffect(() => {
    if (!permissionsLoading && canViewVisionScope && projectId) {
      fetchVisionScopeTemplate()
      fetchVisionScopeDocuments()
    }
  }, [permissionsLoading, canViewVisionScope, projectId])

  const handleProjectChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setProjectForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleDynamicVisionScopeChange = (fieldKey: string, value: string) => {
    setVisionScopeValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const res = await fetch(`${API_BASE_URL}/project/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: projectForm.name,
          description: projectForm.description,
          start_date: projectForm.start_date || null,
          end_date: projectForm.end_date || null,
          status: projectForm.status,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to update project")
        return
      }

      setMessage(data.message || "Project updated successfully")
      setIsEditMode(false)
      await fetchProject()
    } catch (error) {
      console.error("Failed to update project:", error)
      setMessage("Failed to update project")
    } finally {
      setLoading(false)
    }
  }

  const openCreateVisionScopeForm = () => {
    if (!template || (!canCreateVisionScope && !canEditVisionScope)) return

    const initialValues: Record<string, string> = {}

    if (draftVisionScope) {
      Object.assign(initialValues, buildVisionScopeValuesFromDocument(draftVisionScope))
      setEditingVisionScope(draftVisionScope)
      setVisionScopeVersion(draftVisionScope.version || "Draft")
    } else if (latestVisionScope) {
      Object.assign(initialValues, buildVisionScopeValuesFromDocument(latestVisionScope))
      setEditingVisionScope(null)
      setVisionScopeVersion(latestVisionScope.version)
    } else {
      template.sections.forEach((section) => {
        section.fields.forEach((field) => {
          initialValues[field.key] = field.default_value || ""
        })
      })
      setEditingVisionScope(null)
      setVisionScopeVersion("Draft")
    }

    setVisionScopeValues(initialValues)
    setIsVisionScopeFormOpen(true)
    setIsSaveVersionModalOpen(false)
    resetOpenSections()
    setMessage("")
  }

  const openEditVisionScopeForm = (document: VisionScopeDocument) => {
    if (!canEditVisionScope || !template) return

    setEditingVisionScope(document)
    setVisionScopeValues(buildVisionScopeValuesFromDocument(document))
    setVisionScopeVersion(document.status === "Draft" ? "Draft" : document.version)
    setIsVisionScopeFormOpen(true)
    setIsSaveVersionModalOpen(false)
    resetOpenSections()
    setMessage("")
  }

  const closeCreateVisionScopeForm = () => {
    setVisionScopeVersion("")
    setVisionScopeValues({})
    setEditingVisionScope(null)
    setIsVisionScopeFormOpen(false)
    setIsSaveVersionModalOpen(false)
  }

  const buildValuesPayload = () => {
    if (!template) return []

    return template.sections.flatMap((section) =>
      section.fields.map((field) => ({
        template_field_id: field.id,
        value_text: visionScopeValues[field.key] || "",
      }))
    )
  }

  const saveVisionScopeDraft = async () => {
    if (!template) {
      setMessage("Template not found")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const valuesPayload = buildValuesPayload()

      if (editingVisionScope?.status === "Draft") {
        const res = await fetch(
          `${API_BASE_URL}/project/${projectId}/documents/${editingVisionScope.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              status: "Draft",
              values: valuesPayload,
            }),
          }
        )

        const data = await res.json()

        if (!res.ok) {
          setMessage(data.message || "Failed to save draft")
          return
        }

        setMessage(data.message || "Draft updated successfully")
      } else {
        const res = await fetch(`${API_BASE_URL}/project/${projectId}/documents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            template_id: template.id,
            version: "Draft",
            status: "Draft",
            based_on_document_id: editingVisionScope?.id || latestVisionScope?.id || null,
            values: valuesPayload,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setMessage(data.message || "Failed to save draft")
          return
        }

        setMessage(data.message || "Draft saved successfully")
      }

      closeCreateVisionScopeForm()
      await fetchVisionScopeDocuments()
    } catch (error) {
      console.error("Failed to save draft:", error)
      setMessage("Failed to save draft")
    } finally {
      setLoading(false)
    }
  }

  const saveVisionScopeVersion = async (incrementType: VersionIncrementType) => {
    if (!template) {
      setMessage("Template not found")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const baseVersion = latestVisionScope?.version || "1.0"
      const computedVersion = latestVisionScope
        ? incrementType === "major"
          ? getNextMajorVersion(baseVersion)
          : getNextMinorVersion(baseVersion)
        : "1.0"

      const valuesPayload = buildValuesPayload()

      if (editingVisionScope?.status === "Draft") {
        const res = await fetch(
          `${API_BASE_URL}/project/${projectId}/documents/${editingVisionScope.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              version: computedVersion,
              status: "Published",
              values: valuesPayload,
            }),
          }
        )

        const data = await res.json()

        if (!res.ok) {
          setMessage(data.message || "Failed to publish version")
          return
        }

        setMessage(data.message || `Vision & Scope published as version ${computedVersion}`)
      } else {
        const res = await fetch(`${API_BASE_URL}/project/${projectId}/documents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            template_id: template.id,
            version: computedVersion,
            status: "Published",
            based_on_document_id: latestVisionScope?.id || null,
            values: valuesPayload,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setMessage(data.message || "Failed to save Vision & Scope version")
          return
        }

        setMessage(
          data.message ||
            (!latestVisionScope
              ? "Initial Vision & Scope version created successfully"
              : `Vision & Scope saved as version ${computedVersion}`)
        )
      }

      setIsSaveVersionModalOpen(false)
      closeCreateVisionScopeForm()
      await fetchVisionScopeDocuments()
    } catch (error) {
      console.error("Failed to save vision & scope version:", error)
      setMessage("Failed to save vision & scope version")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenPublishModal = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!template) {
      setMessage("Template not found")
      return
    }

    if (!latestVisionScope) {
      await saveVisionScopeVersion("minor")
      return
    }

    setIsSaveVersionModalOpen(true)
  }

  const toggleVisionScopeSelection = (id: number) => {
    setSelectedVisionScopeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAllVisionScopes = () => {
    if (
      previousVisionScopes.length > 0 &&
      selectedVisionScopeIds.length === previousVisionScopes.length
    ) {
      setSelectedVisionScopeIds([])
      return
    }

    setSelectedVisionScopeIds(previousVisionScopes.map((doc) => doc.id))
  }

  const confirmDeleteVisionScope = async () => {
    if (!visionScopeToDelete) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/documents/${visionScopeToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to delete Vision & Scope version")
        return
      }

      const deletedId = visionScopeToDelete.id

      setVisionScopeToDelete(null)
      setSelectedVisionScopeIds((prev) => prev.filter((id) => id !== deletedId))
      setMessage(data.message || "Vision & Scope version deleted successfully")
      await fetchVisionScopeDocuments()
    } catch (error) {
      console.error("Failed to delete vision & scope:", error)
      setMessage("Failed to delete vision & scope")
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (sectionId: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const SectionToggleIcon = ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />

  const tabButtonClasses = (tab: string) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      activeTab === tab
        ? "bg-primary text-primary-foreground"
        : "border border-border text-foreground hover:bg-muted"
    }`

  if (permissionsLoading) {
    return (
      <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading permissions...
        </div>
      </section>
    )
  }

  if (!canViewProject) {
    return (
      <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          You do not have permission to view this project.
        </div>
      </section>
    )
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            onClick={() => router.push("/business-analyst/project")}
            className="mb-3 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Back to Projects
          </button>

          <h1 className="text-2xl font-semibold text-foreground">
            {project?.name || "Project Details"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            View project overview, stakeholders, vision and scope, and requirements.
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <button
          onClick={() => setActiveTab("overview")}
          className={tabButtonClasses("overview")}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab("stakeholders")}
          className={tabButtonClasses("stakeholders")}
        >
          Stakeholders
        </button>

        <button
          onClick={() => setActiveTab("vision-scope")}
          className={tabButtonClasses("vision-scope")}
        >
          Vision & Scope
        </button>

        <button
          onClick={() => setActiveTab("requirements")}
          className={tabButtonClasses("requirements")}
        >
          Requirements
        </button>
      </div>

      {fetching ? (
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading project details...
        </div>
      ) : !project ? (
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Project not found.
        </div>
      ) : activeTab === "overview" ? (
        <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Project details and basic information.
              </p>
            </div>

            {!isEditMode && canEditProject && (
              <button
                onClick={() => setIsEditMode(true)}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Edit
              </button>
            )}
          </div>

          {isEditMode ? (
            <form onSubmit={handleUpdateProject} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Project Title
                </label>
                <input
                  type="text"
                  name="name"
                  value={projectForm.name}
                  onChange={handleProjectChange}
                  required
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  name="description"
                  value={projectForm.description}
                  onChange={handleProjectChange}
                  rows={5}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Status
                </label>
                <select
                  name="status"
                  value={projectForm.status}
                  onChange={handleProjectChange}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={projectForm.start_date}
                    onChange={handleProjectChange}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={projectForm.end_date}
                    onChange={handleProjectChange}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false)
                    setProjectForm({
                      name: project.name || "",
                      description: project.description || "",
                      start_date: project.start_date || "",
                      end_date: project.end_date || "",
                      status: project.status || "Pending",
                    })
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Title</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{project.name}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="mt-1 text-foreground">
                  {project.description || "No description provided."}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusClasses(project.status)}`}
                  >
                    {project.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="mt-1 text-foreground">{project.start_date || "-"}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="mt-1 text-foreground">{project.end_date || "-"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "stakeholders" ? (
        <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
          <h2 className="text-xl font-semibold text-foreground">Stakeholders</h2>
          <p className="mt-2 text-muted-foreground">
            Add stakeholder list here later.
          </p>
        </div>
      ) : activeTab === "vision-scope" ? (
        !canViewVisionScope ? (
          <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
            <h2 className="text-xl font-semibold text-foreground">Vision & Scope</h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to view vision and scope documents.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Vision & Scope</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Define the business direction before building requirements.
                </p>
              </div>

              {!isVisionScopeFormOpen && (canCreateVisionScope || canEditVisionScope) && (
                <button
                  onClick={openCreateVisionScopeForm}
                  disabled={!template || templateLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {templateLoading
                    ? "Loading Template..."
                    : draftVisionScope
                      ? "Continue Draft"
                      : visionScopeDocuments.length === 0
                        ? "Create Vision & Scope"
                        : "Create New Draft"}
                </button>
              )}
            </div>

            {isVisionScopeFormOpen && template && (
              <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {editingVisionScope?.status === "Draft"
                        ? "Edit Draft Vision & Scope"
                        : latestVisionScope
                          ? "Create New Draft"
                          : "Create Vision & Scope"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Drafts stay editable until you publish them as a version.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleOpenPublishModal} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Current State
                    </label>
                    <input
                      type="text"
                      value={
                        editingVisionScope?.status === "Draft"
                          ? "Draft"
                          : latestVisionScope
                            ? `Based on version ${latestVisionScope.version}`
                            : "New draft"
                      }
                      readOnly
                      className="w-full cursor-not-allowed rounded-lg border border-border bg-muted px-3 py-2 text-foreground"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Draft does not create a version yet. Publish when ready.
                    </p>
                  </div>

                  {template.sections.map((section) => (
                    <div key={section.id} className="rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
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
                        <div className="space-y-4 border-t border-border px-4 py-4">
                          {section.fields.map((field) => (
                            <div key={field.id}>
                              <label className="mb-1 block text-sm font-medium text-foreground">
                                {field.label}
                                {field.is_required && (
                                  <span className="ml-1 text-red-500">*</span>
                                )}
                              </label>

                              {field.field_type === "textarea" ? (
                                <textarea
                                  value={visionScopeValues[field.key] || ""}
                                  onChange={(e) =>
                                    handleDynamicVisionScopeChange(field.key, e.target.value)
                                  }
                                  rows={4}
                                  placeholder={field.placeholder || ""}
                                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                                  required={field.is_required}
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={visionScopeValues[field.key] || ""}
                                  onChange={(e) =>
                                    handleDynamicVisionScopeChange(field.key, e.target.value)
                                  }
                                  placeholder={field.placeholder || ""}
                                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                                  required={field.is_required}
                                />
                              )}

                              {field.help_text && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {field.help_text}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={saveVisionScopeDraft}
                      disabled={loading}
                      className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted disabled:opacity-60"
                    >
                      {loading ? "Saving..." : "Save as Draft"}
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {loading ? "Saving..." : "Save Version"}
                    </button>

                    <button
                      type="button"
                      onClick={closeCreateVisionScopeForm}
                      className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
                    >
                      Back to Vision & Scope
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!isVisionScopeFormOpen && (
              <div className="space-y-6">
                {draftVisionScope && (
                  <div className="rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-200">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-amber-900">
                          Draft in Progress
                        </h3>
                        <p className="mt-1 text-sm text-amber-800">
                          This draft is still editable and has not been published as a version.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          Draft
                        </span>

                        {canEditVisionScope && (
                          <button
                            type="button"
                            onClick={() => openEditVisionScopeForm(draftVisionScope)}
                            className="rounded-lg border border-amber-300 bg-white p-2 text-amber-800 hover:bg-amber-100"
                            title="Edit Draft"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}

                        {canDeleteVisionScope && (
                          <button
                            type="button"
                            onClick={() => setVisionScopeToDelete(draftVisionScope)}
                            className="rounded-lg border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"
                            title="Delete Draft"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <p className="text-sm font-medium text-amber-700">Status</p>
                        <p className="mt-1 text-lg font-semibold text-amber-900">Draft</p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <p className="text-sm font-medium text-amber-700">Created</p>
                        <p className="mt-1 text-amber-900">
                          {new Date(draftVisionScope.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <p className="text-sm font-medium text-amber-700">Last Updated</p>
                        <p className="mt-1 text-amber-900">
                          {new Date(draftVisionScope.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {latestVisionScope ? (
                  <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          Latest Published Version
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Most recent published Vision & Scope version for this project.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          Version {latestVisionScope.version}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/business-analyst/project/${projectId}/vision-scope/${latestVisionScope.id}`
                            )
                          }
                          className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                          title="View Latest Version"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canEditVisionScope && !draftVisionScope && (
                          <button
                            type="button"
                            onClick={openCreateVisionScopeForm}
                            className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                            title="Create Draft From Latest Version"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}

                        {canDeleteVisionScope && (
                          <button
                            type="button"
                            onClick={() => setVisionScopeToDelete(latestVisionScope)}
                            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            title="Delete Latest Version"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-sm font-medium text-muted-foreground">Version</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {latestVisionScope.version}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-sm font-medium text-muted-foreground">Created</p>
                        <p className="mt-1 text-foreground">
                          {new Date(latestVisionScope.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-sm font-medium text-muted-foreground">
                          Last Updated
                        </p>
                        <p className="mt-1 text-foreground">
                          {new Date(latestVisionScope.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : !draftVisionScope ? (
                  <div className="rounded-2xl bg-background p-10 text-center ring-1 ring-border">
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <ClipboardList className="h-7 w-7 text-muted-foreground" />
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-foreground">
                      No Vision & Scope Document yet
                    </h3>

                    <p className="mt-2 text-sm text-muted-foreground">
                      Start defining your project vision and scope to guide requirement
                      development.
                    </p>
                  </div>
                ) : null}

                {previousVisionScopes.length > 0 && (
                  <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border">
                    <div className="border-b border-border px-6 py-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Previous Versions
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        View earlier published versions of the Vision & Scope document.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/40 text-left text-foreground">
                          <tr>
                            <th className="w-14 px-4 py-3 font-medium">
                              <input
                                type="checkbox"
                                checked={
                                  previousVisionScopes.length > 0 &&
                                  selectedVisionScopeIds.length ===
                                    previousVisionScopes.length
                                }
                                onChange={toggleSelectAllVisionScopes}
                              />
                            </th>
                            <th className="px-4 py-3 font-medium">Version</th>
                            <th className="px-4 py-3 font-medium">Date Created</th>
                            <th className="px-4 py-3 font-medium">Date Modified</th>
                            <th className="w-40 px-4 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {previousVisionScopes.map((document) => (
                            <tr
                              key={document.id}
                              className="cursor-pointer border-t border-border hover:bg-muted/30"
                              onClick={() =>
                                router.push(
                                  `/business-analyst/project/${projectId}/vision-scope/${document.id}`
                                )
                              }
                            >
                              <td
                                className="px-4 py-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedVisionScopeIds.includes(document.id)}
                                  onChange={() => toggleVisionScopeSelection(document.id)}
                                />
                              </td>

                              <td className="px-4 py-3 font-medium text-foreground">
                                {document.version}
                              </td>

                              <td className="px-4 py-3 text-muted-foreground">
                                {new Date(document.created_at).toLocaleDateString()}
                              </td>

                              <td className="px-4 py-3 text-muted-foreground">
                                {new Date(document.updated_at).toLocaleDateString()}
                              </td>

                              <td
                                className="px-4 py-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      router.push(
                                        `/business-analyst/project/${projectId}/vision-scope/${document.id}`
                                      )
                                    }
                                    className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                                    title="View Version"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  {canDeleteVisionScope && (
                                    <button
                                      type="button"
                                      onClick={() => setVisionScopeToDelete(document)}
                                      className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                      title="Delete Version"
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
              </div>
            )}
          </div>
        )
      ) : (
        <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
          <h2 className="text-xl font-semibold text-foreground">Requirements</h2>
          <p className="mt-2 text-muted-foreground">
            Add project requirements here later.
          </p>
        </div>
      )}

      {isSaveVersionModalOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Save as Published Version
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Choose how the system should version this Vision & Scope document.
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => saveVisionScopeVersion("minor")}
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
                onClick={() => saveVisionScopeVersion("major")}
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
                onClick={() => setIsSaveVersionModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {visionScopeToDelete && canDeleteVisionScope && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Delete Vision & Scope {visionScopeToDelete.status === "Draft" ? "Draft" : "Version"}
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {visionScopeToDelete.status === "Draft"
                  ? "this draft"
                  : visionScopeToDelete.version}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setVisionScopeToDelete(null)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteVisionScope}
                disabled={loading}
                className="rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90 disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}