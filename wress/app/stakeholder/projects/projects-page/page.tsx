"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, Eye, RotateCcw, Trash2 } from "lucide-react"

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
}

type UserOrganization = {
  id: number
  name: string
}

type SignedInUser = {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  organizations: UserOrganization[]
}

type ProjectPermissionState = {
  canView: boolean
  canUpdate: boolean
  canDelete: boolean
}

const API_BASE_URL = "http://localhost:5000/api/business-analyst"
const AUTH_API_BASE_URL = "http://localhost:5000/api/auth"
const ACCESS_API_BASE_URL = "http://localhost:5000/api/access"
const ITEMS_PER_PAGE = 6

const emptyProject: ProjectForm = {
  name: "",
  description: "",
  start_date: "",
  end_date: "",
}

const getAuthToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

const removeAuthToken = () => {
  if (typeof window === "undefined") return

  localStorage.removeItem("token")
  localStorage.removeItem("user")
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

export default function ProjectsPageView() {
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [activeView, setActiveView] = useState<"projects" | "archived">(
    "projects"
  )
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  const [permissionLoading, setPermissionLoading] = useState(true)
  const [canCreateProject, setCanCreateProject] = useState(false)
  const [projectPermissions, setProjectPermissions] = useState<
    Record<number, ProjectPermissionState>
  >({})

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)

  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject)
  const [userOrganization, setUserOrganization] =
    useState<UserOrganization | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const checkPermission = async (
    permission: string,
    projectId?: number | null
  ) => {
    try {
      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return false
      }

      const body =
        projectId && !Number.isNaN(projectId)
          ? {
              permission,
              project_id: projectId,
            }
          : {
              permission,
            }

      const res = await fetch(`${ACCESS_API_BASE_URL}/check`, {
        method: "POST",
        headers: createAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) return false

      return Boolean(data.allowed)
    } catch (error) {
      console.error(`Failed to check permission: ${permission}`, error)
      return false
    }
  }

  const checkCreateProjectPermission = async () => {
    const allowed = await checkPermission("project.create")
    setCanCreateProject(allowed)
  }

  const checkProjectActionPermissions = async (projectList: Project[]) => {
    try {
      setPermissionLoading(true)

      const permissionEntries = await Promise.all(
        projectList.map(async (project) => {
          const [canView, canUpdate, canDelete] = await Promise.all([
            checkPermission("project.view", project.id),
            checkPermission("project.edit", project.id),
            checkPermission("project.delete", project.id),
          ])

          return [
            project.id,
            {
              canView,
              canUpdate,
              canDelete,
            },
          ] as const
        })
      )

      setProjectPermissions(Object.fromEntries(permissionEntries))
    } finally {
      setPermissionLoading(false)
    }
  }

  const getProjectPermissions = (projectId: number) => {
    return (
      projectPermissions[projectId] || {
        canView: false,
        canUpdate: false,
        canDelete: false,
      }
    )
  }

  const fetchCurrentUser = async () => {
    try {
      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return
      }

      const res = await fetch(`${AUTH_API_BASE_URL}/me`, {
        method: "GET",
        headers: createAuthHeaders(),
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          removeAuthToken()
          router.push("/signin")
          return
        }

        setMessage(data.error || data.message || "Failed to fetch signed-in user.")
        return
      }

      const user: SignedInUser = data

      if (!user || !user.organizations || user.organizations.length === 0) {
        setMessage("No organization is assigned to this user.")
        return
      }

      setUserOrganization(user.organizations[0])
    } catch (error) {
      console.error("Failed to fetch current user:", error)
      setMessage("Failed to fetch signed-in user.")
    }
  }

  const fetchProjects = async () => {
    try {
      setFetching(true)
      setMessage("")

      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return
      }

      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: "GET",
        headers: createAuthHeaders(),
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          removeAuthToken()
          router.push("/signin")
          return
        }

        setMessage(data.message || "Failed to fetch projects")
        return
      }

      const projectList = Array.isArray(data) ? data : []

      setProjects(projectList)
      await checkProjectActionPermissions(projectList)
    } catch (error) {
      console.error("Failed to fetch projects:", error)
      setMessage("Failed to fetch projects")
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      setIsAuthChecking(true)
      setPermissionLoading(true)

      await fetchCurrentUser()
      await checkCreateProjectPermission()
      await fetchProjects()

      setIsAuthChecking(false)
    }

    initialize()
  }, [])

  const visibleProjects = useMemo(() => {
    if (permissionLoading) return []

    return projects.filter((project) => {
      const permissions = getProjectPermissions(project.id)
      return permissions.canView
    })
  }, [projects, projectPermissions, permissionLoading])

  const filteredProjects = useMemo(() => {
    if (activeView === "projects") {
      return visibleProjects.filter((project) => project.status !== "Archived")
    }

    return visibleProjects.filter((project) => project.status === "Archived")
  }, [visibleProjects, activeView])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / ITEMS_PER_PAGE)
  )

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE

    return filteredProjects.slice(startIndex, endIndex)
  }, [filteredProjects, currentPage])

  const openProjectDetails = (project: Project) => {
    const permissions = getProjectPermissions(project.id)

    if (!permissions.canView) {
      setMessage("You don't have permission to view this project.")
      return
    }

    router.push(`/stakeholder/projects/project-details?id=${project.id}`)
  }

  const openCreateModal = () => {
    if (!canCreateProject) {
      setMessage("You don't have permission to create projects.")
      return
    }

    setProjectForm(emptyProject)
    setMessage("")
    setIsCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    setProjectForm(emptyProject)
    setMessage("")
    setIsCreateModalOpen(false)
  }

  const openDeleteModal = (project: Project) => {
    const permissions = getProjectPermissions(project.id)

    if (!permissions.canDelete) {
      setMessage("You don't have permission to delete this project.")
      return
    }

    setSelectedProject(project)
    setMessage("")
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setSelectedProject(null)
    setIsDeleteModalOpen(false)
  }

  const openArchiveModal = (project: Project) => {
    const permissions = getProjectPermissions(project.id)

    if (!permissions.canUpdate) {
      setMessage(
        project.status === "Archived"
          ? "You don't have permission to unarchive this project."
          : "You don't have permission to archive this project."
      )
      return
    }

    setSelectedProject(project)
    setMessage("")
    setIsArchiveModalOpen(true)
  }

  const closeArchiveModal = () => {
    setSelectedProject(null)
    setIsArchiveModalOpen(false)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    setProjectForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canCreateProject) {
      setMessage("You don't have permission to create projects.")
      return
    }

    setLoading(true)
    setMessage("")

    if (!userOrganization) {
      setMessage("No organization found for the signed-in user.")
      setLoading(false)
      return
    }

    const token = getAuthToken()

    if (!token) {
      setMessage("Authentication required. Please login again.")
      setLoading(false)
      router.push("/signin")
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: createAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: projectForm.name,
          description: projectForm.description,
          start_date: projectForm.start_date || null,
          end_date: projectForm.end_date || null,
          status: "Pending",
          organization_id: userOrganization.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          removeAuthToken()
          router.push("/signin")
          return
        }

        setMessage(data.message || "Failed to create project")
        return
      }

      setMessage(data.message || "Project created successfully")
      setProjectForm(emptyProject)
      setIsCreateModalOpen(false)
      setCurrentPage(1)
      setActiveView("projects")

      await fetchProjects()
    } catch (error) {
      console.error("Failed to create project:", error)
      setMessage("Failed to create project")
    } finally {
      setLoading(false)
    }
  }

  const confirmArchiveToggle = async () => {
    if (!selectedProject) return

    const permissions = getProjectPermissions(selectedProject.id)

    if (!permissions.canUpdate) {
      setMessage(
        selectedProject.status === "Archived"
          ? "You don't have permission to unarchive this project."
          : "You don't have permission to archive this project."
      )
      return
    }

    try {
      setLoading(true)
      setMessage("")

      const isArchived = selectedProject.status === "Archived"
      const endpoint = isArchived
        ? `${API_BASE_URL}/project/${selectedProject.id}/unarchive`
        : `${API_BASE_URL}/project/${selectedProject.id}/archive`

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: createAuthHeaders(),
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          removeAuthToken()
          router.push("/signin")
          return
        }

        setMessage(
          data.message ||
            (isArchived
              ? "Failed to unarchive project"
              : "Failed to archive project")
        )
        return
      }

      setMessage(
        data.message ||
          (isArchived
            ? "Project unarchived successfully"
            : "Project archived successfully")
      )

      setCurrentPage(1)
      setActiveView(isArchived ? "projects" : "archived")

      await fetchProjects()
      closeArchiveModal()
    } catch (error) {
      console.error("Failed to update archive status:", error)
      setMessage("Failed to update project status")
    } finally {
      setLoading(false)
    }
  }

  const confirmDeleteProject = async () => {
    if (!selectedProject?.id) return

    const permissions = getProjectPermissions(selectedProject.id)

    if (!permissions.canDelete) {
      setMessage("You don't have permission to delete this project.")
      return
    }

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(`${API_BASE_URL}/project/${selectedProject.id}`, {
        method: "DELETE",
        headers: createAuthHeaders(),
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          removeAuthToken()
          router.push("/signin")
          return
        }

        setMessage(data.message || "Failed to delete project")
        return
      }

      setMessage(data.message || "Project deleted successfully")

      const updatedProjects = projects.filter(
        (project) => project.id !== selectedProject.id
      )
      const updatedVisibleProjects = updatedProjects.filter((project) => {
        const permissions = getProjectPermissions(project.id)
        return permissions.canView
      })
      const updatedFilteredProjects =
        activeView === "projects"
          ? updatedVisibleProjects.filter((project) => project.status !== "Archived")
          : updatedVisibleProjects.filter((project) => project.status === "Archived")

      const newTotalPages = Math.max(
        1,
        Math.ceil(updatedFilteredProjects.length / ITEMS_PER_PAGE)
      )

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages)
      }

      await fetchProjects()
      closeDeleteModal()
    } catch (error) {
      console.error("Failed to delete project:", error)
      setMessage("Failed to delete project")
    } finally {
      setLoading(false)
    }
  }

  if (isAuthChecking) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {activeView === "projects" ? "Projects" : "Archived Projects"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {activeView === "projects"
              ? "View and manage ongoing projects, stakeholders, and current progress."
              : "View archived projects and restore them when needed."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeView === "projects" ? (
            <>
              <button
                onClick={() => {
                  setActiveView("archived")
                  setCurrentPage(1)
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Archived Projects
              </button>

              {!permissionLoading && canCreateProject && (
                <button
                  onClick={openCreateModal}
                  className="shrink-0 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
                >
                  Create Project
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => {
                setActiveView("projects")
                setCurrentPage(1)
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Back to Projects
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      {fetching || permissionLoading ? (
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          {fetching ? "Loading projects..." : "Checking project permissions..."}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          {activeView === "projects"
            ? "No active projects found."
            : "No archived projects found."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {paginatedProjects.map((project) => {
              const permissions = getProjectPermissions(project.id)
              const canShowViewButton = permissions.canView
              const canShowArchiveButton = permissions.canUpdate
              const canShowDeleteButton = permissions.canDelete
              const canShowActions =
                canShowViewButton || canShowArchiveButton || canShowDeleteButton

              return (
                <div
                  key={project.id}
                  className="rounded-2xl bg-background p-5 shadow-sm ring-1 ring-border transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      {project.name}
                    </h2>

                    <span
                      className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusClasses(
                        project.status
                      )}`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {project.description || "No description provided."}
                  </p>

                  <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Start:</span>{" "}
                      {project.start_date || "-"}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">End:</span>{" "}
                      {project.end_date || "-"}
                    </p>
                  </div>

                  {canShowActions && (
                    <div className="mt-5 flex items-center justify-end gap-2">
                      {canShowViewButton && (
                        <button
                          onClick={() => openProjectDetails(project)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
                          title="View Project"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}

                      {canShowArchiveButton && (
                        <button
                          onClick={() => openArchiveModal(project)}
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${
                            project.status === "Archived"
                              ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              : "border-border text-foreground hover:bg-muted"
                          }`}
                          title={
                            project.status === "Archived"
                              ? "Unarchive Project"
                              : "Archive Project"
                          }
                        >
                          {project.status === "Archived" ? (
                            <RotateCcw className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                        </button>
                      )}

                      {canShowDeleteButton && (
                        <button
                          onClick={() => openDeleteModal(project)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          title="Delete Project"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)} of{" "}
              {filteredProjects.length}{" "}
              {activeView === "projects" ? "projects" : "archived projects"}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg px-3 py-1.5 text-sm ${
                      currentPage === page
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {isCreateModalOpen && canCreateProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Create Project
              </h2>

              <button
                onClick={closeCreateModal}
                className="rounded-md px-3 py-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-5">
              {userOrganization && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={userOrganization.name}
                    disabled
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Project Title
                </label>
                <input
                  type="text"
                  name="name"
                  value={projectForm.name}
                  onChange={handleChange}
                  placeholder="Enter project title"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Project Description
                </label>
                <textarea
                  name="description"
                  value={projectForm.description}
                  onChange={handleChange}
                  placeholder="Enter project description"
                  rows={5}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                />
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
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
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
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading || !userOrganization}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Creating..." : "Save Project"}
                </button>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isArchiveModalOpen &&
        selectedProject &&
        getProjectPermissions(selectedProject.id).canUpdate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
              <h3 className="text-lg font-semibold text-foreground">
                {selectedProject.status === "Archived"
                  ? "Unarchive Project"
                  : "Archive Project"}
              </h3>

              <p className="mt-3 text-sm text-muted-foreground">
                {selectedProject.status === "Archived" ? (
                  <>
                    Are you sure you want to unarchive{" "}
                    <span className="font-semibold text-foreground">
                      {selectedProject.name}
                    </span>
                    ?
                  </>
                ) : (
                  <>
                    Are you sure you want to archive{" "}
                    <span className="font-semibold text-foreground">
                      {selectedProject.name}
                    </span>
                    ?
                  </>
                )}
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeArchiveModal}
                  disabled={loading}
                  className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmArchiveToggle}
                  disabled={loading}
                  className={`rounded-lg px-4 py-2 text-white disabled:opacity-60 ${
                    selectedProject.status === "Archived"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {loading
                    ? selectedProject.status === "Archived"
                      ? "Restoring..."
                      : "Archiving..."
                    : selectedProject.status === "Archived"
                      ? "Confirm Restore"
                      : "Confirm Archive"}
                </button>
              </div>
            </div>
          </div>
        )}

      {isDeleteModalOpen &&
        selectedProject &&
        getProjectPermissions(selectedProject.id).canDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
              <h3 className="text-lg font-semibold text-foreground">
                Delete Project
              </h3>

              <p className="mt-3 text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  {selectedProject.name}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={loading}
                  className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDeleteProject}
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