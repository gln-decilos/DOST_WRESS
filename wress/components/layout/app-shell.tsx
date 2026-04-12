import type { ReactNode } from "react"
import AppSidebar from "@/components/layout/app-sidebar"

type AppShellProps = {
  title?: string
  children: ReactNode
}

export default function AppShell({
  title,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AppSidebar />

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