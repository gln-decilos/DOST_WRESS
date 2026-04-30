"use client"

import { useEffect, useMemo, useState } from "react"

const ACCESS_API_URL = "http://localhost:5000/api/access/me/permissions"

const getAuthToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
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

export default function usePermissions(projectId?: number | null) {
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true)

        const url =
          projectId && !Number.isNaN(projectId)
            ? `${ACCESS_API_URL}?project_id=${projectId}`
            : ACCESS_API_URL

        const res = await fetch(url, {
          method: "GET",
          headers: createAuthHeaders(),
          credentials: "include",
        })

        const data = await res.json()

        if (!res.ok) {
          setPermissions([])
          return
        }

        setPermissions(Array.isArray(data.permissions) ? data.permissions : [])
      } catch (error) {
        console.error("Failed to fetch permissions:", error)
        setPermissions([])
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [projectId])

  const permissionSet = useMemo(() => {
    return new Set(permissions)
  }, [permissions])

  const hasPermission = (permissionKey: string) => {
    return permissionSet.has(permissionKey)
  }

  return {
    permissions,
    loading,
    hasPermission,
  }
}