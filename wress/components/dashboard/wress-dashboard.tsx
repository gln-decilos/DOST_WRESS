"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

type DashboardMode = "business" | "organization" | "system" | "stakeholder"
type FetchStatus = "checking" | "live" | "partial" | "offline"

type Role = {
  id?: number
  role_id?: number
  name?: string
  role_name?: string
  description?: string | null
}

type Permission = {
  id?: number
  key?: string
  label?: string
  module?: string
  description?: string | null
}

type Organization = {
  id?: number
  name?: string
  logo?: string | null
  contact_email?: string | null
  subscription_plan?: string | null
}

type User = {
  id?: number
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  user_type?: string
  is_active?: boolean
  roles?: Role[]
  organizations?: Organization[]
  permissions?: Permission[]
  permission_keys?: string[]
}

type Project = {
  id?: number
  project_id?: number
  name?: string
  project_name?: string
  description?: string | null
  status?: string | null
  start_date?: string | null
  end_date?: string | null
  organization_id?: number
  organization_name?: string | null
  project_manager_id?: number | null
  project_manager_name?: string | null
  created_at?: string | null
  updated_at?: string | null
  roles?: Role[]
  permissions?: string[]
  stakeholder_count?: number
  requirement_document_count?: number
  vision_document_count?: number
}

type Template = {
  id?: number
  name?: string
  module?: string
  description?: string | null
  is_active?: boolean
  is_default?: boolean
}

type ProfilePayload = {
  user?: User
  organizations?: Organization[]
  projects?: Project[]
}

type StakeholderPayload = {
  stakeholders?: unknown[]
}

type DashboardData = {
  profile: ProfilePayload | null
  organizations: Organization[]
  users: User[]
  roles: Role[]
  projects: Project[]
  templates: Template[]
}

type Metric = {
  label: string
  value: string
  helper: string
  icon: LucideIcon
}

type ActionItem = {
  title: string
  helper: string
  href: string
  icon: LucideIcon
}

type WressDashboardProps = {
  mode?: DashboardMode
}

const API_BASE_URL = "http://localhost:5000/api"

const emptyDashboardData: DashboardData = {
  profile: null,
  organizations: [],
  users: [],
  roles: [],
  projects: [],
  templates: [],
}

const modeContent: Record<
  DashboardMode,
  {
    eyebrow: string
    title: string
    description: string
    primaryHref: string
    primaryLabel: string
  }
> = {
  business: {
    eyebrow: "My WRESS workspace",
    title: "See your assigned projects and allowed actions",
    description:
      "Your dashboard changes based on your project roles and permissions, so you only see the work you are allowed to do.",
    primaryHref: "/project",
    primaryLabel: "Open projects",
  },
  organization: {
    eyebrow: "Organization admin dashboard",
    title: "Manage your organization workspace",
    description:
      "Create users, manage roles, create projects, assign project managers, and maintain document templates for your organization.",
    primaryHref: "/org-admin/projects",
    primaryLabel: "Manage projects",
  },
  system: {
    eyebrow: "System admin dashboard",
    title: "Manage organizations and users",
    description:
      "Keep the WRESS platform organized by focusing only on registered organizations and user accounts.",
    primaryHref: "/sys-admin/organization",
    primaryLabel: "Manage organizations",
  },
  stakeholder: {
    eyebrow: "Stakeholder dashboard",
    title: "Your project roles and review work",
    description:
      "Each project can give you different roles. You may have two roles in one project and another role in a different project.",
    primaryHref: "/stakeholder/projects/projects-page",
    primaryLabel: "Open my projects",
  },
}

const roleHelp: Record<string, string> = {
  "Project Manager": "Can manage assigned projects and project members when allowed.",
  "Business Analyst": "Can prepare and update project documents and requirements.",
  "Product Owner": "Can check priorities, scope, and approval decisions.",
  Developer: "Can view project details and give comments or review when allowed.",
  Tester: "Can check requirements and give review comments when allowed.",
  Stakeholder: "Can view projects, approve or reject requirements, and decide if pushed changes continue when allowed.",
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return { "Content-Type": "application/json" }
  }

  const token = localStorage.getItem("token") || sessionStorage.getItem("token")

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: getAuthHeaders(),
    credentials: "include",
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message =
      data?.message || data?.error || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return data as T
}

function normalizeList<T>(payload: unknown, key?: string): T[] {
  if (Array.isArray(payload)) return payload as T[]

  if (
    payload &&
    typeof payload === "object" &&
    key &&
    Array.isArray((payload as Record<string, unknown>)[key])
  ) {
    return (payload as Record<string, T[]>)[key]
  }

  return []
}

function getProjectId(project: Project) {
  return project.id ?? project.project_id
}

function getProjectName(project: Project) {
  return project.name || project.project_name || "Untitled project"
}

function getRoleName(role: Role) {
  return role.name || role.role_name || "Role"
}

function getUserName(user?: User) {
  if (!user) return "Unknown user"
  return (
    user.full_name ||
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    user.email ||
    "Unknown user"
  )
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function normalizeStatus(status?: string | null) {
  return (status || "Not set").trim()
}

function isActiveUser(user: User) {
  return user.is_active !== false
}

function isArchived(project: Project) {
  return normalizeStatus(project.status).toLowerCase() === "archived"
}

function isCompleted(project: Project) {
  return normalizeStatus(project.status).toLowerCase() === "completed"
}

function isActiveProject(project: Project) {
  return !isArchived(project) && !isCompleted(project)
}

function formatDate(value?: string | null) {
  if (!value) return "No due date"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No due date"

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function initials(value?: string) {
  const cleanValue = (value || "WRESS").trim()
  const parts = cleanValue.split(/\s+/).filter(Boolean)

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] || "W"}${parts[1][0] || "A"}`.toUpperCase()
}

function getStatusClasses(status?: string | null) {
  switch (normalizeStatus(status).toLowerCase()) {
    case "active":
    case "in progress":
      return "bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300"
    case "completed":
    case "approved":
      return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300"
    case "pending":
    case "draft":
      return "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300"
    case "archived":
    case "inactive":
      return "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300"
    default:
      return "bg-brand/10 text-brand ring-brand/20"
  }
}

function hasPermission(project: Project, permissionKey: string) {
  return Boolean(project.permissions?.includes(permissionKey))
}

function getProjectActionLabels(project: Project) {
  const actions: string[] = []

  if (hasPermission(project, "project_members.manage")) {
    actions.push("Manage members")
  }

  if (hasPermission(project, "project.edit")) {
    actions.push("Update project")
  }

  if (
    hasPermission(project, "requirements.create") ||
    hasPermission(project, "requirements.edit")
  ) {
    actions.push("Work on requirements")
  }

  if (
    hasPermission(project, "requirements.approve") ||
    hasPermission(project, "requirements.reject")
  ) {
    actions.push("Approve or reject requirements")
  }

  if (hasPermission(project, "requirements.decide_change_request")) {
    actions.push("Decide pushed changes")
  }

  if (hasPermission(project, "requirements.request_change")) {
    actions.push("Request requirement changes")
  }

  if (
    hasPermission(project, "vision_scope.create") ||
    hasPermission(project, "vision_scope.edit")
  ) {
    actions.push("Work on vision and scope")
  }

  if (actions.length === 0 && hasPermission(project, "project.view")) {
    actions.push("View project")
  }

  return actions
}

function getProjectOpenLink(project: Project, mode: DashboardMode) {
  const projectId = getProjectId(project)

  if (!projectId) {
    return mode === "stakeholder"
      ? "/stakeholder/projects/projects-page"
      : "/project"
  }

  if (mode === "stakeholder") {
    return `/stakeholder/projects/project-details?projectId=${projectId}`
  }

  return `/project/project-details?projectId=${projectId}`
}

function countUserRoles(users: User[]) {
  return users.reduce((total, user) => total + (user.roles?.length || 0), 0)
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        className || "bg-muted text-muted-foreground ring-border"
      )}
    >
      {children}
    </span>
  )
}

function StatCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon

  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-brand/10 p-3 text-brand ring-1 ring-brand/15">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-5 text-sm font-medium text-muted-foreground">{metric.label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        {metric.value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.helper}</p>
    </article>
  )
}

function ActionCard({ item }: { item: ActionItem }) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className="group rounded-3xl border border-border bg-background/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-muted/70 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-brand/10 p-3 text-brand ring-1 ring-brand/15">
          <Icon className="size-5" />
        </div>
        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-brand" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.helper}</p>
    </Link>
  )
}

function EmptyState({ label, helper }: { label: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/70 p-6 text-center">
      <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <FileText className="size-5" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {helper || "Data will appear here once WRESS can read it from the API."}
      </p>
    </div>
  )
}

function OrganizationLogo({ organization }: { organization?: Organization }) {
  const name = organization?.name || "Organization"

  if (organization?.logo) {
    return (
      <div className="grid size-16 place-items-center overflow-hidden rounded-3xl border border-border bg-background shadow-sm">
        <img
          src={organization.logo}
          alt={`${name} logo`}
          className="size-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="grid size-16 place-items-center rounded-3xl bg-brand text-lg font-bold text-white shadow-sm">
      {initials(name)}
    </div>
  )
}

function RoleBadges({ roles }: { roles?: Role[] }) {
  const roleNames = uniqueValues((roles || []).map(getRoleName))

  if (roleNames.length === 0) {
    return <Badge>No role set</Badge>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {roleNames.map((roleName) => (
        <Badge key={roleName} className="bg-brand/10 text-brand ring-brand/20">
          {roleName}
        </Badge>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status?: string | null }) {
  return <Badge className={getStatusClasses(status)}>{normalizeStatus(status)}</Badge>
}

function DashboardHero({
  mode,
  organization,
  status,
  updatedAt,
  errorCount,
}: {
  mode: DashboardMode
  organization?: Organization
  status: FetchStatus
  updatedAt: string
  errorCount: number
}) {
  const content = modeContent[mode]
  const showOrganization = mode === "organization"

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm md:p-8">
      <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-brand/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-chart-2/10 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
        <div className="flex gap-5">
          {showOrganization && <OrganizationLogo organization={organization} />}

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand ring-1 ring-brand/15">
                <Sparkles className="size-3.5" />
                {content.eyebrow}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1",
                  status === "live" &&
                    "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
                  status === "partial" &&
                    "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
                  status === "offline" &&
                    "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300",
                  status === "checking" && "bg-muted text-muted-foreground ring-border"
                )}
              >
                <Activity className="size-3.5" />
                {status === "checking"
                  ? "Checking data"
                  : status === "live"
                    ? "Loaded"
                    : status === "partial"
                      ? "Some data loaded"
                      : "API not connected"}
              </span>
            </div>

            {showOrganization && (
              <p className="mb-2 text-sm font-semibold text-brand">
                {organization?.name || "No organization found"}
              </p>
            )}

            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              {content.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {content.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={content.primaryHref}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                {content.primaryLabel}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-background/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Dashboard status</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {updatedAt ? `Last checked ${updatedAt}` : "Preparing your dashboard"}
              </p>
            </div>
            <div className="grid size-11 place-items-center rounded-2xl bg-brand/10 text-brand">
              <RefreshCw className={cn("size-5", status === "checking" && "animate-spin")} />
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Main focus</span>
              <span className="font-semibold text-foreground">
                {mode === "system"
                  ? "Organizations and users"
                  : mode === "organization"
                    ? "Organization work"
                    : "Assigned projects"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Data notes</span>
              <span className="font-semibold text-foreground">
                {errorCount === 0 ? "No issue found" : `${errorCount} item${errorCount === 1 ? "" : "s"} missed`}
              </span>
            </div>
          </div>

          {errorCount > 0 && (
            <p className="mt-4 rounded-2xl bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300">
              Some data could not be loaded. The dashboard still shows the information that WRESS allowed.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function SectionCard({
  label,
  title,
  children,
  action,
}: {
  label: string
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            {label}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function SystemDashboard({ data }: { data: DashboardData }) {
  const activeUsers = data.users.filter(isActiveUser)
  const organizationAdmins = data.users.filter(
    (user) => user.user_type === "Organization Admin"
  )
  const systemAdmins = data.users.filter((user) => user.user_type === "System Admin")

  const metrics: Metric[] = [
    {
      label: "Organizations",
      value: String(data.organizations.length),
      helper: "Organizations registered in WRESS.",
      icon: Building2,
    },
    {
      label: "Users",
      value: String(data.users.length),
      helper: "All user accounts in the platform.",
      icon: Users,
    },
    {
      label: "Active users",
      value: String(activeUsers.length),
      helper: "Users who can still sign in.",
      icon: BadgeCheck,
    },
    {
      label: "Organization admins",
      value: String(organizationAdmins.length),
      helper: "Admins assigned to manage organizations.",
      icon: UserCog,
    },
  ]

  const actions: ActionItem[] = [
    {
      title: "Manage organizations",
      helper: "Create, update, or check organization records.",
      href: "/sys-admin/organization",
      icon: Building2,
    },
    {
      title: "Manage users",
      helper: "Create user accounts and assign user type.",
      href: "/sys-admin/users",
      icon: Users,
    },
  ]

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard label="Allowed work" title="System admin actions">
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((item) => (
              <ActionCard key={item.title} item={item} />
            ))}
          </div>
        </SectionCard>

        <SectionCard label="Organizations" title="Recently loaded organizations">
          {data.organizations.length === 0 ? (
            <EmptyState label="No organizations loaded" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Organization</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background/60">
                  {data.organizations.slice(0, 6).map((organization) => (
                    <tr key={organization.id || organization.name}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {organization.name || "Unnamed organization"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {organization.subscription_plan || "Not set"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {organization.contact_email || "No contact"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard label="Users" title="User accounts by type">
        {data.users.length === 0 ? (
          <EmptyState label="No users loaded" />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">System admins</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{systemAdmins.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Organization admins</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {organizationAdmins.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Stakeholders</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {data.users.filter((user) => user.user_type === "Stakeholder").length}
              </p>
            </div>
          </div>
        )}
      </SectionCard>
    </>
  )
}

function OrganizationDashboard({ data, organization }: { data: DashboardData; organization?: Organization }) {
  const activeUsers = data.users.filter(isActiveUser)
  const activeProjects = data.projects.filter(isActiveProject)
  const projectsWithManagers = data.projects.filter((project) => project.project_manager_id)
  const activeTemplates = data.templates.filter((template) => template.is_active !== false)

  const metrics: Metric[] = [
    {
      label: "Organization users",
      value: String(data.users.length),
      helper: `${activeUsers.length} active user${activeUsers.length === 1 ? "" : "s"} in ${organization?.name || "your organization"}.`,
      icon: Users,
    },
    {
      label: "Roles",
      value: String(data.roles.length),
      helper: "Roles used to control what users can do.",
      icon: ShieldCheck,
    },
    {
      label: "Projects",
      value: String(data.projects.length),
      helper: `${activeProjects.length} active project${activeProjects.length === 1 ? "" : "s"}.`,
      icon: FolderKanban,
    },
    {
      label: "Templates",
      value: String(data.templates.length),
      helper: `${activeTemplates.length} active template${activeTemplates.length === 1 ? "" : "s"} for documents.`,
      icon: FileText,
    },
  ]

  const actions: ActionItem[] = [
    {
      title: "Manage users",
      helper: "Add and update users inside your organization.",
      href: "/org-admin/users",
      icon: Users,
    },
    {
      title: "Manage roles",
      helper: "Set roles and permissions for project work.",
      href: "/org-admin/roles",
      icon: ShieldCheck,
    },
    {
      title: "Manage projects",
      helper: "Create projects and assign the project manager.",
      href: "/org-admin/projects",
      icon: FolderKanban,
    },
    {
      title: "Manage templates",
      helper: "Create and update document templates for the organization.",
      href: "/org-admin/templates",
      icon: FileText,
    },
  ]

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard label="Allowed work" title="Organization admin actions">
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((item) => (
              <ActionCard key={item.title} item={item} />
            ))}
          </div>
        </SectionCard>

        <SectionCard label="Projects" title="Project manager assignments">
          {data.projects.length === 0 ? (
            <EmptyState label="No projects loaded" helper="Create a project and assign a project manager from your organization." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Manager</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background/60">
                  {data.projects.slice(0, 6).map((project) => (
                    <tr key={getProjectId(project) || getProjectName(project)}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {getProjectName(project)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {project.project_manager_name || "No manager assigned"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={project.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.projects.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {projectsWithManagers.length} of {data.projects.length} project
              {data.projects.length === 1 ? "" : "s"} already have a project manager.
            </p>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard label="Users and roles" title="Organization user setup">
          {data.users.length === 0 ? (
            <EmptyState label="No organization users loaded" />
          ) : (
            <div className="space-y-3">
              {data.users.slice(0, 5).map((user) => (
                <article
                  key={user.id || user.email}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">{getUserName(user)}</p>
                    <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{user.user_type || "Stakeholder"}</Badge>
                    <StatusBadge status={user.is_active === false ? "Inactive" : "Active"} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard label="Templates" title="Document templates">
          {data.templates.length === 0 ? (
            <EmptyState label="No templates loaded" helper="Add templates so projects can use the same document format." />
          ) : (
            <div className="space-y-3">
              {data.templates.slice(0, 5).map((template) => (
                <article
                  key={template.id || template.name}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {template.name || "Untitled template"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {template.module || "General document"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.is_default && <Badge className="bg-brand/10 text-brand ring-brand/20">Default</Badge>}
                    <StatusBadge status={template.is_active === false ? "Inactive" : "Active"} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </>
  )
}

function ProjectRoleTable({ projects, mode }: { projects: Project[]; mode: DashboardMode }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        label="No assigned projects loaded"
        helper="Projects will appear here after you are assigned a role in a project."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Project</th>
            <th className="px-4 py-3">My role in this project</th>
            <th className="px-4 py-3">What I can do</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Open</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background/60 align-top">
          {projects.map((project) => {
            const actions = getProjectActionLabels(project)

            return (
              <tr key={getProjectId(project) || getProjectName(project)}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground">{getProjectName(project)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due: {formatDate(project.end_date)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <RoleBadges roles={project.roles} />
                </td>
                <td className="px-4 py-3">
                  {actions.length === 0 ? (
                    <span className="text-muted-foreground">No action loaded</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {actions.slice(0, 4).map((action) => (
                        <Badge key={action}>{action}</Badge>
                      ))}
                      {actions.length > 4 && <Badge>+{actions.length - 4} more</Badge>}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={project.status} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={getProjectOpenLink(project, mode)}
                    className="inline-flex items-center gap-1.5 font-semibold text-brand"
                  >
                    Open
                    <ArrowRight className="size-3.5" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RoleGuide({ projects }: { projects: Project[] }) {
  const roleNames = uniqueValues(
    projects.flatMap((project) => (project.roles || []).map(getRoleName))
  )

  if (roleNames.length === 0) {
    return <EmptyState label="No roles loaded" helper="Your roles will appear after a project assignment is found." />
  }

  return (
    <div className="space-y-3">
      {roleNames.map((roleName) => (
        <article key={roleName} className="rounded-2xl border border-border bg-background/70 p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{roleName}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {roleHelp[roleName] || "This role controls what you can view and do in each assigned project."}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function StakeholderDashboard({ data, mode }: { data: DashboardData; mode: DashboardMode }) {
  const projects = data.projects
  const roleNames = uniqueValues(projects.flatMap((project) => (project.roles || []).map(getRoleName)))
  const projectsWithTwoRoles = projects.filter((project) => uniqueValues((project.roles || []).map(getRoleName)).length > 1)
  const reviewProjects = projects.filter(
    (project) =>
      hasPermission(project, "requirements.approve") ||
      hasPermission(project, "requirements.reject")
  )
  const manageMemberProjects = projects.filter((project) =>
    hasPermission(project, "project_members.manage")
  )
  const changeDecisionProjects = projects.filter((project) =>
    hasPermission(project, "requirements.decide_change_request")
  )
  const visibleDocs = projects.reduce(
    (total, project) =>
      total +
      (project.requirement_document_count || 0) +
      (project.vision_document_count || 0),
    0
  )

  const metrics: Metric[] = [
    {
      label: "Assigned projects",
      value: String(projects.length),
      helper: "Projects where you have at least one role.",
      icon: FolderKanban,
    },
    {
      label: "My roles",
      value: String(roleNames.length),
      helper: `${projectsWithTwoRoles.length} project${projectsWithTwoRoles.length === 1 ? "" : "s"} with more than one role.`,
      icon: ShieldCheck,
    },
    {
      label: "Review access",
      value: String(reviewProjects.length),
      helper: "Projects where you can approve or reject requirements.",
      icon: ClipboardCheck,
    },
    {
      label: "Member access",
      value: String(manageMemberProjects.length),
      helper: "Projects where you can manage stakeholders or members.",
      icon: Users,
    },
  ]

  const actions: ActionItem[] = [
    {
      title: "Open my projects",
      helper: "View the projects assigned to your roles.",
      href: mode === "stakeholder" ? "/stakeholder/projects/projects-page" : "/project",
      icon: FolderKanban,
    },
    {
      title: "Check requirements",
      helper: "Review, approve, reject, or comment when your project role allows it.",
      href: mode === "stakeholder" ? "/stakeholder/projects/projects-page" : "/project",
      icon: ListChecks,
    },
    {
      title: "Manage members when allowed",
      helper: "Project Managers can manage stakeholders and project members only in assigned projects with permission.",
      href: mode === "stakeholder" ? "/stakeholder/projects/stakeholders" : "/project",
      icon: UserCog,
    },
  ]

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard label="Project access" title="My projects, roles, and allowed actions">
          <ProjectRoleTable projects={projects} mode={mode} />
        </SectionCard>

        <SectionCard label="Role guide" title="What my roles mean">
          <RoleGuide projects={projects} />
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard label="Allowed work" title="Useful shortcuts">
          <div className="grid gap-3">
            {actions.map((item) => (
              <ActionCard key={item.title} item={item} />
            ))}
          </div>
        </SectionCard>

        <SectionCard label="Project work" title="Simple summary">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Documents I can view</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{visibleDocs}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Vision and requirements documents from projects that allowed access.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Pushed changes I can decide</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {changeDecisionProjects.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Based on the change decision permission in each project.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Projects where I manage members</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {manageMemberProjects.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This can be different for every project.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Loaded project members</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {projects.reduce((total, project) => total + (project.stakeholder_count || 0), 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Only counted from projects where member list access was allowed.
              </p>
            </div>
          </div>
        </SectionCard>
      </section>
    </>
  )
}

export function WressDashboard({ mode = "business" }: WressDashboardProps) {
  const [data, setData] = useState<DashboardData>(emptyDashboardData)
  const [status, setStatus] = useState<FetchStatus>("checking")
  const [updatedAt, setUpdatedAt] = useState("")
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    let mounted = true

    async function loadDashboardData() {
      setStatus("checking")
      setErrors([])

      const nextData: DashboardData = { ...emptyDashboardData }
      const nextErrors: string[] = []
      let successfulRequests = 0
      let attemptedRequests = 0

      const runRequest = async <T,>(label: string, request: () => Promise<T>) => {
        attemptedRequests += 1

        try {
          const result = await request()
          successfulRequests += 1
          return result
        } catch (error) {
          nextErrors.push(
            `${label}: ${error instanceof Error ? error.message : "Unable to load data"}`
          )
          return null
        }
      }

      if (mode === "system") {
        const [usersPayload, organizationsPayload] = await Promise.all([
          runRequest("Users", () => fetchJson<unknown>("/users")),
          runRequest("Organizations", () => fetchJson<unknown>("/users/organizations")),
        ])

        nextData.users = normalizeList<User>(usersPayload)
        nextData.organizations = normalizeList<Organization>(organizationsPayload)
      }

      if (mode === "organization") {
        const profilePayload = await runRequest("Profile", () =>
          fetchJson<ProfilePayload>("/profile/me")
        )

        if (profilePayload) {
          nextData.profile = profilePayload
          nextData.organizations = normalizeList<Organization>(profilePayload.organizations)
        }

        const [orgsPayload, usersPayload, rolesPayload, projectsPayload, templatesPayload] =
          await Promise.all([
            runRequest("My organization", () =>
              fetchJson<unknown>("/users/organization/organizations")
            ),
            runRequest("Organization users", () =>
              fetchJson<unknown>("/users/organization/users")
            ),
            runRequest("Roles", () => fetchJson<unknown>("/admin/roles/")),
            runRequest("Organization projects", () =>
              fetchJson<unknown>("/orgadmin/projects/projects")
            ),
            runRequest("Templates", () => fetchJson<unknown>("/admin/templates")),
          ])

        const orgs = normalizeList<Organization>(orgsPayload)
        if (orgs.length > 0) {
          nextData.organizations = orgs
        }

        nextData.users = normalizeList<User>(usersPayload)
        nextData.roles = normalizeList<Role>(rolesPayload)
        nextData.projects = normalizeList<Project>(projectsPayload)
        nextData.templates = normalizeList<Template>(templatesPayload, "templates")
      }

      if (mode === "stakeholder" || mode === "business") {
        const profilePayload = await runRequest("Profile", () =>
          fetchJson<ProfilePayload>("/profile/me")
        )

        if (profilePayload) {
          nextData.profile = profilePayload
          nextData.organizations = normalizeList<Organization>(profilePayload.organizations)
        }

        const assignedProjects = normalizeList<Project>(profilePayload?.projects)

        const projectDetails = await Promise.all(
          assignedProjects.map(async (assignedProject) => {
            const projectId = getProjectId(assignedProject)

            if (!projectId) {
              return assignedProject
            }

            const [detailPayload, permissionsPayload] = await Promise.all([
              runRequest(`Project ${projectId}`, () =>
                fetchJson<Project>(`/business-analyst/project/${projectId}`)
              ),
              runRequest(`Permissions for project ${projectId}`, () =>
                fetchJson<{ permissions?: string[] }>(
                  `/access/me/permissions?project_id=${projectId}`
                )
              ),
            ])

            const permissions = permissionsPayload?.permissions || []
            let requirementDocumentCount = 0
            let visionDocumentCount = 0
            let stakeholderCount = 0

            if (permissions.includes("requirements.view")) {
              const docsPayload = await runRequest(`Requirements for project ${projectId}`, () =>
                fetchJson<unknown>(
                  `/business-analyst/project/${projectId}/requirement-documents`
                )
              )
              requirementDocumentCount = normalizeList<unknown>(docsPayload, "documents").length
            }

            if (permissions.includes("vision_scope.view")) {
              const visionPayload = await runRequest(`Vision and scope for project ${projectId}`, () =>
                fetchJson<unknown>(
                  `/business-analyst/project/${projectId}/vision-scope/documents`
                )
              )
              visionDocumentCount = normalizeList<unknown>(visionPayload, "documents").length
            }

            if (permissions.includes("project_members.view")) {
              const stakeholdersPayload = await runRequest(`Members for project ${projectId}`, () =>
                fetchJson<StakeholderPayload>(
                  `/business-analyst/project/${projectId}/stakeholders`
                )
              )
              stakeholderCount = normalizeList<unknown>(
                stakeholdersPayload?.stakeholders
              ).length
            }

            return {
              ...assignedProject,
              ...(detailPayload || {}),
              id: detailPayload?.id || assignedProject.project_id || assignedProject.id,
              name: detailPayload?.name || assignedProject.project_name || assignedProject.name,
              roles: assignedProject.roles || detailPayload?.roles || [],
              permissions,
              requirement_document_count: requirementDocumentCount,
              vision_document_count: visionDocumentCount,
              stakeholder_count: stakeholderCount,
            }
          })
        )

        nextData.projects = projectDetails
      }

      if (!mounted) return

      setData(nextData)
      setErrors(nextErrors)
      setUpdatedAt(
        new Date().toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      )

      if (successfulRequests === 0) {
        setStatus("offline")
      } else if (successfulRequests < attemptedRequests) {
        setStatus("partial")
      } else {
        setStatus("live")
      }
    }

    loadDashboardData()

    return () => {
      mounted = false
    }
  }, [mode])

  const organization = useMemo(() => data.organizations[0], [data.organizations])
  const content = modeContent[mode]

  return (
    <div className="space-y-6 pb-4">
      <DashboardHero
        mode={mode}
        organization={organization}
        status={status}
        updatedAt={updatedAt}
        errorCount={errors.length}
      />

      {mode === "system" ? (
        <SystemDashboard data={data} />
      ) : mode === "organization" ? (
        <OrganizationDashboard data={data} organization={organization} />
      ) : (
        <StakeholderDashboard data={data} mode={mode} />
      )}

      <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Built for the current WRESS roles
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {mode === "system"
                  ? "This dashboard stays focused on organizations and users only."
                  : mode === "organization"
                    ? "This dashboard shows your organization, users, roles, projects, project managers, and templates."
                    : "This dashboard changes per project based on your assigned roles and permissions."}
              </p>
            </div>
          </div>
          <Link
            href={content.primaryHref}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Continue
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
