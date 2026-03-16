"use client"

import { useEffect, useMemo, useState } from "react"

type Role = {
  id?: number
  name: string
  description: string
}

const API_BASE_URL = "http://127.0.0.1:5000/api/admin"
const ITEMS_PER_PAGE = 5

const emptyRole: Role = {
  name: "",
  description: "",
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role>(emptyRole)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAddMode, setIsAddMode] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchRoles = async () => {
    try {
      setFetching(true)
      setMessage("")

      const res = await fetch(`${API_BASE_URL}/roles`)
      const data = await res.json()
      setRoles(data)
    } catch (error) {
      console.error("Failed to fetch roles:", error)
      setMessage("Failed to fetch roles")
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    fetchRoles()
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
    setSelectedRole({
      id: role.id,
      name: role.name,
      description: role.description || "",
    })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const method = selectedRole.id ? "PUT" : "POST"
      const url = selectedRole.id
        ? `${API_BASE_URL}/roles/${selectedRole.id}`
        : `${API_BASE_URL}/roles`

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: selectedRole.name,
          description: selectedRole.description,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Something went wrong")
        return
      }

      setMessage(data.message || "Saved successfully")
      await fetchRoles()
      closeModal()
    } catch (error) {
      console.error("Failed to save role:", error)
      setMessage("Failed to save role")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!roleToDelete?.id) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(`${API_BASE_URL}/roles/${roleToDelete.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to delete role")
        return
      }

      setMessage(data.message || "Role deleted successfully")

      const updatedRoles = roles.filter((role) => role.id !== roleToDelete.id)
      const newTotalPages = Math.max(1, Math.ceil(updatedRoles.length / ITEMS_PER_PAGE))

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages)
      }

      await fetchRoles()

      if (isModalOpen && selectedRole.id === roleToDelete.id) {
        closeModal()
      }

      closeDeleteModal()
    } catch (error) {
      console.error("Delete failed:", error)
      setMessage("Failed to delete role")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Roles</h1>
          <p className="mt-2 text-muted-foreground">
            Manage default and custom access roles.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
        >
          Add Role
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Role Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="w-40 px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Loading roles...
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    No roles found.
                  </td>
                </tr>
              ) : (
                paginatedRoles.map((role) => (
                  <tr key={role.id} className="border-t">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {role.name}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {role.description || "No description provided."}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(role)}
                          className="rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => openDeleteModal(role)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
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
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-slate-600">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, roles.length)} of {roles.length} roles
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    currentPage === page
                      ? "bg-slate-900 text-white"
                      : "border text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {isAddMode ? "Add Role" : "Edit Role"}
              </h2>

              <button
                onClick={closeModal}
                className="rounded-md px-3 py-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Role Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={selectedRole.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Enter role name"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  name="description"
                  value={selectedRole.description}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Enter role description"
                  rows={4}
                />
              </div>

              {message && <p className="text-sm text-slate-600">{message}</p>}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading
                    ? "Saving..."
                    : isAddMode
                      ? "Add Role"
                      : "Update Role"}
                </button>

                {!isAddMode && (
                  <button
                    type="button"
                    onClick={() => openDeleteModal(selectedRole)}
                    className="rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && roleToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete Role
            </h3>

            <p className="mt-3 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {roleToDelete.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={loading}
                className="rounded-lg border px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
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