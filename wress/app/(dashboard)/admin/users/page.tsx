"use client"

import { useEffect, useMemo, useState } from "react"

type User = {
  id?: number
  first_name: string
  last_name: string
  full_name?: string
  email: string
  password?: string
  is_active: boolean
  organizations: { id: number; name: string }[]
  roles: { id: number; name: string }[]
}

type RoleOption = {
  id: number
  name: string
}

type OrganizationOption = {
  id: number
  name: string
}

const API_BASE_URL = "http://127.0.0.1:5000/api/admin"
const ITEMS_PER_PAGE = 5

const emptyUser: User = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  is_active: true,
  organizations: [],
  roles: [],
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])

  const [selectedUser, setSelectedUser] = useState<User>(emptyUser)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAddMode, setIsAddMode] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchUsers = async () => {
    try {
      setFetching(true)
      setMessage("")

      const res = await fetch(`${API_BASE_URL}/users`)
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error("Failed to fetch users:", error)
      setMessage("Failed to fetch users")
    } finally {
      setFetching(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/roles`)
      const data = await res.json()
      setRoles(data)
    } catch (error) {
      console.error("Failed to fetch roles:", error)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/organizations`)
      const data = await res.json()
      setOrganizations(data)
    } catch (error) {
      console.error("Failed to fetch organizations:", error)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
    fetchOrganizations()
  }, [])

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE)

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return users.slice(startIndex, endIndex)
  }, [users, currentPage])

  const openAddModal = () => {
    setIsAddMode(true)
    setSelectedUser(emptyUser)
    setMessage("")
    setIsModalOpen(true)
  }

  const openEditModal = (user: User) => {
    setIsAddMode(false)
    setSelectedUser({
      ...user,
      password: "",
    })
    setMessage("")
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedUser(emptyUser)
    setMessage("")
  }

  const openDeleteModal = (user: User) => {
    setUserToDelete(user)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setUserToDelete(null)
    setIsDeleteModalOpen(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    setSelectedUser((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const toggleRole = (role: RoleOption) => {
    setSelectedUser((prev) => {
      const exists = prev.roles.some((r) => r.id === role.id)

      return {
        ...prev,
        roles: exists
          ? prev.roles.filter((r) => r.id !== role.id)
          : [...prev.roles, role],
      }
    })
  }

  const toggleOrganization = (organization: OrganizationOption) => {
    setSelectedUser((prev) => {
      const exists = prev.organizations.some((o) => o.id === organization.id)

      return {
        ...prev,
        organizations: exists
          ? prev.organizations.filter((o) => o.id !== organization.id)
          : [...prev.organizations, organization],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const method = selectedUser.id ? "PUT" : "POST"
      const url = selectedUser.id
        ? `${API_BASE_URL}/users/${selectedUser.id}`
        : `${API_BASE_URL}/users`

      const payload = {
        first_name: selectedUser.first_name,
        last_name: selectedUser.last_name,
        email: selectedUser.email,
        password: selectedUser.password || "",
        is_active: selectedUser.is_active,
        organization_ids: selectedUser.organizations.map((org) => org.id),
        role_ids: selectedUser.roles.map((role) => role.id),
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Something went wrong")
        return
      }

      setMessage(data.message || "Saved successfully")
      await fetchUsers()
      closeModal()
    } catch (error) {
      console.error("Failed to save user:", error)
      setMessage("Failed to save user")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!userToDelete?.id) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(`${API_BASE_URL}/users/${userToDelete.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to delete user")
        return
      }

      setMessage(data.message || "User deleted successfully")

      const updatedUsers = users.filter((user) => user.id !== userToDelete.id)
      const newTotalPages = Math.max(
        1,
        Math.ceil(updatedUsers.length / ITEMS_PER_PAGE)
      )

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages)
      }

      await fetchUsers()

      if (isModalOpen && selectedUser.id === userToDelete.id) {
        closeModal()
      }

      closeDeleteModal()
    } catch (error) {
      console.error("Delete failed:", error)
      setMessage("Failed to delete user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="mt-2 text-muted-foreground">
            Manage user accounts, roles, organizations, and status.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Add User
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Organizations</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="w-40 px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {user.full_name || `${user.first_name} ${user.last_name}`}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {user.email}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {user.organizations.length > 0
                        ? user.organizations.map((org) => org.name).join(", ")
                        : "-"}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {user.roles.length > 0
                        ? user.roles.map((role) => role.name).join(", ")
                        : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          user.is_active
                            ? "bg-green-500/10 text-green-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => openDeleteModal(user)}
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

        {!fetching && users.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, users.length)} of{" "}
              {users.length} users
            </p>

            <div className="flex items-center gap-2">
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
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {isAddMode ? "Add User" : "Edit User"}
              </h2>

              <button
                onClick={closeModal}
                className="rounded-md px-3 py-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={selectedUser.first_name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    placeholder="Enter first name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={selectedUser.last_name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={selectedUser.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {isAddMode
                    ? "Password"
                    : "Password (leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  name="password"
                  value={selectedUser.password || ""}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="Enter password"
                  required={isAddMode}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Organizations
                </label>
                <div className="grid gap-2 rounded-lg border border-border bg-background p-3 md:grid-cols-2">
                  {organizations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No organizations found.
                    </p>
                  ) : (
                    organizations.map((organization) => (
                      <label
                        key={organization.id}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUser.organizations.some(
                            (org) => org.id === organization.id
                          )}
                          onChange={() => toggleOrganization(organization)}
                        />
                        {organization.name}
                      </label>
                    ))
                  )}
                </div>
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
                          checked={selectedUser.roles.some(
                            (r) => r.id === role.id
                          )}
                          onChange={() => toggleRole(role)}
                        />
                        {role.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={selectedUser.is_active}
                    onChange={handleChange}
                  />
                  Active User
                </label>
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
                  {loading ? "Saving..." : isAddMode ? "Add User" : "Update User"}
                </button>

                {!isAddMode && (
                  <button
                    type="button"
                    onClick={() => openDeleteModal(selectedUser)}
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

      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Delete User
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {userToDelete.full_name ||
                  `${userToDelete.first_name} ${userToDelete.last_name}`}
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