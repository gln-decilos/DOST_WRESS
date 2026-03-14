"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Building2, Users, ShieldCheck } from "lucide-react"

const adminLinks = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Organization", href: "/admin/organization", icon: Building2 },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Roles", href: "/admin/roles", icon: ShieldCheck },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">WRESS Admin</h1>
        <p className="text-sm text-slate-400">Administration Panel</p>
      </div>

      <nav className="space-y-2">
        {adminLinks.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                isActive
                  ? "bg-white text-slate-900 font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}