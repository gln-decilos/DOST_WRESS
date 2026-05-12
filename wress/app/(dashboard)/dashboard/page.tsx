"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    let userType = "Stakeholder"

    if (storedUser && storedUser !== "undefined") {
      try {
        const user = JSON.parse(storedUser)
        userType = user?.user_type || userType
      } catch {
        userType = "Stakeholder"
      }
    }

    if (userType === "System Admin") {
      router.replace("/sys-admin/dashboard")
      return
    }

    if (userType === "Organization Admin") {
      router.replace("/org-admin/dashboard")
      return
    }

    router.replace("/stakeholder/dashboard")
  }, [router])

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground">Opening dashboard</h1>
      <p className="text-muted-foreground">Please wait while WRESS opens the right dashboard for your account.</p>
    </section>
  )
}
