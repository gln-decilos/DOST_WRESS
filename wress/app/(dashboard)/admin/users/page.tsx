"use client"

import { useEffect, useState } from "react"

type User = {
  id: number
  full_name: string
  email: string
  role_name: string
  organization_name: string
  is_active: boolean
}

const API_BASE_URL = "http://127.0.0.1:5000/api/admin"

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE_URL}/users`)
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error("Failed to fetch users:", err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="rounded-2xl bg-card p-6 md:p-8 shadow-sm ring-1 ring-border">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="mt-2 text-muted-foreground">
            Manage user accounts, roles, and status.
          </p>
        </div>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          Add User
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading users...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b">
                <th className="py-3">Name</th>
                <th className="py-3">Email</th>
                <th className="py-3">Organization</th>
                <th className="py-3">Role</th>
                <th className="py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-3">{user.full_name}</td>
                  <td className="py-3">{user.email}</td>
                  <td className="py-3">{user.organization_name}</td>
                  <td className="py-3">{user.role_name}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        user.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}