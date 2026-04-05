"use client"

import { useEffect, useMemo, useState } from "react"
import { Eye } from "lucide-react"

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
  organization_id: string
}

const API_BASE_URL = "http://127.0.0.1:5000/api/business-analyst"
const ITEMS_PER_PAGE = 6

const emptyProject: ProjectForm = {
  name: "",
  description: "",
  start_date: "",
  end_date: "",
  organization_id: "1",
}

function getStatusClasses(status: string) {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200"
    case "In Progress":
      return "bg-amber-100 text-amber-700 ring-amber-200"
    case "Pending":
      return "bg-slate-100 text-slate-700 ring-slate-200"
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200"
  }
}

export default function BusinessAnalystProjectPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject)

  const fetchProjects = async () => {
    try {
      setFetching(true)
      setMessage("")

      const res = await fetch(`${API_BASE_URL}/projects`)
      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to fetch projects")
        return
      }

      setProjects(data)
    } catch (error) {
      console.error("Failed to fetch projects:", error)
      setMessage("Failed to fetch projects")
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const totalPages = Math.max(1, Math.ceil(projects.length / ITEMS_PER_PAGE))

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return projects.slice(startIndex, endIndex)
  }, [projects, currentPage])

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
    setLoading(true)
    setMessage("")

    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectForm.name,
          description: projectForm.description,
          start_date: projectForm.start_date || null,
          end_date: projectForm.end_date || null,
          status: "Pending",
          organization_id: Number(projectForm.organization_id),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to create project")
        return
      }

      setMessage(data.message || "Project created successfully")
      setProjectForm(emptyProject)
      setIsFormOpen(false)
      setCurrentPage(1)
      await fetchProjects()
    } catch (error) {
      console.error("Failed to create project:", error)
      setMessage("Failed to create project")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage ongoing projects, stakeholders, and current progress.
          </p>
        </div>

        <button
          onClick={() => {
            setIsFormOpen((prev) => !prev)
            setMessage("")
          }}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          {isFormOpen ? "Close Form" : "Create Project"}
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      {isFormOpen && (
        <div className="mb-6 rounded-2xl bg-background p-6 ring-1 ring-border">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Create Project
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill in the project information below.
            </p>
          </div>

          <form onSubmit={handleCreateProject} className="space-y-5">
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
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
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
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
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
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Organization ID
              </label>
              <input
                type="number"
                name="organization_id"
                value={projectForm.organization_id}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? "Creating..." : "Save Project"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setProjectForm(emptyProject)
                  setIsFormOpen(false)
                  setMessage("")
                }}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {fetching ? (
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          No projects found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {paginatedProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-2xl bg-background p-5 shadow-sm ring-1 ring-border transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {project.name}
                  </h2>

                  <span
                    className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusClasses(project.status)}`}
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

                <div className="mt-5 flex items-center justify-end">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, projects.length)} of{" "}
              {projects.length} projects
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
    </section>
  )
}