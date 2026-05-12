"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BriefcaseBusiness,
  CheckCircle2,
  CircleAlert,
  FileText,
  FolderKanban,
  ShieldCheck,
  UsersRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api"

type Organization = {
  id: number
  name: string
  logo?: string | null
  contact_email?: string | null
  subscription_plan?: string | null
}

type User = {
  id: number
  first_name: string
  last_name: string
  full_name?: string
  email: string
  user_type: string
  is_active?: boolean
  roles?: { id: number; name: string }[]
}

type Project = {
  id: number
  name: string
  description?: string | null
  status?: string | null
  project_manager_id?: number | null
  project_manager_name?: string | null
  start_date?: string | null
  end_date?: string | null
  created_at?: string | null
}

type Role = {
  id: number
  name: string
  description?: string | null
  permissions?: { id: number; key: string; label: string }[]
}

type Template = {
  id: number
  name: string
  module: string
  description?: string | null
  is_active?: boolean
  is_default?: boolean
  sections?: unknown[]
}

type LoadState = "loading" | "ready" | "offline"

type TemplateResponse = { templates: Template[] }

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

async function apiGet<T>(path: string): Promise<T | null> {
  const token = getToken()

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (!response.ok) return null
    return (await response.json()) as T
  } catch (error) {
    console.error(`Failed to load ${path}`, error)
    return null
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "OR"
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function getProjectStatusLabel(status?: string | null) {
  if (!status) return "No status"
  if (status === "Pending") return "Not started"
  return status
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string
  value: string | number
  note: string
  icon: typeof UsersRound
}) {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function OrganizationLogo({ organization }: { organization?: Organization | null }) {
  const name = organization?.name || "Organization"

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-lg font-bold text-primary ring-1 ring-primary/15">
      {organization?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={organization.logo}
          alt={`${name} logo`}
          className="h-full w-full rounded-3xl object-cover"
        />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/40 p-6 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function WressOrgAdminDashboard() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadState, setLoadState] = useState<LoadState>("loading")

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setLoadState("loading")

      const [organizationsData, usersData, projectsData, rolesData, templatesData] = await Promise.all([
        apiGet<Organization[]>("/users/organization/organizations"),
        apiGet<User[]>("/users/organization/users"),
        apiGet<Project[]>("/orgadmin/projects/projects"),
        apiGet<Role[]>("/admin/roles/"),
        apiGet<TemplateResponse>("/admin/templates"),
      ])

      if (!isMounted) return

      const organizationList = Array.isArray(organizationsData) ? organizationsData : []
      setOrganization(organizationList[0] || null)
      setUsers(Array.isArray(usersData) ? usersData : [])
      setProjects(Array.isArray(projectsData) ? projectsData : [])
      setRoles(Array.isArray(rolesData) ? rolesData : [])
      setTemplates(Array.isArray(templatesData?.templates) ? templatesData.templates : [])
      setLoadState(organizationsData || usersData || projectsData || rolesData || templatesData ? "ready" : "offline")
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const dashboardData = useMemo(() => {
    const activeUsers = users.filter((user) => user.is_active !== false).length
    const projectsWithManager = projects.filter((project) => Boolean(project.project_manager_id)).length
    const defaultTemplates = templates.filter((template) => template.is_default).length
    const activeTemplates = templates.filter((template) => template.is_active !== false).length
    const managerCoverage = projects.length ? Math.round((projectsWithManager / projects.length) * 100) : 0

    return {
      activeUsers,
      projectsWithManager,
      defaultTemplates,
      activeTemplates,
      managerCoverage,
    }
  }, [projects, templates, users])

  const recentProjects = projects.slice(0, 6)
  const recentUsers = users.slice(0, 6)
  const recentTemplates = templates.slice(0, 5)

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.35fr_0.65fr] lg:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <OrganizationLogo organization={organization} />
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                Organization Admin
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {organization?.name || "Your organization"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Manage your organization users, roles, projects, project managers, and document templates in one place.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">{organization?.subscription_plan || "Plan not set"}</Badge>
                <Badge variant="outline">{organization?.contact_email || "No contact email"}</Badge>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-muted/60 p-5">
            <p className="text-sm font-medium text-foreground">Recommended checks</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Make sure every project has a project manager
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Keep users and roles updated
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Review active templates
              </div>
            </div>
          </div>
        </div>
      </section>

      {loadState === "offline" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <CircleAlert className="mt-0.5 h-4 w-4" />
          <p>
            The dashboard could not connect to the backend. Start the Flask server and refresh this page to see live organization data.
          </p>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UsersRound}
          label="Organization users"
          value={users.length}
          note={`${dashboardData.activeUsers} active account${dashboardData.activeUsers === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={FolderKanban}
          label="Projects"
          value={projects.length}
          note={`${dashboardData.projectsWithManager} with project manager`}
        />
        <StatCard
          icon={ShieldCheck}
          label="Roles"
          value={roles.length}
          note="Used when assigning project work"
        />
        <StatCard
          icon={FileText}
          label="Templates"
          value={templates.length}
          note={`${dashboardData.activeTemplates} active, ${dashboardData.defaultTemplates} default`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Create projects and assign a project manager</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/org-admin/projects">Manage projects</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Project manager assignment</p>
                  <p className="text-xs text-muted-foreground">Projects with assigned project managers</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{dashboardData.managerCoverage}%</p>
              </div>
              <Progress value={dashboardData.managerCoverage} className="mt-4" />
            </div>

            {recentProjects.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Project manager</TableHead>
                    <TableHead>End date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{project.name}</p>
                          <p className="max-w-xs truncate text-xs text-muted-foreground">
                            {project.description || "No description"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getProjectStatusLabel(project.status)}</Badge>
                      </TableCell>
                      <TableCell>{project.project_manager_name || "Not assigned"}</TableCell>
                      <TableCell>{formatDate(project.end_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title={loadState === "loading" ? "Loading projects" : "No projects yet"}
                message="Projects created by the organization admin will appear here."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>People inside this organization</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/org-admin/users">Manage users</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentUsers.length ? (
                <div className="space-y-3">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-background p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {user.full_name || `${user.first_name} ${user.last_name}`}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="secondary">{user.user_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {user.is_active === false ? "Inactive" : "Active"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={loadState === "loading" ? "Loading users" : "No users yet"}
                  message="Users created for this organization will appear here."
                />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Templates</CardTitle>
                <CardDescription>Document templates used by projects</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/org-admin/templates">Manage templates</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentTemplates.length ? (
                <div className="space-y-3">
                  {recentTemplates.map((template) => (
                    <div key={template.id} className="rounded-2xl border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{template.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {template.module === "vision_scope" ? "Vision and Scope" : "Requirements"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {template.is_default && <Badge>Default</Badge>}
                          <Badge variant={template.is_active === false ? "outline" : "secondary"}>
                            {template.is_active === false ? "Inactive" : "Active"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={loadState === "loading" ? "Loading templates" : "No templates yet"}
                  message="Templates created for this organization will appear here."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
