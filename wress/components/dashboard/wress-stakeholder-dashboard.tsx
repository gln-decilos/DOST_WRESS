"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Lightbulb,
  MessageSquareText,
  ShieldCheck,
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api"

type Organization = {
  id: number
  name: string
  logo?: string | null
  contact_email?: string | null
  subscription_plan?: string | null
}

type ProfileProject = {
  project_id: number
  project_name: string
  status?: string | null
  roles?: { role_id: number; role_name: string }[]
}

type Project = {
  id: number
  name: string
  description?: string | null
  status?: string | null
  organization_id?: number
  organization_name?: string | null
  start_date?: string | null
  end_date?: string | null
}

type ProfileResponse = {
  user?: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  organizations?: Organization[]
  projects?: ProfileProject[]
}

type PermissionResponse = {
  project_id?: number
  permissions?: string[]
}

type RequirementDocument = {
  id: number
  project_id?: number
  name?: string
  version?: string
  status?: string
  requirement_count?: number
  created_at?: string | null
  updated_at?: string | null
}

type VisionDocument = {
  id: number
  project_id?: number
  version?: string
  status?: string
  created_at?: string | null
  updated_at?: string | null
}

type ProjectDashboard = {
  project: Project
  roles: string[]
  permissions: string[]
  requirementDocuments: RequirementDocument[]
  visionDocuments: VisionDocument[]
}

type DashboardDocument = {
  id: number
  type: "Requirements" | "Vision and Scope"
  title: string
  version?: string
  status?: string
  requirement_count?: number
  created_at?: string | null
  updated_at?: string | null
}

type InsightItem = {
  title: string
  message: string
  priority: "High" | "Medium" | "Good"
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

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "OR"
  )
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

function normalizeStatus(value?: string | null) {
  return normalizeText(value)
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

function getDaysSince(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  const difference = today.getTime() - date.getTime()

  return Math.max(0, Math.floor(difference / (1000 * 60 * 60 * 24)))
}

function getDaysUntil(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  const difference = date.getTime() - today.getTime()

  return Math.ceil(difference / (1000 * 60 * 60 * 24))
}

function getDocumentStatusLabel(status?: string | null) {
  if (!status) return "No status"
  if (status === "For Approval") return "For review"
  if (status === "Frozen") return "Frozen"
  if (status === "Unfrozen") return "Unfrozen"
  return status
}

function hasPermission(project: ProjectDashboard | undefined, key: string) {
  return Boolean(project?.permissions.includes(key))
}

function hasAnyPermission(project: ProjectDashboard | undefined, keys: string[]) {
  return keys.some((key) => hasPermission(project, key))
}

function hasProjectTeamRole(roles: string[]) {
  const normalizedRoles = roles.map(normalizeText)

  return normalizedRoles.some((role) =>
    ["project manager", "business analyst"].includes(role),
  )
}

function canSeeProjectTeamView(project: ProjectDashboard | undefined) {
  if (!project) return false

  return (
    hasProjectTeamRole(project.roles) ||
    hasAnyPermission(project, [
      "project_members.manage",
      "requirements.create",
      "requirements.edit",
      "requirements.submit_approval",
      "requirements.freeze",
      "vision_scope.create",
      "vision_scope.edit",
    ])
  )
}

function canReviewRequirements(project: ProjectDashboard | undefined) {
  return hasAnyPermission(project, ["requirements.approve", "requirements.reject"])
}

function canSeeDocuments(project: ProjectDashboard | undefined) {
  if (!project) return false

  return (
    canSeeProjectTeamView(project) ||
    hasAnyPermission(project, [
      "project.view",
      "requirements.view",
      "requirements.approve",
      "requirements.reject",
    ])
  )
}

function getReadableActions(project: ProjectDashboard | undefined) {
  if (!project) return ["View only"]

  const permissions = project.permissions
  const actions: string[] = []

  if (permissions.includes("project_members.manage")) {
    actions.push("Manage project members")
  }

  if (
    permissions.includes("requirements.create") ||
    permissions.includes("requirements.edit")
  ) {
    actions.push("Work on requirements")
  }

  if (
    permissions.includes("requirements.approve") ||
    permissions.includes("requirements.reject")
  ) {
    actions.push("Review requirements")
  }

  if (permissions.includes("requirements.submit_approval")) {
    actions.push("Send for review")
  }

  if (permissions.includes("requirements.freeze")) {
    actions.push("Lock approved requirements")
  }

  if (
    permissions.includes("vision_scope.create") ||
    permissions.includes("vision_scope.edit")
  ) {
    actions.push("Work on Vision and Scope")
  }

  if (!actions.length && permissions.includes("project.view")) {
    actions.push("View project")
  }

  return actions.length ? actions : ["View only"]
}

function getAllDocuments(project: ProjectDashboard | undefined) {
  if (!project) return []

  const documents: DashboardDocument[] = [
    ...project.requirementDocuments.map((document) => ({
      ...document,
      type: "Requirements" as const,
      title:
        document.name ||
        `Requirements Document ${document.version || ""}`.trim(),
    })),
    ...project.visionDocuments.map((document) => ({
      ...document,
      type: "Vision and Scope" as const,
      title: `Vision and Scope ${document.version || ""}`.trim(),
      requirement_count: undefined,
    })),
  ]

  return documents
}

function getVisibleDocuments(project: ProjectDashboard | undefined) {
  const documents = getAllDocuments(project)

  if (!project) return []

  const teamView = canSeeProjectTeamView(project)
  const reviewView = canReviewRequirements(project)

  if (teamView) return documents

  if (reviewView) {
    return documents.filter((document) =>
      ["for approval", "approved", "rejected", "frozen", "unfrozen"].includes(
        normalizeStatus(document.status),
      ),
    )
  }

  if (canSeeDocuments(project)) {
    return documents.filter((document) =>
      ["approved", "frozen", "unfrozen"].includes(
        normalizeStatus(document.status),
      ),
    )
  }

  return []
}

function getLatestDocumentDate(documents: DashboardDocument[]) {
  const dates = documents
    .map((document) => document.updated_at || document.created_at)
    .filter(Boolean)
    .sort((a, b) => new Date(b || "").getTime() - new Date(a || "").getTime())

  return dates[0] || null
}

function countByStatus(documents: DashboardDocument[], status: string) {
  return documents.filter((document) => normalizeStatus(document.status) === status)
    .length
}

function countApprovedLike(documents: DashboardDocument[]) {
  return documents.filter((document) =>
    ["approved", "frozen", "unfrozen"].includes(normalizeStatus(document.status)),
  ).length
}

function getProjectSignal({
  hasDocuments,
  reviewCount,
  draftCount,
  rejectedCount,
  staleDays,
  daysUntilEnd,
}: {
  hasDocuments: boolean
  reviewCount: number
  draftCount: number
  rejectedCount: number
  staleDays: number | null
  daysUntilEnd: number | null
}) {
  if (!hasDocuments) return "Needs setup"

  if (daysUntilEnd !== null && daysUntilEnd < 0 && reviewCount + draftCount > 0) {
    return "Needs attention"
  }

  if (reviewCount > 0) return "Needs review"
  if (rejectedCount > 0) return "Needs revision"
  if (draftCount > 0) return "In progress"
  if (staleDays !== null && staleDays >= 14) return "Needs update"

  return "On track"
}

function buildHelpfulInsights({
  project,
  showProjectTeamView,
  showReviewView,
  visibleDocuments,
  allDocuments,
  requirementCount,
}: {
  project: ProjectDashboard | undefined
  showProjectTeamView: boolean
  showReviewView: boolean
  visibleDocuments: DashboardDocument[]
  allDocuments: DashboardDocument[]
  requirementCount: number
}) {
  if (!project) return []

  const insights: InsightItem[] = []
  const reviewCount = countByStatus(visibleDocuments, "for approval")
  const draftCount = showProjectTeamView
    ? countByStatus(allDocuments, "draft")
    : 0
  const rejectedCount = countByStatus(visibleDocuments, "rejected")
  const frozenCount = countByStatus(visibleDocuments, "frozen")
  const approvedCount = countApprovedLike(visibleDocuments)
  const latestDate = getLatestDocumentDate(visibleDocuments)
  const staleDays = getDaysSince(latestDate)
  const daysUntilEnd = getDaysUntil(project.project.end_date)
  const hasRequirementDocument = allDocuments.some(
    (document) => document.type === "Requirements",
  )
  const hasVisionDocument = allDocuments.some(
    (document) => document.type === "Vision and Scope",
  )

  if (showProjectTeamView) {
    if (!allDocuments.length) {
      insights.push({
        priority: "High",
        title: "Start the project documents",
        message:
          "No Requirements or Vision and Scope document was found. Create the first documents so the team has a clear project basis.",
      })
    }

    if (!hasVisionDocument) {
      insights.push({
        priority: "High",
        title: "Add Vision and Scope",
        message:
          "The project needs a Vision and Scope document so the team and stakeholders share the same understanding of the project.",
      })
    }

    if (!hasRequirementDocument) {
      insights.push({
        priority: "High",
        title: "Add Requirements document",
        message:
          "No Requirements document is available yet. Add one so requirements can be reviewed, approved, and tracked.",
      })
    }

    if (reviewCount > 0) {
      insights.push({
        priority: "High",
        title: "Review queue needs attention",
        message: `${reviewCount} document${reviewCount > 1 ? "s are" : " is"} waiting for review.`,
      })
    }

    if (rejectedCount > 0) {
      insights.push({
        priority: "High",
        title: "Rejected document needs revision",
        message: `${rejectedCount} document${rejectedCount > 1 ? "s have" : " has"} been rejected.`,
      })
    }

    if (draftCount > 0) {
      insights.push({
        priority: "Medium",
        title: "Draft work should move forward",
        message: `${draftCount} draft document${draftCount > 1 ? "s are" : " is"} still in progress.`,
      })
    }

    if (requirementCount > 0 && !reviewCount && !draftCount) {
      insights.push({
        priority: "Good",
        title: "Requirements are organized",
        message: `${requirementCount} requirement item${requirementCount > 1 ? "s are" : " is"} recorded in this project.`,
      })
    }

    if (frozenCount > 0) {
      insights.push({
        priority: "Good",
        title: "Frozen baseline is available",
        message: `${frozenCount} frozen document${frozenCount > 1 ? "s are" : " is"} available.`,
      })
    }

    if (staleDays !== null && staleDays >= 14) {
      insights.push({
        priority: "Medium",
        title: "Documents may need an update",
        message: `The latest visible document update was ${staleDays} days ago.`,
      })
    }

    if (daysUntilEnd !== null && daysUntilEnd < 0 && (reviewCount > 0 || draftCount > 0)) {
      insights.push({
        priority: "High",
        title: "Project date has passed with pending work",
        message:
          "The project end date has passed, but there are still pending documents.",
      })
    } else if (daysUntilEnd !== null && daysUntilEnd <= 7 && daysUntilEnd >= 0) {
      insights.push({
        priority: "Medium",
        title: "Project end date is near",
        message: `The project end date is in ${daysUntilEnd} day${daysUntilEnd === 1 ? "" : "s"}.`,
      })
    }

    if (!insights.length) {
      insights.push({
        priority: "Good",
        title: "Project looks stable",
        message:
          "No urgent document issue was found. Continue monitoring new drafts, review requests, and stakeholder decisions.",
      })
    }

    return insights.slice(0, 6)
  }

  if (showReviewView && reviewCount > 0) {
    insights.push({
      priority: "High",
      title: "Your decision is needed",
      message: `${reviewCount} document${reviewCount > 1 ? "s are" : " is"} waiting for your review.`,
    })
  }

  if (rejectedCount > 0) {
    insights.push({
      priority: "Medium",
      title: "Rejected item is visible",
      message:
        "A rejected document is visible in this project. The project team should handle the revision.",
    })
  }

  if (approvedCount > 0) {
    insights.push({
      priority: "Good",
      title: "Approved project information is available",
      message: `${approvedCount} approved or frozen document${approvedCount > 1 ? "s are" : " is"} available.`,
    })
  }

  if (!visibleDocuments.length) {
    insights.push({
      priority: "Medium",
      title: "No shared document yet",
      message: "There are no documents available for your role in this project.",
    })
  }

  if (staleDays !== null && staleDays >= 14) {
    insights.push({
      priority: "Medium",
      title: "Ask for a project update",
      message: `The latest visible document update was ${staleDays} days ago.`,
    })
  }

  if (daysUntilEnd !== null && daysUntilEnd <= 7 && daysUntilEnd >= 0) {
    insights.push({
      priority: "Medium",
      title: "Project end date is near",
      message: `The project end date is in ${daysUntilEnd} day${daysUntilEnd === 1 ? "" : "s"}.`,
    })
  }

  if (!insights.length) {
    insights.push({
      priority: "Good",
      title: "No action needed right now",
      message:
        "There is no document waiting for your decision. Check again when the project team shares updates.",
    })
  }

  return insights.slice(0, 5)
}

function OrganizationLogo({
  organization,
}: {
  organization?: Organization | null
}) {
  const name = organization?.name || "Organization"

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-sm font-bold text-brand ring-1 ring-brand/15">
      {organization?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={organization.logo}
          alt={`${name} logo`}
          className="h-full w-full rounded-xl object-cover"
        />
      ) : (
        getInitials(name)
      )}
    </div>
  )
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
  icon: LucideIcon
}) {
  return (
    <Card className="h-full min-h-[118px] border-border/70 bg-card/95 shadow-sm transition hover:border-brand/40">
      <CardContent className="flex h-full items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-col">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-auto pt-2 text-xs leading-4 text-muted-foreground">
            {note}
          </p>
        </div>

        <div className="shrink-0 rounded-xl bg-brand/10 p-2 text-brand">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )
}

function InsightCard({ insight }: { insight: InsightItem }) {
  const Icon =
    insight.priority === "High"
      ? AlertTriangle
      : insight.priority === "Good"
        ? CheckCircle2
        : Lightbulb

  return (
    <div className="flex h-full min-h-[118px] rounded-xl border bg-background p-3 transition hover:border-brand/40">
      <div className="flex w-full items-start gap-2">
        <div className="shrink-0 rounded-lg bg-brand/10 p-1.5 text-brand">
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-medium text-foreground">{insight.title}</p>
            <Badge variant={insight.priority === "High" ? "destructive" : "secondary"}>
              {insight.priority}
            </Badge>
          </div>

          <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
            {insight.message}
          </p>
        </div>
      </div>
    </div>
  )
}

function WorkflowBar({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const percentage = total ? Math.round((value / total) * 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function RequirementsWorkflowChart({
  draftCount,
  reviewCount,
  approvedCount,
  rejectedCount,
  totalDocuments,
  donePercent,
}: {
  draftCount: number
  reviewCount: number
  approvedCount: number
  rejectedCount: number
  totalDocuments: number
  donePercent: number
}) {
  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Requirements workflow</CardTitle>
            <CardDescription>
              Status overview for visible requirements and project documents
            </CardDescription>
          </div>

          <div className="rounded-xl bg-brand/10 p-2 text-brand">
            <BarChart3 className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-4">
        <div className="rounded-xl border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Completion readiness
              </p>
              <p className="text-xs text-muted-foreground">
                Approved or frozen documents compared with visible documents
              </p>
            </div>

            <p className="text-2xl font-bold text-brand">{donePercent}%</p>
          </div>

          <Progress value={donePercent} className="mt-3" />
        </div>

        <div className="space-y-3 rounded-xl border bg-background p-3">
          <WorkflowBar label="Draft" value={draftCount} total={totalDocuments} />
          <WorkflowBar label="For review" value={reviewCount} total={totalDocuments} />
          <WorkflowBar
            label="Approved or frozen"
            value={approvedCount}
            total={totalDocuments}
          />
          <WorkflowBar label="Rejected" value={rejectedCount} total={totalDocuments} />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/40 p-4 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  )
}

async function buildProjectDashboard(
  project: Project,
  profileProject?: ProfileProject,
): Promise<ProjectDashboard> {
  const permissionData = await apiGet<PermissionResponse>(
    `/access/me/permissions?project_id=${project.id}`,
  )

  const roles =
    profileProject?.roles?.map((role) => role.role_name).filter(Boolean) || []
  const permissions = Array.isArray(permissionData?.permissions)
    ? permissionData.permissions
    : []

  const baseProject: ProjectDashboard = {
    project,
    roles,
    permissions,
    requirementDocuments: [],
    visionDocuments: [],
  }

  const shouldLoadDocuments =
    canSeeProjectTeamView(baseProject) ||
    permissions.some((permission) =>
      [
        "project.view",
        "requirements.view",
        "requirements.approve",
        "requirements.reject",
      ].includes(permission),
    )

  if (!shouldLoadDocuments) return baseProject

  const [requirementsData, visionData] = await Promise.all([
    apiGet<{ documents: RequirementDocument[] }>(
      `/business-analyst/project/${project.id}/requirement-documents`,
    ),
    apiGet<{ documents: VisionDocument[] }>(
      `/business-analyst/project/${project.id}/vision-scope/documents`,
    ),
  ])

  return {
    ...baseProject,
    requirementDocuments: Array.isArray(requirementsData?.documents)
      ? requirementsData.documents
      : [],
    visionDocuments: Array.isArray(visionData?.documents)
      ? visionData.documents
      : [],
  }
}

export function WressStakeholderDashboard() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [projectDashboards, setProjectDashboards] = useState<ProjectDashboard[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [loadState, setLoadState] = useState<LoadState>("loading")

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setLoadState("loading")

      const [profileData, projectsData] = await Promise.all([
        apiGet<ProfileResponse>("/profile/me"),
        apiGet<Project[]>("/business-analyst/projects"),
      ])

      if (!isMounted) return

      const projects = Array.isArray(projectsData) ? projectsData : []
      const profileProjects = Array.isArray(profileData?.projects)
        ? profileData.projects
        : []
      const profileMap = new Map(
        profileProjects.map((project) => [project.project_id, project]),
      )
      const assignedProjectIds = new Set(
        profileProjects.map((project) => project.project_id),
      )

      const visibleProjects = assignedProjectIds.size
        ? projects.filter((project) => assignedProjectIds.has(project.id))
        : projects

      const dashboards = await Promise.all(
        visibleProjects.map((project) =>
          buildProjectDashboard(project, profileMap.get(project.id)),
        ),
      )

      if (!isMounted) return

      setOrganization(profileData?.organizations?.[0] || null)
      setProjectDashboards(dashboards)
      setSelectedProjectId((current) =>
        dashboards.some((item) => item.project.id === current)
          ? current
          : dashboards[0]?.project.id || null,
      )
      setLoadState(profileData || projectsData ? "ready" : "offline")
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const selectedProject = useMemo(() => {
    return (
      projectDashboards.find((item) => item.project.id === selectedProjectId) ||
      projectDashboards[0]
    )
  }, [projectDashboards, selectedProjectId])

  const allSelectedDocuments = useMemo(
    () => getAllDocuments(selectedProject),
    [selectedProject],
  )

  const selectedDocuments = useMemo(() => {
    return getVisibleDocuments(selectedProject).sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime()
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime()
      return bTime - aTime
    })
  }, [selectedProject])

  const visibleDocumentsAcrossProjects = useMemo(() => {
    return projectDashboards.flatMap((project) => getVisibleDocuments(project))
  }, [projectDashboards])

  const showProjectTeamView = canSeeProjectTeamView(selectedProject)
  const showReviewView = canReviewRequirements(selectedProject)
  const selectedActions = getReadableActions(selectedProject)

  const analytics = useMemo(() => {
    const latestDate = getLatestDocumentDate(selectedDocuments)
    const staleDays = getDaysSince(latestDate)
    const daysUntilEnd = getDaysUntil(selectedProject?.project.end_date)

    const requirementCount = showProjectTeamView
      ? selectedProject?.requirementDocuments.reduce(
          (total, document) => total + (document.requirement_count || 0),
          0,
        ) || 0
      : 0

    const reviewCount = countByStatus(selectedDocuments, "for approval")
    const approvedCount = countApprovedLike(selectedDocuments)
    const rejectedCount = countByStatus(selectedDocuments, "rejected")
    const draftCount = showProjectTeamView
      ? countByStatus(allSelectedDocuments, "draft")
      : 0
    const frozenCount = countByStatus(selectedDocuments, "frozen")

    const donePercent = selectedDocuments.length
      ? Math.round((approvedCount / selectedDocuments.length) * 100)
      : 0

    const projectSignal = getProjectSignal({
      hasDocuments: selectedDocuments.length > 0,
      reviewCount,
      draftCount,
      rejectedCount,
      staleDays,
      daysUntilEnd,
    })

    return {
      requirementCount,
      reviewCount,
      approvedCount,
      rejectedCount,
      draftCount,
      frozenCount,
      donePercent,
      latestDate,
      staleDays,
      daysUntilEnd,
      projectSignal,
    }
  }, [allSelectedDocuments, selectedDocuments, selectedProject, showProjectTeamView])

  const helpfulInsights = useMemo(() => {
    return buildHelpfulInsights({
      project: selectedProject,
      showProjectTeamView,
      showReviewView,
      visibleDocuments: selectedDocuments,
      allDocuments: allSelectedDocuments,
      requirementCount: analytics.requirementCount,
    })
  }, [
    selectedProject,
    showProjectTeamView,
    showReviewView,
    selectedDocuments,
    allSelectedDocuments,
    analytics.requirementCount,
  ])

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-2xl border border-brand/10 bg-card shadow-sm">
        <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <OrganizationLogo organization={organization} />

            <div className="min-w-0">
              <div className="mb-1.5 inline-flex items-center gap-2 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
                <ShieldCheck className="h-3.5 w-3.5" />
                Stakeholder Dashboard
              </div>

              <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-2xl">
                {organization?.name || "Your organization"}
              </h1>

              <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
                Select a project to view requirements insights, document progress, and
                review status.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/50 p-2.5">
            <label className="text-xs font-medium text-foreground" htmlFor="project-select">
              Select project
            </label>

            <select
              id="project-select"
              value={selectedProjectId ?? ""}
              onChange={(event) => {
                const value = event.target.value
                setSelectedProjectId(value ? Number(value) : null)
              }}
              disabled={!projectDashboards.length}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {projectDashboards.length ? (
                projectDashboards.map((projectItem) => (
                  <option key={projectItem.project.id} value={projectItem.project.id}>
                    {projectItem.project.name}
                  </option>
                ))
              ) : (
                <option value="">No project assigned</option>
              )}
            </select>

            <div className="mt-1.5 flex flex-wrap gap-1">
              {(selectedProject?.roles.length ? selectedProject.roles : ["No role yet"]).map(
                (role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {loadState === "offline" && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <CircleAlert className="mt-0.5 h-4 w-4" />
          <p>
            The dashboard could not connect to the backend. Start the Flask server and
            refresh this page to see live project data.
          </p>
        </div>
      )}

      <section className="grid auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FolderKanban}
          label="Assigned projects"
          value={projectDashboards.length}
          note={
            showProjectTeamView
              ? "Projects where you have a role"
              : "Projects shared with you"
          }
        />

        <StatCard
          icon={FileText}
          label="Accessible documents"
          value={visibleDocumentsAcrossProjects.length}
          note="Documents available to your role"
        />

        <StatCard
          icon={ClipboardCheck}
          label={showProjectTeamView ? "Requirements" : "Visible documents"}
          value={showProjectTeamView ? analytics.requirementCount : selectedDocuments.length}
          note={
            showProjectTeamView
              ? "Requirement items in this project"
              : "Documents available to your role"
          }
        />

        <StatCard
          icon={MessageSquareText}
          label={showProjectTeamView ? "Needs review" : "Waiting for you"}
          value={analytics.reviewCount}
          note={
            showProjectTeamView
              ? "Documents waiting for decisions"
              : "Documents that need your review"
          }
        />
      </section>

      <section className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,500px)]">
        <Card className="h-full shadow-sm">
          <CardHeader className="px-4 pb-2 pt-4">
            <CardTitle>
              {showProjectTeamView ? "Project team insights" : "Stakeholder insights"}
            </CardTitle>
            <CardDescription>
              {showProjectTeamView
                ? "Helpful signals for managing the selected project"
                : "Helpful information based on your project access"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 px-4 pb-4">
            {selectedProject ? (
              <>
                <div className="grid auto-rows-fr gap-2 sm:grid-cols-3">
                  <div className="flex min-h-[88px] flex-col rounded-xl border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Project signal</p>
                    <p className="mt-auto text-base font-semibold text-brand">
                      {analytics.projectSignal}
                    </p>
                  </div>

                  <div className="flex min-h-[88px] flex-col rounded-xl border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Latest update</p>
                    <p className="mt-auto text-base font-semibold text-foreground">
                      {analytics.latestDate
                        ? formatDate(analytics.latestDate)
                        : "No update"}
                    </p>
                  </div>

                  <div className="flex min-h-[88px] flex-col rounded-xl border bg-background p-3">
                    <p className="text-xs text-muted-foreground">End date</p>
                    <p className="mt-auto text-base font-semibold text-foreground">
                      {formatDate(selectedProject.project.end_date)}
                    </p>
                  </div>
                </div>

                <div className="grid auto-rows-fr gap-2 md:grid-cols-2">
                  {helpfulInsights.map((insight) => (
                    <InsightCard key={`${insight.priority}-${insight.title}`} insight={insight} />
                  ))}
                </div>

                <div className="rounded-xl border bg-background p-3">
                  <p className="text-sm font-medium text-foreground">Available actions</p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedActions.map((action) => (
                      <Badge key={action} variant="secondary">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild variant="outline" className="h-9 justify-start">
                    <Link href="/stakeholder/projects/projects-page">Open projects</Link>
                  </Button>

                  {canSeeDocuments(selectedProject) ? (
                    <Button asChild className="h-9 justify-start bg-brand hover:bg-brand/90">
                      <Link href="/stakeholder/projects/requirements-document">
                        Open documents
                      </Link>
                    </Button>
                  ) : (
                    <Button className="h-9 justify-start" disabled>
                      Open documents
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <EmptyState
                title={loadState === "loading" ? "Loading project insights" : "No assigned project"}
                message="Project insights will appear after you are assigned to a project."
              />
            )}
          </CardContent>
        </Card>

        <RequirementsWorkflowChart
          draftCount={analytics.draftCount}
          reviewCount={analytics.reviewCount}
          approvedCount={analytics.approvedCount}
          rejectedCount={analytics.rejectedCount}
          totalDocuments={Math.max(selectedDocuments.length, allSelectedDocuments.length)}
          donePercent={analytics.donePercent}
        />
      </section>

      <Card className="shadow-sm">
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle>Project documents</CardTitle>
          <CardDescription>
            {showProjectTeamView
              ? "Documents available to the project team"
              : "Documents available to your role"}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          {selectedDocuments.length ? (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-2">Document</TableHead>
                    <TableHead className="px-3 py-2">Type</TableHead>
                    <TableHead className="px-3 py-2">Status</TableHead>
                    {showProjectTeamView && (
                      <TableHead className="px-3 py-2">Requirements</TableHead>
                    )}
                    <TableHead className="px-3 py-2">Updated</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {selectedDocuments.map((document) => (
                    <TableRow key={`${document.type}-${document.id}`}>
                      <TableCell className="px-3 py-2">
                        <p className="font-medium text-foreground">{document.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Version {document.version || "1.0"}
                        </p>
                      </TableCell>

                      <TableCell className="px-3 py-2">{document.type}</TableCell>

                      <TableCell className="px-3 py-2">
                        <Badge variant="secondary">
                          {getDocumentStatusLabel(document.status)}
                        </Badge>
                      </TableCell>

                      {showProjectTeamView && (
                        <TableCell className="px-3 py-2">
                          {document.requirement_count ?? "-"}
                        </TableCell>
                      )}

                      <TableCell className="px-3 py-2">
                        {formatDate(document.updated_at || document.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title={selectedProject ? "No visible documents" : "No project selected"}
              message={
                selectedProject
                  ? "There are no documents available for your role in this project."
                  : "Select a project to see documents available to you."
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}