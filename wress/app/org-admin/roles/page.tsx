"use client"

import { useEffect, useMemo, useState } from "react"

type Permission = {
  id: number
  key: string
  label: string
  module: string
  description?: string
}

type Role = {
  id?: number
  name: string
  description?: string
  permissions: Permission[]
  organization_id?: number | null
}

const ROLES_API_URL = "http://localhost:5000/api/admin/roles/"
const PERMISSIONS_API_URL = "http://localhost:5000/api/admin/permissions/"
const ITEMS_PER_PAGE = 5

const emptyRole: Role = {
  name: "",
  description: "",
  permissions: [],
}

export default function RolesPageView() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])

  const [selectedRole, setSelectedRole] = useState<Role>(emptyRole)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAddMode, setIsAddMode] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const getToken = () => {
    return localStorage.getItem("token")
  }

  const showMessage = (msg: string, type: "success" | "error" | "info" = "info") => {
    setMessageType(type)
    setMessage(msg)
    if (type === "success") {
      setTimeout(() => setMessage(""), 3000)
    }
  }

  const parseJsonSafely = (text: string) => {
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return null
    }
  }

  const fetchRoles = async () => {
    try {
      setFetching(true)
      setMessage("")

      const token = getToken()
      if (!token) {
        showMessage("No authentication token found", "error")
        return
      }

      const res = await fetch(ROLES_API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      })
      const text = await res.text()

      if (res.status === 401) {
        showMessage("Session expired. Please sign in again.", "error")
        return
      }

      if (!res.ok) {
        console.error("Failed to fetch roles:", res.status, text)
        showMessage("Failed to fetch roles", "error")
        return
      }

      const data = parseJsonSafely(text)

      if (!data) {
        console.error("Invalid JSON response for roles:", text)
        showMessage("Invalid response from server", "error")
        return
      }

      setRoles(data)
    } catch (error) {
      console.error("Failed to fetch roles:", error)
      showMessage("Failed to fetch roles", "error")
    } finally {
      setFetching(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const token = getToken()
      if (!token) return

      const res = await fetch(PERMISSIONS_API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      })
      const text = await res.text()

      if (!res.ok) {
        console.error("Failed to fetch permissions:", res.status, text)
        return
      }

      const data = parseJsonSafely(text)

      if (!data) {
        console.error("Invalid JSON response for permissions:", text)
        return
      }

      setPermissions(data)
    } catch (error) {
      console.error("Failed to fetch permissions:", error)
    }
  }

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

  const totalPages = Math.ceil(roles.length / ITEMS_PER_PAGE)

  const paginatedRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return roles.slice(startIndex, endIndex)
  }, [roles, currentPage])

  const openAddModal = () => {
    setIsAddMode(true)
    setSelectedRole(emptyRole)
    setMessage("")
    setIsModalOpen(true)
  }

  const openEditModal = (role: Role) => {
    setIsAddMode(false)
    setSelectedRole(role)
    setMessage("")
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedRole(emptyRole)
    setMessage("")
  }

  const openDeleteModal = (role: Role) => {
    setRoleToDelete(role)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setRoleToDelete(null)
    setIsDeleteModalOpen(false)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    setSelectedRole((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const togglePermission = (permission: Permission) => {
    setSelectedRole((prev) => {
      const exists = prev.permissions.some((p) => p.id === permission.id)

      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p.id !== permission.id)
          : [...prev.permissions, permission],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const token = getToken()
      if (!token) {
        showMessage("No authentication token found", "error")
        return
      }

      const method = selectedRole.id ? "PUT" : "POST"
      const url = selectedRole.id
        ? `${ROLES_API_URL}${selectedRole.id}`
        : ROLES_API_URL

      const payload = {
        name: selectedRole.name,
        description: selectedRole.description || "",
        permission_ids: selectedRole.permissions.map((permission) => permission.id),
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const text = await res.text()
      const data = parseJsonSafely(text)

      if (!data && text) {
        console.error("Invalid JSON response while saving role:", text)
        showMessage("Server returned an invalid response", "error")
        return
      }

      if (res.status === 401) {
        showMessage("Session expired. Please sign in again.", "error")
        return
      }

      if (!res.ok) {
        showMessage(data?.error || data?.message || "Something went wrong", "error")
        return
      }

      showMessage(data?.message || "Saved successfully", "success")
      await fetchRoles()
      closeModal()
    } catch (error) {
      console.error("Failed to save role:", error)
      showMessage("Failed to save role", "error")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!roleToDelete?.id) return

    try {
      setLoading(true)
      setMessage("")

      const token = getToken()
      if (!token) {
        showMessage("No authentication token found", "error")
        return
      }

      const res = await fetch(`${ROLES_API_URL}${roleToDelete.id}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      })

      const text = await res.text()
      const data = parseJsonSafely(text)

      if (!data && text) {
        console.error("Invalid JSON response while deleting role:", text)
        showMessage("Server returned an invalid response", "error")
        return
      }

      if (res.status === 401) {
        showMessage("Session expired. Please sign in again.", "error")
        return
      }

      if (!res.ok) {
        showMessage(data?.error || data?.message || "Failed to delete role", "error")
        return
      }

      showMessage(data?.message || "Role deleted successfully", "success")

      const updatedRoles = roles.filter((role) => role.id !== roleToDelete.id)
      const newTotalPages = Math.max(1, Math.ceil(updatedRoles.length / ITEMS_PER_PAGE))

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages)
      }

      await fetchRoles()
      closeDeleteModal()
    } catch (error) {
      console.error("Delete failed:", error)
      showMessage("Failed to delete role", "error")
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-2xl font-semibold text-foreground">Roles</h1>
          <p className="mt-2 text-muted-foreground">
            Manage role names, descriptions, and assigned permissions.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Add Role
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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Permissions</th>
                <th className="w-40 px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Loading roles...
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    No roles found.
                  </td>
                </tr>
              ) : (
                paginatedRoles.map((role) => (
                  <tr key={role.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground">{role.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {role.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {role.permissions.length > 0
                        ? role.permissions.map((permission) => permission.label).join(", ")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(role)}
                          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => openDeleteModal(role)}
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

        {!fetching && roles.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, roles.length)} of {roles.length} roles
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
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

      { }
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {isAddMode ? "Add Role" : "Edit Role"}
              </h2>

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
                  Role Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={selectedRole.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="Enter role name"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  name="description"
                  value={selectedRole.description || ""}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="Enter role description"
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Permissions
                </label>
                <div className="grid gap-2 rounded-lg border border-border bg-background p-3 md:grid-cols-2">
                  {permissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No permissions found.</p>
                  ) : (
                    permissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRole.permissions.some(
                            (p) => p.id === permission.id
                          )}
                          onChange={() => togglePermission(permission)}
                        />
                        {permission.label}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Saving..." : isAddMode ? "Add Role" : "Update Role"}
                </button>

                {!isAddMode && (
                  <button
                    type="button"
                    onClick={() => openDeleteModal(selectedRole)}
                    className="rounded-lg border border-destructive/30 px-4 py-2 text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                )}

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

      {/* Delete Confirmation Modal - same as before */}
      {isDeleteModalOpen && roleToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">Delete Role</h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{roleToDelete.name}</span>?
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