"use client"

import { useEffect, useState } from "react"

type Role = {
  id: number
  name: string
  description: string
}

const API_BASE_URL = "http://127.0.0.1:5000/api/admin"

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE_URL}/roles`)
      .then((res) => res.json())
      .then((data) => setRoles(data))
      .catch((err) => console.error("Failed to fetch roles:", err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="rounded-2xl bg-card p-6 md:p-8 shadow-sm ring-1 ring-border">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Roles</h1>
          <p className="mt-2 text-muted-foreground">
            Manage default and custom access roles.
          </p>
        </div>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          Add Role
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading roles...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <div key={role.id} className="rounded-xl border p-4">
              <h2 className="text-lg font-semibold">{role.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {role.description || "No description provided."}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}