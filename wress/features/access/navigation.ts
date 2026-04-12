import {
  Home,
  UserRound,
  Shield,
  Building2,
  FolderKanban,
  FileText,
} from "lucide-react"
import type React from "react"

export type NavigationItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
}

export const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/profile", label: "Profile", icon: UserRound },
  {
    href: "/organization",
    label: "Organization",
    icon: Building2,
    permission: "organization.view",
  },
  {
    href: "/roles",
    label: "Roles",
    icon: Shield,
    permission: "roles.view",
  },
  {
    href: "/users",
    label: "Users",
    icon: UserRound,
    permission: "users.view",
  },
  {
    href: "/templates",
    label: "Templates",
    icon: FileText,
    permission: "templates.view",
  },
  {
    href: "/project",
    label: "Projects",
    icon: FolderKanban,
    permission: "project.view",
  },
]