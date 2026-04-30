"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

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

type RoleOption = {
  id: number
  name: string
  description?: string | null
}

type UserOption = {
  id: number
  first_name: string
  last_name: string
  full_name?: string
  email: string
  is_active: boolean
}

type Stakeholder = {
  id: number
  project_id: number
  user_id: number
  added_by?: number | null
  status: string
  user: UserOption | null
  roles: RoleOption[]
  role_ids: number[]
  created_at?: string | null
  updated_at?: string | null
}

type StakeholderForm = {
  user_id: string
  role_ids: number[]
  status: string
}

const BUSINESS_API_BASE_URL = "http://localhost:5000/api/business-analyst"

const emptyForm: StakeholderForm = {
  user_id: "",
  role_ids: [],
  status: "Active",
}

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

export default function ProjectStakeholdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const projectIdParam = searchParams.get("id")
  const projectId = projectIdParam ? Number(projectIdParam) : null

  const [project, setProject] = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(true)

  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])

  const [selectedStakeholder, setSelectedStakeholder] =
    useState<Stakeholder | null>(null)
  const [stakeholderToDelete, setStakeholderToDelete] =
    useState<Stakeholder | null>(null)

  const [form, setForm] = useState<StakeholderForm>(emptyForm)
  const [userSearch, setUserSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)

  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAddMode, setIsAddMode] = useState(true)

  const existingUserIds = useMemo(() => {
    return new Set(stakeholders.map((stakeholder) => stakeholder.user_id))
  }, [stakeholders])

  const availableUsers = useMemo(() => {
    if (!isAddMode) return users

    return users.filter((user) => !existingUserIds.has(user.id))
  }, [users, existingUserIds, isAddMode])

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase()

    if (!keyword) return []

    return availableUsers
      .filter((user) => {
        const fullName = user.full_name || `${user.first_name} ${user.last_name}`

        return (
          fullName.toLowerCase().includes(keyword) ||
          user.email.toLowerCase().includes(keyword)
        )
      })
      .slice(0, 8)
  }, [availableUsers, userSearch])

  const tabButtonClasses = (tab: string) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      tab === "stakeholders"
        ? "bg-primary text-primary-foreground"
        : "border border-border text-foreground hover:bg-muted"
    }`

  const fetchProject = async () => {
    if (!projectId || isNaN(projectId)) return

    try {
      setProjectLoading(true)
      setMessage("")

      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return
      }

      const res = await fetch(`${BUSINESS_API_BASE_URL}/project/${projectId}`, {
        method: "GET",
        headers: createAuthHeaders(),
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/signin")
          return
        }

        setMessage(data.message || "Failed to fetch project")
        return
      }

      setProject(data.project)
    } catch (error) {
      console.error("Failed to fetch project:", error)
      setMessage("Failed to fetch project")
    } finally {
      setProjectLoading(false)
    }
  }

  const fetchStakeholders = async () => {
    if (!projectId || isNaN(projectId)) return

    try {
      setFetching(true)
      setMessage("")

      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return
      }

      const res = await fetch(
        `${BUSINESS_API_BASE_URL}/project/${projectId}/stakeholders`,
        {
          method: "GET",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/signin")
          return
        }

        setMessage(data.message || "Failed to fetch stakeholders")
        return
      }

      setStakeholders(data.stakeholders || [])
    } catch (error) {
      console.error("Failed to fetch stakeholders:", error)
      setMessage("Failed to fetch stakeholders")
    } finally {
      setFetching(false)
    }
  }

  const fetchUsers = async () => {
    if (!projectId || isNaN(projectId)) return

    try {
      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return
      }

      const res = await fetch(
        `${BUSINESS_API_BASE_URL}/project/${projectId}/stakeholder-users`,
        {
          method: "GET",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/signin")
          return
        }

        console.error("Failed to fetch users:", data)
        return
      }

      setUsers(Array.isArray(data) ? data : data.users || [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const fetchRoles = async () => {
    if (!projectId || isNaN(projectId)) return

    try {
      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return
      }

      const res = await fetch(
        `${BUSINESS_API_BASE_URL}/project/${projectId}/stakeholder-roles`,
        {
          method: "GET",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/signin")
          return
        }

        console.error("Failed to fetch roles:", data)
        return
      }

      setRoles(Array.isArray(data) ? data : data.roles || [])
    } catch (error) {
      console.error("Failed to fetch roles:", error)
    }
  }

  useEffect(() => {
    if (!projectId || isNaN(projectId) || projectId <= 0) {
      setProjectLoading(false)
      setFetching(false)
      return
    }

    fetchProject()
    fetchStakeholders()
    fetchUsers()
    fetchRoles()
  }, [projectId])

  const openAddModal = () => {
    setIsAddMode(true)
    setSelectedStakeholder(null)
    setSelectedUser(null)
    setUserSearch("")
    setForm(emptyForm)
    setMessage("")
    setIsModalOpen(true)
  }

  const openEditModal = (stakeholder: Stakeholder) => {
    setIsAddMode(false)
    setSelectedStakeholder(stakeholder)
    setSelectedUser(stakeholder.user)
    setUserSearch("")
    setForm({
      user_id: String(stakeholder.user_id),
      role_ids: stakeholder.role_ids || [],
      status: stakeholder.status || "Active",
    })
    setMessage("")
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedStakeholder(null)
    setSelectedUser(null)
    setUserSearch("")
    setForm(emptyForm)
    setMessage("")
  }

  const openDeleteModal = (stakeholder: Stakeholder) => {
    setStakeholderToDelete(stakeholder)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setStakeholderToDelete(null)
    setIsDeleteModalOpen(false)
  }

  const selectUser = (user: UserOption) => {
    setSelectedUser(user)
    setForm((prev) => ({
      ...prev,
      user_id: String(user.id),
    }))
    setUserSearch("")
  }

  const clearSelectedUser = () => {
    setSelectedUser(null)
    setForm((prev) => ({
      ...prev,
      user_id: "",
    }))
    setUserSearch("")
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target

    setForm((prev) => ({
      ...prev,
      status: value,
    }))
  }

  const toggleRole = (roleId: number) => {
    setForm((prev) => {
      const exists = prev.role_ids.includes(roleId)

      return {
        ...prev,
        role_ids: exists
          ? prev.role_ids.filter((id) => id !== roleId)
          : [...prev.role_ids, roleId],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectId || isNaN(projectId)) {
      setMessage("Invalid project ID")
      return
    }

    setLoading(true)
    setMessage("")

    if (isAddMode && !form.user_id) {
      setMessage("Please search and select a user")
      setLoading(false)
      return
    }

    if (form.role_ids.length === 0) {
      setMessage("Please select at least one role")
      setLoading(false)
      return
    }

    try {
      const method = isAddMode ? "POST" : "PUT"
      const url = isAddMode
        ? `${BUSINESS_API_BASE_URL}/project/${projectId}/stakeholders`
        : `${BUSINESS_API_BASE_URL}/project/${projectId}/stakeholders/${selectedStakeholder?.id}`

      const payload = isAddMode
        ? {
            user_id: Number(form.user_id),
            role_ids: form.role_ids,
            status: form.status,
          }
        : {
            role_ids: form.role_ids,
            status: form.status,
          }

      const res = await fetch(url, {
        method,
        headers: createAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/signin")
          return
        }

        setMessage(data.message || "Failed to save stakeholder")
        return
      }

      await fetchStakeholders()
      closeModal()
    } catch (error) {
      console.error("Failed to save stakeholder:", error)
      setMessage("Failed to save stakeholder")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!projectId || isNaN(projectId)) {
      setMessage("Invalid project ID")
      return
    }

    if (!stakeholderToDelete?.id) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(
        `${BUSINESS_API_BASE_URL}/project/${projectId}/stakeholders/${stakeholderToDelete.id}`,
        {
          method: "DELETE",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/signin")
          return
        }

        setMessage(data.message || "Failed to remove stakeholder")
        return
      }

      await fetchStakeholders()
      closeDeleteModal()
    } catch (error) {
      console.error("Failed to remove stakeholder:", error)
      setMessage("Failed to remove stakeholder")
    } finally {
      setLoading(false)
    }
  }

  if (!projectId || isNaN(projectId)) {
    return (
      <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <button
          onClick={() => router.push("/stakeholder/projects/projects-page")}
          className="mb-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Back to Projects
        </button>

        <div className="rounded-2xl bg-background p-8 text-center ring-1 ring-border">
          <h2 className="text-xl font-semibold text-foreground">
            Invalid Project ID
          </h2>
          <p className="mt-2 text-muted-foreground">
            The project ID is missing or invalid.
          </p>
        </div>
      </section>
    )
  }

  if (projectLoading) {
    return (
      <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="mb-6">
          <button
            onClick={() => router.push("/stakeholder/projects/projects-page")}
            className="mb-3 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Back to Projects
          </button>
        </div>

        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading project details...
        </div>
      </section>
    )
  }

  if (!project) {
    return (
      <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="mb-6">
          <button
            onClick={() => router.push("/stakeholder/projects/projects-page")}
            className="mb-3 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Back to Projects
          </button>
        </div>

        <div className="rounded-2xl bg-background p-8 text-center ring-1 ring-border">
          <p className="text-red-600">{message || "Project not found."}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            onClick={() => router.push("/stakeholder/projects/projects-page")}
            className="mb-3 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Back to Projects
          </button>

          <h1 className="text-2xl font-semibold text-foreground">
            {project.name || "Project Details"}
          </h1>

          <p className="mt-2 text-muted-foreground">
            View project overview, stakeholders, vision and scope, and requirements.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <button
          onClick={() =>
            router.push(
              `/stakeholder/projects/project-details?id=${projectId}&tab=overview`
            )
          }
          className={tabButtonClasses("overview")}
        >
          Overview
        </button>

        <button className={tabButtonClasses("stakeholders")}>
          Stakeholders
        </button>

        <button
          onClick={() =>
            router.push(
              `/stakeholder/projects/project-details?id=${projectId}&tab=vision-scope`
            )
          }
          className={tabButtonClasses("vision-scope")}
        >
          Vision & Scope
        </button>

        <button
          onClick={() =>
            router.push(
              `/stakeholder/projects/project-details?id=${projectId}&tab=requirements`
            )
          }
          className={tabButtonClasses("requirements")}
        >
          Requirements
        </button>
      </div>

      <div className="space-y-6">
        {message && (
          <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {message}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Stakeholders
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage users assigned to this project and their project-specific roles.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Add Stakeholder
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-lg font-semibold text-foreground">
              Project Stakeholders
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Each row represents one user assigned to this project.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Roles</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="w-40 px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {fetching ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      Loading stakeholders...
                    </td>
                  </tr>
                ) : stakeholders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      No stakeholders added yet.
                    </td>
                  </tr>
                ) : (
                  stakeholders.map((stakeholder) => (
                    <tr
                      key={stakeholder.id}
                      className="border-t border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {stakeholder.user?.full_name ||
                          `${stakeholder.user?.first_name || ""} ${
                            stakeholder.user?.last_name || ""
                          }`.trim() ||
                          "Unknown User"}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {stakeholder.user?.email || "-"}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {stakeholder.roles.length > 0
                          ? stakeholder.roles.map((role) => role.name).join(", ")
                          : "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            stakeholder.status === "Active"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          {stakeholder.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(stakeholder)}
                            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => openDeleteModal(stakeholder)}
                            className="rounded-lg border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                          >
                            Remove
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
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">
                {isAddMode ? "Add Stakeholder" : "Edit Stakeholder"}
              </h3>

              <button
                onClick={closeModal}
                className="rounded-md px-3 py-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  User
                </label>

                {isAddMode ? (
                  <div className="space-y-3">
                    {selectedUser ? (
                      <div className="rounded-lg border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-foreground">
                              {selectedUser.full_name ||
                                `${selectedUser.first_name} ${selectedUser.last_name}`}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {selectedUser.email}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={clearSelectedUser}
                            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Search user by name or email"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                        />

                        {userSearch.trim() && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                            {filteredUsers.length > 0 ? (
                              filteredUsers.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => selectUser(user)}
                                  className="block w-full border-b border-border px-4 py-3 text-left hover:bg-muted"
                                >
                                  <p className="font-medium text-foreground">
                                    {user.full_name ||
                                      `${user.first_name} ${user.last_name}`}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {user.email}
                                  </p>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-muted-foreground">
                                No available user found.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {isAddMode && availableUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        All users are already added as stakeholders for this project.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="font-medium text-foreground">
                      {selectedUser?.full_name ||
                        `${selectedUser?.first_name || ""} ${
                          selectedUser?.last_name || ""
                        }`.trim() ||
                        "Unknown User"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedUser?.email || "-"}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Roles
                </label>

                <div className="grid gap-2 rounded-lg border border-border bg-background p-3 md:grid-cols-2">
                  {roles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No roles found.
                    </p>
                  ) : (
                    roles.map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={form.role_ids.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                        />
                        {role.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleStatusChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading
                    ? "Saving..."
                    : isAddMode
                      ? "Add Stakeholder"
                      : "Update Stakeholder"}
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

      {isDeleteModalOpen && stakeholderToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Remove Stakeholder
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {stakeholderToDelete.user?.full_name ||
                  `${stakeholderToDelete.user?.first_name || ""} ${
                    stakeholderToDelete.user?.last_name || ""
                  }`.trim() ||
                  "this stakeholder"}
              </span>{" "}
              from this project?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={loading}
                className="rounded-lg bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
              >
                {loading ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}