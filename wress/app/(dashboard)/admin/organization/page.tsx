"use client"

import { useEffect, useMemo, useState } from "react"

type Organization = {
  id?: number
  name: string
  logo: string
  contact_email: string
  subscription_plan: string
  created_at?: string
  updated_at?: string
}

const API_BASE_URL = "http://127.0.0.1:5000/api/admin"
const ITEMS_PER_PAGE = 5

const emptyOrganization: Organization = {
  name: "",
  logo: "",
  contact_email: "",
  subscription_plan: "Basic",
}

export default function AdminOrganizationPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization>(emptyOrganization)

  const [organizationToDelete, setOrganizationToDelete] =
    useState<Organization | null>(null)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAddMode, setIsAddMode] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchOrganizations = async () => {
    try {
      setFetching(true)
      setMessage("")

      const res = await fetch(`${API_BASE_URL}/organizations`)
      const data = await res.json()
      setOrganizations(data)
    } catch (error) {
      console.error("Failed to fetch organizations:", error)
      setMessage("Failed to fetch organizations")
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const totalPages = Math.ceil(organizations.length / ITEMS_PER_PAGE)

  const paginatedOrganizations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return organizations.slice(startIndex, endIndex)
  }, [organizations, currentPage])

  const openAddModal = () => {
    setIsAddMode(true)
    setSelectedOrganization(emptyOrganization)
    setMessage("")
    setIsModalOpen(true)
  }

  const openEditModal = (organization: Organization) => {
    setIsAddMode(false)
    setSelectedOrganization(organization)
    setMessage("")
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedOrganization(emptyOrganization)
    setMessage("")
  }

  const openDeleteModal = (organization: Organization) => {
    setOrganizationToDelete(organization)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setOrganizationToDelete(null)
    setIsDeleteModalOpen(false)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setSelectedOrganization((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedOrganization((prev) => ({
        ...prev,
        logo: reader.result as string,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const method = selectedOrganization.id ? "PUT" : "POST"
      const url = selectedOrganization.id
        ? `${API_BASE_URL}/organizations/${selectedOrganization.id}`
        : `${API_BASE_URL}/organizations`

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedOrganization),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Something went wrong")
        return
      }

      setMessage(data.message || "Saved successfully")
      await fetchOrganizations()
      closeModal()
    } catch (error) {
      console.error(error)
      setMessage("Failed to save organization")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!organizationToDelete?.id) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/organizations/${organizationToDelete.id}`,
        {
          method: "DELETE",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to delete organization")
        return
      }

      setMessage(data.message || "Organization deleted successfully")

      const updatedOrganizations = organizations.filter(
        (org) => org.id !== organizationToDelete.id
      )
      const newTotalPages = Math.max(
        1,
        Math.ceil(updatedOrganizations.length / ITEMS_PER_PAGE)
      )

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages)
      }

      await fetchOrganizations()

      if (isModalOpen && selectedOrganization.id === organizationToDelete.id) {
        closeModal()
      }

      closeDeleteModal()
    } catch (error) {
      console.error("Delete failed:", error)
      setMessage("Failed to delete organization")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Organizations
          </h1>
          <p className="mt-2 text-muted-foreground">
            Admins can manage organizations, logos, contact emails, and plans.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Add Organization
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
                <th className="w-24 px-4 py-3 font-medium">Logo</th>
                <th className="px-4 py-3 font-medium">Organization Name</th>
                <th className="px-4 py-3 font-medium">Contact Email</th>
                <th className="w-40 px-4 py-3 font-medium">
                  Subscription Plan
                </th>
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
                    Loading organizations...
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No organizations found.
                  </td>
                </tr>
              ) : (
                paginatedOrganizations.map((org) => (
                  <tr key={org.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      {org.logo ? (
                        <img
                          src={org.logo}
                          alt={org.name}
                          className="h-12 w-12 rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground">
                          No Logo
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 font-medium text-foreground">
                      {org.name}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {org.contact_email || "-"}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {org.subscription_plan}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(org)}
                          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => openDeleteModal(org)}
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

        {!fetching && organizations.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, organizations.length)} of{" "}
              {organizations.length} organizations
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
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {isAddMode ? "Add Organization" : "Edit Organization"}
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
                  Organization Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={selectedOrganization.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="Enter organization name"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Logo Upload
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground file:text-foreground"
                />

                {selectedOrganization.logo && (
                  <div className="mt-3">
                    <p className="mb-2 text-sm text-muted-foreground">
                      Logo Preview
                    </p>
                    <img
                      src={selectedOrganization.logo}
                      alt="Logo Preview"
                      className="h-20 w-20 rounded-lg border border-border object-cover"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contact_email"
                  value={selectedOrganization.contact_email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="admin@organization.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Subscription Plan
                </label>
                <select
                  name="subscription_plan"
                  value={selectedOrganization.subscription_plan}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                >
                  <option value="Basic">Basic</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
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
                      ? "Add Organization"
                      : "Update Organization"}
                </button>

                {!isAddMode && (
                  <button
                    type="button"
                    onClick={() => openDeleteModal(selectedOrganization)}
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

      {isDeleteModalOpen && organizationToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Delete Organization
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {organizationToDelete.name}
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
                className="rounded-lg bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
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