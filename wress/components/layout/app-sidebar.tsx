"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { ChevronFirst, ChevronLast } from "lucide-react"
import { navigationByRole, type AppRole } from "@/features/access/navigation"

type AppSidebarProps = {
  role: AppRole
}

export default function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  const items = navigationByRole[role] ?? []

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-open")
    if (saved) setOpen(saved === "1")
  }, [])

  useEffect(() => {
    localStorage.setItem("sidebar-open", open ? "1" : "0")
  }, [open])

  return (
    <aside
      className={`bg-sidebar-gradient text-white transition-[width] duration-300 rounded-l-3xl flex flex-col h-full ${
        open ? "w-52" : "w-20"
      }`}
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-white/20 font-bold">
            WA
          </div>

          <span className={`${open ? "block" : "hidden"} text-sm font-semibold`}>
            {role === "admin" ? "WRESS Admin" : "WRESS BA"}
          </span>
        </div>

        <button
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-lg bg-white/20 p-1.5 hover:bg-white/30"
        >
          {open ? <ChevronFirst className="size-5" /> : <ChevronLast className="size-5" />}
        </button>
      </div>

      <nav className="mt-2 flex-1">
        <ul className="flex flex-col gap-1 px-3">
          {items.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== "/" && pathname?.startsWith(href))

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                    active ? "bg-white text-brand" : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  <Icon className={`size-5 ${active ? "text-brand" : "text-white"}`} />
                  <span className={`${open ? "block" : "hidden"} text-sm`}>
                    {label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-3 pb-5 pt-2">
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-xs leading-5">
            {open
              ? role === "admin"
                ? "Manage users, roles, and organizations."
                : "Manage projects and requirements."
              : "Tip"}
          </p>
        </div>
      </div>
    </aside>
  )
}