"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

type ProjectForm = {
  name: string
  description: string
  start_date: string
  end_date: string
  organization_id: string
}

const API_BASE_URL = "http://127.0.0.1:5000/api/business-analyst"

const emptyProject: ProjectForm = {
  name: "",
  description: "",
  start_date: "",
  end_date: "",
  organization_id: "1",
}

export default function CreateProjectPage() {
  const router = useRouter()

  const [project, setProject] = useState<ProjectForm>(emptyProject)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setProject((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
          name: project.name,
          description: project.description,
          start_date: project.start_date,
          end_date: project.end_date,
          organization_id: Number(project.organization_id),
          status: "Pending",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to create project")
        return
      }

      router.push("/business-analyst/project")
      router.refresh()
    } catch (error) {
      console.error("Failed to create project:", error)
      setMessage("Failed to create project")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Create Project
        </h1>
        <p className="mt-2 text-muted-foreground">
          Add a new project with title, description, and schedule.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Project Title
          </label>
          <input
            type="text"
            name="name"
            value={project.name}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            placeholder="Enter project title"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Project Description
          </label>
          <textarea
            name="description"
            value={project.description}
            onChange={handleChange}
            rows={5}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            placeholder="Enter project description"
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
              value={project.start_date}
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
              value={project.end_date}
              onChange={handleChange}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
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
            value={project.organization_id}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            placeholder="Enter organization id"
            required
          />
        </div>

        {message && (
          <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {message}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>

          <Link
            href="/business-analyst/project"
            className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  )
}