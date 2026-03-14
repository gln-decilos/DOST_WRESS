"use client"

import { useEffect, useState } from "react"

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
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
        >
          Add Organization
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
                <th className="w-24 px-4 py-3 font-medium">Logo</th>
                <th className="px-4 py-3 font-medium">Organization Name</th>
                <th className="px-4 py-3 font-medium">Contact Email</th>
                <th className="w-40 px-4 py-3 font-medium">Subscription Plan</th>
                <th className="w-40 px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Loading organizations...
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="border-t">
                    <td className="px-4 py-3">
                      {org.logo ? (
                        <img
                          src={org.logo}
                          alt={org.name}
                          className="h-12 w-12 rounded-lg border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-slate-100 text-xs text-slate-400">
                          No Logo
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-800">
                      {org.name}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {org.contact_email || "-"}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {org.subscription_plan}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(org)}
                          className="rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => openDeleteModal(org)}
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
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {isAddMode ? "Add Organization" : "Edit Organization"}
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
                  Organization Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={selectedOrganization.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Enter organization name"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Logo Upload
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full rounded-lg border px-3 py-2"
                />

                {selectedOrganization.logo && (
                  <div className="mt-3">
                    <p className="mb-2 text-sm text-slate-500">Logo Preview</p>
                    <img
                      src={selectedOrganization.logo}
                      alt="Logo Preview"
                      className="h-20 w-20 rounded-lg border object-cover"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contact_email"
                  value={selectedOrganization.contact_email}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="admin@organization.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Subscription Plan
                </label>
                <select
                  name="subscription_plan"
                  value={selectedOrganization.subscription_plan}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="Basic">Basic</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                </select>
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
                      ? "Add Organization"
                      : "Update Organization"}
                </button>

                {!isAddMode && (
                  <button
                    type="button"
                    onClick={() => openDeleteModal(selectedOrganization)}
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

      {isDeleteModalOpen && organizationToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete Organization
            </h3>

            <p className="mt-3 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {organizationToDelete.name}
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