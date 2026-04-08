import {
  Home,
  UserRound,
  Shield,
  Building2,
  FolderKanban,
  FileText,
} from "lucide-react"
import type React from "react"

export type AppRole = "admin" | "business_analyst"

export type NavigationItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export const navigationByRole: Record<AppRole, NavigationItem[]> = {
  admin: [
    { href: "/admin/dashboard", label: "Dashboard", icon: Home },
    { href: "/admin/profile", label: "Profile", icon: UserRound },
    { href: "/admin/organization", label: "Organization", icon: Building2 },
    { href: "/admin/roles", label: "Roles", icon: Shield },
    { href: "/admin/users", label: "Users", icon: UserRound },
  ],
  business_analyst: [
    { href: "/business-analyst/dashboard", label: "Dashboard", icon: Home },
    { href: "/business-analyst/profile", label: "Profile", icon: UserRound },
    { href: "/business-analyst/projects", label: "Projects", icon: FolderKanban },
    { href: "/business-analyst/projects", label: "Vision & Scope", icon: FileText },
  ],
}