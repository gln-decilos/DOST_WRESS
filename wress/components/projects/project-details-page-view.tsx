"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react"

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

type VisionScopeDocument = {
  id: number
  version: string
  background: string
  business_opportunity: string
  business_objectives: string
  success_metrics: string
  project_vision_statement: string
  scope_and_limitations: string
  stakeholders_profile: string
  business_context: string
  created_at: string
  updated_at: string
}

type VisionScopeForm = {
  version: string
  background: string
  business_opportunity: string
  business_objectives: string
  success_metrics: string
  project_vision_statement: string
  scope_and_limitations: string
  stakeholders_profile: string
  business_context: string
}

const API_BASE_URL = "http://localhost:5000/api/business-analyst"

const emptyVisionScopeForm: VisionScopeForm = {
  version: "",
  background: "",
  business_opportunity: "",
  business_objectives: "",
  success_metrics: "",
  project_vision_statement: "",
  scope_and_limitations: "",
  stakeholders_profile: "",
  business_context: "",
}

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

export default function ProjectDetailsPageView() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id

  const [project, setProject] = useState<Project | null>(null)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState<
    "overview" | "stakeholders" | "vision-scope" | "requirements"
  >("overview")
  const [isEditMode, setIsEditMode] = useState(false)

  const [projectForm, setProjectForm] = useState<ProjectForm>({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "Pending",
  })

  const [visionScopeDocuments, setVisionScopeDocuments] = useState<
    VisionScopeDocument[]
  >([])
  const [selectedVisionScopeIds, setSelectedVisionScopeIds] = useState<number[]>(
    []
  )
  const [visionScopeToDelete, setVisionScopeToDelete] =
    useState<VisionScopeDocument | null>(null)

  const [isVisionScopeFormOpen, setIsVisionScopeFormOpen] = useState(false)
  const [visionScopeForm, setVisionScopeForm] =
    useState<VisionScopeForm>(emptyVisionScopeForm)

  const [openSections, setOpenSections] = useState({
    businessRequirements: true,
    scopeAndLimitations: true,
    businessContext: true,
  })

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

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const handleProjectChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setProjectForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleVisionScopeChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setVisionScopeForm((prev) => ({
      ...prev,
      [name]: value,
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
    setVisionScopeForm(emptyVisionScopeForm)
    setIsVisionScopeFormOpen(true)
    setOpenSections({
      businessRequirements: true,
      scopeAndLimitations: true,
      businessContext: true,
    })
    setMessage("")
  }

  const closeCreateVisionScopeForm = () => {
    setVisionScopeForm(emptyVisionScopeForm)
    setIsVisionScopeFormOpen(false)
  }

  const handleCreateVisionScope = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const now = new Date().toISOString()

      const newDocument: VisionScopeDocument = {
        id: Date.now(),
        version: visionScopeForm.version || `v${visionScopeDocuments.length + 1}.0`,
        background: visionScopeForm.background,
        business_opportunity: visionScopeForm.business_opportunity,
        business_objectives: visionScopeForm.business_objectives,
        success_metrics: visionScopeForm.success_metrics,
        project_vision_statement: visionScopeForm.project_vision_statement,
        scope_and_limitations: visionScopeForm.scope_and_limitations,
        stakeholders_profile: visionScopeForm.stakeholders_profile,
        business_context: visionScopeForm.business_context,
        created_at: now,
        updated_at: now,
      }

      setVisionScopeDocuments((prev) => [newDocument, ...prev])
      setMessage("Vision & Scope document created successfully")
      closeCreateVisionScopeForm()
    } catch (error) {
      console.error("Failed to create vision & scope:", error)
      setMessage("Failed to create vision & scope")
    } finally {
      setLoading(false)
    }
  }

  const toggleVisionScopeSelection = (id: number) => {
    setSelectedVisionScopeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAllVisionScopes = () => {
    if (
      visionScopeDocuments.length > 0 &&
      selectedVisionScopeIds.length === visionScopeDocuments.length
    ) {
      setSelectedVisionScopeIds([])
      return
    }

    setSelectedVisionScopeIds(visionScopeDocuments.map((doc) => doc.id))
  }

  const confirmDeleteVisionScope = () => {
    if (!visionScopeToDelete) return

    setVisionScopeDocuments((prev) =>
      prev.filter((doc) => doc.id !== visionScopeToDelete.id)
    )
    setSelectedVisionScopeIds((prev) =>
      prev.filter((id) => id !== visionScopeToDelete.id)
    )
    setVisionScopeToDelete(null)
    setMessage("Vision & Scope document deleted successfully")
  }

  const toggleSection = (
    section: "businessRequirements" | "scopeAndLimitations" | "businessContext"
  ) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
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

            {!isEditMode && (
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
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Vision & Scope</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Define the business direction before building requirements.
              </p>
            </div>

            {!isVisionScopeFormOpen && (
              <button
                onClick={openCreateVisionScopeForm}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Create Vision & Scope
              </button>
            )}
          </div>

          {isVisionScopeFormOpen && (
            <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Create Vision & Scope
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fill in the sections below to define the project direction.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateVisionScope} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Version
                  </label>
                  <input
                    type="text"
                    name="version"
                    value={visionScopeForm.version}
                    onChange={handleVisionScopeChange}
                    placeholder="e.g. v1.0"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                  />
                </div>

                <div className="rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => toggleSection("businessRequirements")}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        1. Business Requirements
                      </p>
                      <p className="text-sm text-muted-foreground">
                        1.1 to 1.5
                      </p>
                    </div>
                    <SectionToggleIcon isOpen={openSections.businessRequirements} />
                  </button>

                  {openSections.businessRequirements && (
                    <div className="space-y-4 border-t border-border px-4 py-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          1.1 Background
                        </label>
                        <textarea
                          name="background"
                          value={visionScopeForm.background}
                          onChange={handleVisionScopeChange}
                          rows={4}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          1.2 Business Opportunity
                        </label>
                        <textarea
                          name="business_opportunity"
                          value={visionScopeForm.business_opportunity}
                          onChange={handleVisionScopeChange}
                          rows={4}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          1.3 Business Objectives
                        </label>
                        <textarea
                          name="business_objectives"
                          value={visionScopeForm.business_objectives}
                          onChange={handleVisionScopeChange}
                          rows={4}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          1.4 Success Metrics with Target Values
                        </label>
                        <textarea
                          name="success_metrics"
                          value={visionScopeForm.success_metrics}
                          onChange={handleVisionScopeChange}
                          rows={4}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          1.5 Project Vision Statement
                        </label>
                        <textarea
                          name="project_vision_statement"
                          value={visionScopeForm.project_vision_statement}
                          onChange={handleVisionScopeChange}
                          rows={4}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => toggleSection("scopeAndLimitations")}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        2. Scope and Limitations
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Includes stakeholders profile
                      </p>
                    </div>
                    <SectionToggleIcon isOpen={openSections.scopeAndLimitations} />
                  </button>

                  {openSections.scopeAndLimitations && (
                    <div className="space-y-4 border-t border-border px-4 py-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          2. Scope and Limitations
                        </label>
                        <textarea
                          name="scope_and_limitations"
                          value={visionScopeForm.scope_and_limitations}
                          onChange={handleVisionScopeChange}
                          rows={4}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          2.1 Stakeholders Profile
                        </label>
                        <textarea
                          name="stakeholders_profile"
                          value={visionScopeForm.stakeholders_profile}
                          onChange={handleVisionScopeChange}
                          rows={4}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => toggleSection("businessContext")}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        3. Business Context
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Market, competitors, constraints
                      </p>
                    </div>
                    <SectionToggleIcon isOpen={openSections.businessContext} />
                  </button>

                  {openSections.businessContext && (
                    <div className="border-t border-border px-4 py-4">
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        3. Business Context (market, competitors, constraints)
                      </label>
                      <textarea
                        name="business_context"
                        value={visionScopeForm.business_context}
                        onChange={handleVisionScopeChange}
                        rows={5}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {loading ? "Saving..." : "Save Vision & Scope"}
                  </button>

                  <button
                    type="button"
                    onClick={closeCreateVisionScopeForm}
                    className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {!isVisionScopeFormOpen && (
            <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40 text-left text-foreground">
                    <tr>
                      <th className="w-14 px-4 py-3 font-medium">
                        <input
                          type="checkbox"
                          checked={
                            visionScopeDocuments.length > 0 &&
                            selectedVisionScopeIds.length === visionScopeDocuments.length
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
                    {visionScopeDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                              <ClipboardList className="h-7 w-7 text-muted-foreground" />
                            </div>

                            <h3 className="text-base font-semibold text-foreground">
                              No Vision & Scope Document yet
                            </h3>

                            <p className="mt-2 max-w-md text-sm text-muted-foreground">
                              Start defining your project vision and scope to guide
                              requirement development.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      visionScopeDocuments.map((document) => (
                        <tr key={document.id} className="border-t border-border">
                          <td className="px-4 py-3">
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

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                                title="View Document"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                                title="Edit Document"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setVisionScopeToDelete(document)}
                                className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                title="Delete Document"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
          <h2 className="text-xl font-semibold text-foreground">Requirements</h2>
          <p className="mt-2 text-muted-foreground">
            Add project requirements here later.
          </p>
        </div>
      )}

      {visionScopeToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Delete Vision & Scope Document
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {visionScopeToDelete.version}
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
                className="rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}