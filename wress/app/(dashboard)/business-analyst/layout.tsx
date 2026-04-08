import type { ReactNode } from "react"
import AppSidebar from "@/components/layout/app-sidebar"
import { Topbar } from "@/components/layout/topbar"

export default function BusinessAnalystLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="flex h-[calc(100vh-2rem)] gap-4 overflow-hidden">
        <AppSidebar role="business_analyst" />

        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          <Topbar />

          <main className="flex-1 overflow-y-auto rounded-3xl">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}