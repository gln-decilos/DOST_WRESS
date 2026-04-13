"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, Pencil, Plus } from "lucide-react"
import usePermissions from "@/features/access/use-permissions"

type Requirement = {
  id: number
  requirement_id: string
  title: string
  priority: string
  status: string
  created_at: string
  updated_at: string
}

type Props = {
  projectId: number
}

const API_BASE_URL = "http://localhost:5000/api/business-analyst"

async function parseJsonSafely(res: Response) {
  const contentType = res.headers.get("content-type") || ""
  const text = await res.text()

  if (!contentType.includes("application/json")) {
    throw new Error("Server returned non-JSON response.")
  }

  return text ? JSON.parse(text) : {}
}

function formatDate(value: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString()
}

function normalizeRequirementId(value: string, fallbackId: number) {
  const trimmed = (value || "").trim()

  if (trimmed && !/^v\d+(\.\d+)*$/i.test(trimmed)) {
    return trimmed
  }

  return `REQ-SPEC-${fallbackId}`
}

export default function RequirementsPageView({ projectId }: Props) {
  const router = useRouter()
  const { loading: permissionsLoading, hasPermission } = usePermissions()

  const canViewRequirements = hasPermission("requirements.view")
  const canEditRequirements = hasPermission("requirements.edit")

  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")

  const fetchRequirements = async () => {
    try {
      setFetching(true)
      setMessage("")

      const res = await fetch(`${API_BASE_URL}/project/${projectId}/requirements`, {
        method: "GET",
        credentials: "include",
      })

      const data = await parseJsonSafely(res)

      if (!res.ok) {
        setMessage(data.message || "Failed to fetch requirements.")
        return
      }

      setRequirements(data.requirements || [])
    } catch (error) {
      console.error("Failed to fetch requirements:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to fetch requirements."
      )
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (!permissionsLoading && canViewRequirements) {
      fetchRequirements()
    } else if (!permissionsLoading && !canViewRequirements) {
      setFetching(false)
    }
  }, [permissionsLoading, canViewRequirements, projectId])

  const filteredRequirements = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) return requirements

    return requirements.filter((requirement) => {
      return (
        (requirement.requirement_id || "").toLowerCase().includes(keyword) ||
        (requirement.title || "").toLowerCase().includes(keyword) ||
        (requirement.priority || "").toLowerCase().includes(keyword) ||
        (requirement.status || "").toLowerCase().includes(keyword)
      )
    })
  }, [requirements, search])

  if (permissionsLoading) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading permissions...
        </div>
      </section>
    )
  }

  if (!canViewRequirements) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          You do not have permission to view requirements.
        </div>
      </section>
    )
  }

  if (fetching) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading requirements...
        </div>
      </section>
    )
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Requirements</h1>
          <p className="mt-2 text-muted-foreground">
            Requirements are created one by one. This module does not use document
            versioning.
          </p>
        </div>

        {canEditRequirements && (
          <button
            type="button"
            onClick={() => router.push(`/project/${projectId}/requirements/create`)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Requirement
          </button>
        )}
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium text-muted-foreground">Total Requirements</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {requirements.length}
          </p>
        </div>

        <div className="w-full md:max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requirement ID, title, priority, or status..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Requirements Table</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each row is one requirement record.
          </p>
        </div>

        {filteredRequirements.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No requirements found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Requirement ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Created Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Date Modified
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRequirements.map((requirement) => (
                  <tr
                    key={requirement.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {normalizeRequirementId(requirement.requirement_id, requirement.id)}
                    </td>

                    <td className="px-4 py-3 text-sm text-foreground">
                      {requirement.title || "-"}
                    </td>

                    <td className="px-4 py-3 text-sm text-foreground">
                      {requirement.priority || "-"}
                    </td>

                    <td className="px-4 py-3 text-sm text-foreground">
                      {requirement.status || "-"}
                    </td>

                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatDate(requirement.created_at)}
                    </td>

                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatDate(requirement.updated_at)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/project/${projectId}/requirements/${requirement.id}`)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>

                        {canEditRequirements && (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/project/${projectId}/requirements/${requirement.id}/edit`
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}