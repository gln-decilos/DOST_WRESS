import type { ReactNode } from "react"
import AppSidebar from "@/components/layout/app-sidebar"
import type { AppRole } from "@/features/access/navigation"

type AppShellProps = {
  role: AppRole
  title?: string
  children: ReactNode
}

export default function AppShell({
  role,
  title,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AppSidebar role={role} />

        <main className="flex-1">
          <div className="border-b border-border bg-card px-6 py-4">
            <h1 className="text-xl font-semibold text-foreground">
              {title || "Dashboard"}
            </h1>
          </div>

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}