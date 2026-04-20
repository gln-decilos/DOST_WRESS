"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import AppSidebar from "@/components/layout/sidebar/orgadmin-sidebar"
import { Topbar } from "@/components/layout/topbar"

function OrgAdminDashboardContent({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { userId, user, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !userId) {
      router.push("/signin")
    }
  }, [isLoading, userId, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Loading..</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <div className="bg-background">
      <div className="mx-auto px-2 py-3 sm:px-4 sm:py-6">
        <div className="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border">
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div className="flex h-[95vh]">
            <div
              className={`
                fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
              `}
            >
              <AppSidebar />
            </div>

            <main className="flex-1 w-full overflow-auto rounded-b-3xl bg-muted p-3 sm:p-5 md:px-7 md:py-7 lg:w-auto lg:rounded-r-3xl lg:rounded-bl-none xl:pb-7 xl:pt-0">
              <Topbar onMenuClick={() => setSidebarOpen(true)} />
              {children}
              <p className="mt-2 text-center text-xs text-muted-foreground bottom-0">
                © All rights reserved by WRESS 2026.
              </p>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrgAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <OrgAdminDashboardContent>{children}</OrgAdminDashboardContent>
    </AuthProvider>
  )
}