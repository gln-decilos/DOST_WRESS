"use client"

import { Eye } from "lucide-react"

type Stakeholder = {
  id: number
  name: string
  avatar: string
}

type Project = {
  id: number
  title: string
  description: string
  status: "Pending" | "In Progress" | "Completed"
  stakeholders: Stakeholder[]
}

const projects: Project[] = [
  {
    id: 1,
    title: "Student Enrollment System",
    description:
      "A web-based platform for managing student registration, subject enrollment, and academic records.",
    status: "In Progress",
    stakeholders: [
      { id: 1, name: "Maria", avatar: "M" },
      { id: 2, name: "James", avatar: "J" },
      { id: 3, name: "Angela", avatar: "A" },
    ],
  },
  {
    id: 2,
    title: "Hospital Management Dashboard",
    description:
      "A centralized dashboard for monitoring hospital operations, patient admissions, and staff scheduling.",
    status: "Pending",
    stakeholders: [
      { id: 1, name: "Carlo", avatar: "C" },
      { id: 2, name: "Denise", avatar: "D" },
    ],
  },
  {
    id: 3,
    title: "E-Commerce Requirements Portal",
    description:
      "A project workspace for gathering, analyzing, and validating requirements for an online shopping platform.",
    status: "Completed",
    stakeholders: [
      { id: 1, name: "Paolo", avatar: "P" },
      { id: 2, name: "Sofia", avatar: "S" },
      { id: 3, name: "Nathan", avatar: "N" },
      { id: 4, name: "Liza", avatar: "L" },
    ],
  },
]

function getStatusClasses(status: Project["status"]) {
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
  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage ongoing projects, stakeholders, and current progress.
          </p>
        </div>

        <button className="shrink-0 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
          Add Project
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-2xl bg-background p-5 shadow-sm ring-1 ring-border transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground">
                {project.title}
              </h2>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusClasses(project.status)}`}
              >
                {project.status}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {project.description}
            </p>

            <div className="mt-5">
              <p className="mb-3 text-sm font-medium text-foreground">
                Stakeholders
              </p>

              <div className="flex items-center justify-between gap-4">
                <div className="flex -space-x-3">
                  {project.stakeholders.map((stakeholder) => (
                    <div
                      key={stakeholder.id}
                      title={stakeholder.name}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary text-sm font-semibold text-primary-foreground"
                    >
                      {stakeholder.avatar}
                    </div>
                  ))}
                </div>

                <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                  <Eye className="h-4 w-4" />
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}