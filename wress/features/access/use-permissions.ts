"use client"

import { useEffect, useMemo, useState } from "react"

const ACCESS_API_URL = "http://localhost:5000/api/access/me/permissions"

export default function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await fetch(ACCESS_API_URL, {
          method: "GET",
          credentials: "include",
        })

        const data = await res.json()

        if (!res.ok) {
          setPermissions([])
          return
        }

        setPermissions(data.permissions || [])
      } catch (error) {
        console.error("Failed to fetch permissions:", error)
        setPermissions([])
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [])

  const permissionSet = useMemo(() => new Set(permissions), [permissions])

  const hasPermission = (key: string) => permissionSet.has(key)

  return {
    permissions,
    loading,
    hasPermission,
  }
}