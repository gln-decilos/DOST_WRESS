"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

type Project = {
  id?: number
  name: string
  description?: string
  status: string
  organization_id?: number
  start_date?: string
  end_date?: string
  created_at?: string
  updated_at?: string
  project_manager_id?: number | null
  project_manager_name?: string | null  // ADD THIS
}

type User = {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  user_type: string
}

const PROJECTS_API_URL = "http://localhost:5000/api/orgadmin/projects/projects"
const USERS_API_URL = "http://localhost:5000/api/users/organization/users"
const ITEMS_PER_PAGE = 5

const emptyProject: Project = {
  name: "",
  description: "",
  status: "Pending",
  start_date: "",
  end_date: "",
  project_manager_id: null,
  project_manager_name: null,
}

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "Archived", label: "Archived" }
]

export default function ProjectsPageView() {
  const { userId, user } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedProject, setSelectedProject] = useState<Project>(emptyProject)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info")
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAddMode, setIsAddMode] = useState(true)

  // Project Manager search states
  const [pmSearchTerm, setPmSearchTerm] = useState("")
  const [showPmDropdown, setShowPmDropdown] = useState(false)

  const getToken = () => {
    return localStorage.getItem("token")
  }

  const handleUnauthorized = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    showMessage("Session expired. Please sign in again.", "error")
    setTimeout(() => {
      router.push('/signin')
    }, 2000)
  }

  const showMessage = (msg: string, type: "success" | "error" | "info" = "info") => {
    setMessageType(type)
    setMessage(msg)
    if (type === "success") {
      setTimeout(() => setMessage(""), 3000)
    }
  }

  const fetchProjects = async () => {
    try {
      setFetching(true)
      setMessage("")

      const token = getToken()

      if (!token) {
        showMessage("No authentication token found. Please sign in again.", "error")
        setFetching(false)
        return
      }

      const response = await fetch(PROJECTS_API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("Fetched projects:", data) // Debug log
      setProjects(data)
    } catch (error) {
      console.error("Failed to fetch projects:", error)
      showMessage("Failed to fetch projects", "error")
    } finally {
      setFetching(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(USERS_API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      // Filter only Stakeholders (potential project managers)
      const stakeholders = data.filter((u: User) => u.user_type === "Stakeholder")
      setUsers(stakeholders)
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const createProject = async (projectData: Project) => {
    const token = getToken()
    if (!token) return false

    const response = await fetch(PROJECTS_API_URL, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectData.name,
        description: projectData.description,
        status: projectData.status,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        project_manager_id: projectData.project_manager_id
      }),
    })

    if (response.status === 401) {
      handleUnauthorized()
      return false
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || data.error || "Failed to create project")
    }

    return true
  }

  const updateProject = async (id: number, projectData: Project) => {
    const token = getToken()
    if (!token) return false

    const response = await fetch(`${PROJECTS_API_URL}/${id}`, {
      method: "PUT",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectData.name,
        description: projectData.description,
        status: projectData.status,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        project_manager_id: projectData.project_manager_id
      }),
    })

    if (response.status === 401) {
      handleUnauthorized()
      return false
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || data.error || "Failed to update project")
    }

    return true
  }

  const deleteProject = async (id: number) => {
    const token = getToken()
    if (!token) return false

    const response = await fetch(`${PROJECTS_API_URL}/${id}`, {
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    })

    if (response.status === 401) {
      handleUnauthorized()
      return false
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete project")
    }

    return true
  }

  useEffect(() => {
    if (userId && user && user.user_type === "Organization Admin") {
      fetchProjects()
      fetchUsers()
    } else if (userId && user && user.user_type !== "Organization Admin") {
      router.push('/unauthorized')
    }
  }, [userId, user])

  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE)

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return projects.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [projects, currentPage])

  const openAddModal = () => {
    setIsAddMode(true)
    setSelectedProject({ ...emptyProject, project_manager_id: null, project_manager_name: null })
    setPmSearchTerm("")
    setMessage("")
    setIsModalOpen(true)
  }

  const openEditModal = (project: Project) => {
    setIsAddMode(false)
    setSelectedProject({
      ...project,
      project_manager_id: project.project_manager_id || null,
      project_manager_name: project.project_manager_name || null
    })
    setPmSearchTerm("")
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedProject(emptyProject)
    setPmSearchTerm("")
    setShowPmDropdown(false)
    setMessage("")
  }

  const openDeleteModal = (project: Project) => {
    setProjectToDelete(project)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setProjectToDelete(null)
    setIsDeleteModalOpen(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSelectedProject((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle project manager selection (single selection)
  const handleSelectProjectManager = (userId: number) => {
    setSelectedProject((prev) => ({
      ...prev,
      project_manager_id: userId
    }))
    setPmSearchTerm("")
    setShowPmDropdown(false)
  }

  const handleRemoveProjectManager = () => {
    setSelectedProject((prev) => ({
      ...prev,
      project_manager_id: null,
      project_manager_name: null
    }))
  }

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!pmSearchTerm) return users
    const searchLower = pmSearchTerm.toLowerCase()
    return users.filter(user =>
      user.first_name.toLowerCase().includes(searchLower) ||
      user.last_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchLower)
    )
  }, [users, pmSearchTerm])

  // Get selected project manager details
  const selectedProjectManager = useMemo(() => {
    if (!selectedProject.project_manager_id) return null
    return users.find(user => user.id === selectedProject.project_manager_id)
  }, [users, selectedProject.project_manager_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      if (isAddMode) {
        await createProject(selectedProject)
        showMessage("Project created successfully", "success")
      } else if (selectedProject.id) {
        await updateProject(selectedProject.id, selectedProject)
        showMessage("Project updated successfully", "success")
      }

      await fetchProjects()
      closeModal()
    } catch (error: any) {
      console.error("Failed to save project:", error)
      showMessage(error.message || "Failed to save project", "error")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!projectToDelete?.id) return

    setLoading(true)
    setMessage("")

    try {
      await deleteProject(projectToDelete.id)
      showMessage("Project deleted successfully", "success")
      await fetchProjects()
      closeDeleteModal()
    } catch (error: any) {
      console.error("Delete failed:", error)
      showMessage(error.message || "Failed to delete project", "error")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-500/10 text-green-600"
      case "pending":
        return "bg-yellow-500/10 text-yellow-600"
      case "completed":
        return "bg-blue-500/10 text-blue-600"
      case "archived":
        return "bg-gray-500/10 text-gray-600"
      default:
        return "bg-gray-500/10 text-gray-600"
    }
  }

  const getProjectManagerName = (project: Project) => {
    // First try to use the name from the backend
    if (project.project_manager_name) {
      return project.project_manager_name
    }
    // Fallback to local lookup
    if (!project.project_manager_id) return "Not assigned"
    const manager = users.find(u => u.id === project.project_manager_id)
    return manager ? `${manager.first_name} ${manager.last_name}` : "Not assigned"
  }

  const getMessageStyles = () => {
    switch (messageType) {
      case "success":
        return "bg-green-500/10 border-green-500/30 text-green-600"
      case "error":
        return "bg-red-500/10 border-red-500/30 text-red-600"
      default:
        return "border-border bg-background text-muted-foreground"
    }
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="mt-2 text-muted-foreground">
            Manage project names, statuses, timelines, and assign project managers.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Add Project
        </button>
      </div>

      {message && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${getMessageStyles()}`}>
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Project Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Project Manager</th>
                <th className="px-4 py-3 font-medium">Start Date</th>
                <th className="px-4 py-3 font-medium">End Date</th>
                <th className="px-4 py-3 font-medium">Created At</th>
                <th className="w-32 px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                    Loading projects...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                    No projects found for your organization.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => (
                  <tr key={project.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {project.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.description || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeColor(project.status)}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getProjectManagerName(project)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.created_at ? new Date(project.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(project)}
                          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(project)}
                          className="rounded-lg border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!fetching && projects.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, projects.length)} of{" "}
              {projects.length} projects
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${currentPage === page
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-foreground hover:bg-muted"
                    }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {isAddMode ? "Add Project" : "Edit Project"}
              </h2>
              <button onClick={closeModal} className="rounded-md px-3 py-1 text-muted-foreground hover:bg-muted">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Project Name *</label>
                <input
                  type="text"
                  name="name"
                  value={selectedProject.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  name="description"
                  value={selectedProject.description || ""}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="Enter project description"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
                <select
                  name="status"
                  value={selectedProject.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Manager Assignment Section - Single Selection */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Project Manager
                </label>

                {/* Display selected project manager */}
                {selectedProjectManager && (
                  <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {selectedProjectManager.first_name} {selectedProjectManager.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{selectedProjectManager.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveProjectManager}
                        className="text-xs text-destructive hover:text-destructive/80"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Search Input for Project Manager */}
                <div className="relative">
                  <input
                    type="text"
                    value={pmSearchTerm}
                    onChange={(e) => {
                      setPmSearchTerm(e.target.value)
                      setShowPmDropdown(true)
                    }}
                    onFocus={() => setShowPmDropdown(true)}
                    placeholder="Search for a project manager by name or email..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    disabled={!!selectedProjectManager}
                  />

                  {/* Dropdown */}
                  {showPmDropdown && !selectedProjectManager && filteredUsers.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                      {filteredUsers.map((userItem) => (
                        <button
                          key={userItem.id}
                          type="button"
                          onClick={() => handleSelectProjectManager(userItem.id)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          <span>
                            {userItem.first_name} {userItem.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {userItem.email}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {showPmDropdown && !selectedProjectManager && filteredUsers.length === 0 && pmSearchTerm && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground shadow-lg">
                      No users found
                    </div>
                  )}
                </div>

                {users.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No stakeholders found in your organization.
                  </p>
                )}

                <p className="mt-2 text-xs text-muted-foreground">
                  Note: Only one project manager can be assigned per project.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={selectedProject.start_date || ""}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    value={selectedProject.end_date || ""}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Saving..." : isAddMode ? "Add Project" : "Update Project"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && projectToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">Delete Project</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{projectToDelete.name}</span>?
              This action cannot be undone.
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
                onClick={confirmDelete}
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