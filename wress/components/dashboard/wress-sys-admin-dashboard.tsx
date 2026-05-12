"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  LayoutDashboard,
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
  created_at?: string | null
}

type User = {
  id: number
  first_name: string
  last_name: string
  full_name?: string
  email: string
  user_type: "System Admin" | "Organization Admin" | "Stakeholder" | string
  is_active?: boolean
  organizations?: { id: number; name: string }[]
  created_at?: string | null
}

type LoadState = "loading" | "ready" | "offline"

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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "OR"
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
  icon: typeof Building2
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

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/40 p-6 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function WressSysAdminDashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadState, setLoadState] = useState<LoadState>("loading")

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setLoadState("loading")

      const [organizationData, userData] = await Promise.all([
        apiGet<Organization[]>("/admin/organizations"),
        apiGet<User[]>("/users"),
      ])

      if (!isMounted) return

      setOrganizations(Array.isArray(organizationData) ? organizationData : [])
      setUsers(Array.isArray(userData) ? userData : [])
      setLoadState(organizationData || userData ? "ready" : "offline")
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const stats = useMemo(() => {
    const activeUsers = users.filter((user) => user.is_active !== false).length
    const orgAdmins = users.filter((user) => user.user_type === "Organization Admin").length
    const stakeholderUsers = users.filter((user) => user.user_type === "Stakeholder").length

    return {
      activeUsers,
      orgAdmins,
      stakeholderUsers,
    }
  }, [users])

  const latestOrganizations = organizations.slice(0, 6)
  const latestUsers = users.slice(0, 7)

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.45fr_0.55fr] lg:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              System Admin
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              WRESS system overview
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              Manage organizations and user accounts across WRESS. This view only shows system-level work, so project roles and project permissions are not shown here.
            </p>
          </div>

          <div className="rounded-3xl bg-muted/60 p-5">
            <p className="text-sm font-medium text-foreground">Today&apos;s focus</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Keep organizations updated
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Check active and inactive users
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Add or update organization admins
              </div>
            </div>
          </div>
        </div>
      </section>

      {loadState === "offline" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <CircleAlert className="mt-0.5 h-4 w-4" />
          <p>
            The dashboard could not connect to the backend. Start the Flask server and refresh this page to see live system data.
          </p>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Organizations"
          value={organizations.length}
          note="Registered in WRESS"
        />
        <StatCard
          icon={UsersRound}
          label="Users"
          value={users.length}
          note={`${stats.activeUsers} active account${stats.activeUsers === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={ShieldCheck}
          label="Organization admins"
          value={stats.orgAdmins}
          note="Can manage one organization"
        />
        <StatCard
          icon={LayoutDashboard}
          label="Stakeholder users"
          value={stats.stakeholderUsers}
          note="Use project-based roles"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Latest organizations in the system</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/sys-admin/organization">Manage organizations</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {latestOrganizations.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestOrganizations.map((organization) => (
                    <TableRow key={organization.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xs font-semibold text-primary">
                            {organization.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={organization.logo}
                                alt={`${organization.name} logo`}
                                className="h-full w-full rounded-2xl object-cover"
                              />
                            ) : (
                              getInitials(organization.name)
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{organization.name}</p>
                            <p className="text-xs text-muted-foreground">ID {organization.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{organization.subscription_plan || "Basic"}</Badge>
                      </TableCell>
                      <TableCell>{organization.contact_email || "No email"}</TableCell>
                      <TableCell>{formatDate(organization.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title={loadState === "loading" ? "Loading organizations" : "No organizations yet"}
                message="Organizations added by the system admin will appear here."
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>System accounts and user types</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/sys-admin/users">Manage users</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {latestUsers.length ? (
              <div className="space-y-3">
                {latestUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border bg-background p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {user.full_name || `${user.first_name} ${user.last_name}`}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {user.organizations?.map((org) => org.name).join(", ") || "No organization"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={user.user_type === "System Admin" ? "default" : "secondary"}>
                        {user.user_type}
                      </Badge>
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
                message="Users added by the system admin will appear here."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
