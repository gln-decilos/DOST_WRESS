"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CheckCircle,
  ChevronLeft,
  ClipboardList,
  Eye,
  FileCheck,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Snowflake,
  Trash2,
  Unlock,
  Upload,
  XCircle,
} from "lucide-react"
import DynamicTemplateForm from "@/components/vision-scope/dynamic-form-template"

type TemplateField = {
  id: number
  section_id: number
  key: string
  label: string
  field_type: string
  placeholder?: string | null
  help_text?: string | null
  default_value?: string | null
  options_json?: string | null
  is_required: boolean
  sort_order: number
}

type TemplateSection = {
  id: number
  template_id: number
  title: string
  description?: string | null
  sort_order: number
  is_collapsible: boolean
  fields: TemplateField[]
}

type DocumentTemplate = {
  id: number
  name: string
  code: string
  module: string
  description?: string | null
  is_active: boolean
  is_default: boolean
  organization_id?: number | null
  sections: TemplateSection[]
}

type RequirementDocumentSummary = {
  id: number
  project_id: number
  template_id?: number | null
  version: string
  name: string
  description: string
  status: string
  created_by?: number | null
  created_at: string
  updated_at: string
  requirement_count: number
}

type RequirementItemSummary = {
  id: number
  project_document_id: number
  requirement_code: string
  title: string
  description?: string | null
  rationale?: string | null
  priority: string
  status: string
  sort_order: number
  created_by?: number | null
  comment_count?: number
  change_log_count?: number
  approval_summary?: RequirementApprovalSummary | null
  created_at: string
  updated_at: string
}

type RequirementDocumentDetailsResponse = {
  document_summary: RequirementDocumentSummary
  document: {
    id: number
    project_id: number
    template_id: number
    version: string
    status: string
    created_by?: number | null
    created_at: string
    updated_at: string
    requirement_items?: RequirementItemSummary[]
  }
  template: DocumentTemplate | null
  latest_default_template: DocumentTemplate | null
  has_template_update: boolean
  is_template_inactive?: boolean
  requirements: RequirementItemSummary[]
}

type RequirementItemDetailsResponse = {
  item: {
    id: number
    project_document_id: number
    sort_order: number
    created_by?: number | null
    created_at: string
    updated_at: string
    values?: Array<{
      id: number
      item_id: number
      template_field_id: number
      value_text: string
    }>
  }
  summary: RequirementItemSummary
  template: DocumentTemplate | null
}

type RequirementApprovalSummary = {
  item_id: number
  document_id: number
  status: string
  submitted: boolean
  approved: boolean
  rejected: boolean
  total_required: number
  approved_count: number
  rejected_count: number
  pending_count: number
  is_fully_approved: boolean
  has_rejection_votes?: boolean
  is_decision_complete?: boolean
  current_user_is_required_approver: boolean
  current_user_has_approved: boolean
  current_user_has_rejected: boolean
  current_user_can_approve: boolean
  current_user_can_reject: boolean
  note: string
  approvers: Array<{
    user_id: number
    full_name: string
    email: string
    status: string
    review_requested_at?: string | null
    review_due_at?: string | null
    approved_at?: string | null
    rejected_at?: string | null
    auto_approved_at?: string | null
    rejection_reason?: string | null
  }>
}

type ApprovalSummary = {
  document_id: number
  version: string
  status: string
  submitted: boolean
  approved: boolean
  rejected: boolean
  frozen: boolean
  total_required: number
  approved_count: number
  rejected_count: number
  pending_count: number
  is_fully_approved: boolean
  has_rejection_votes?: boolean
  current_user_is_submitter: boolean
  current_user_is_required_approver: boolean
  current_user_has_approved: boolean
  current_user_has_rejected: boolean
  current_user_can_approve: boolean
  current_user_can_reject: boolean
  note: string
  requirements?: RequirementApprovalSummary[]
  approvers: Array<{
    user_id: number
    full_name: string
    email: string
    status: string
    review_requested_at?: string | null
    review_due_at?: string | null
    approved_at?: string | null
    rejected_at?: string | null
    auto_approved_at?: string | null
    rejection_reason?: string | null
  }>
}

type RequirementComment = {
  id: number
  project_id: number
  document_id: number
  item_id: number
  user_id: number
  comment_text: string
  can_delete?: boolean
  user?: {
    id: number
    first_name: string
    last_name: string
    full_name: string
    email: string
  } | null
  created_at?: string | null
  updated_at?: string | null
}

type ChangeRequestReviewDecision = {
  user_id: number
  full_name: string
  email: string
  status: "Pending" | "Proceed" | "Declined" | string
  decided_at?: string | null
  note?: string | null
}

type ChangeRequestReviewSummary = {
  total_required: number
  proceed_count: number
  declined_count: number
  pending_count: number
  is_decision_complete: boolean
  final_status?: "Proceed" | "Declined" | string | null
  current_user_status?: "Pending" | "Proceed" | "Declined" | string | null
  current_user_can_decide?: boolean
}

type RequirementChangeRequest = {
  id: number
  project_id: number
  document_id: number
  item_id: number
  status:
    | "Draft"
    | "Submitted"
    | "Impact Analysis Requested"
    | "Stakeholder Review"
    | "Proceed"
    | "Declined"
    | string
  requested_by_name: string
  requested_date?: string | null
  change_type: string
  priority: string
  intended_change: string
  reason?: string | null
  remarks?: string | null
  stakeholder_form_filename?: string | null
  stakeholder_form_path?: string | null
  stakeholder_form_mime_type?: string | null
  stakeholder_form_size?: number | null
  created_by?: number | null
  submitted_by?: number | null
  submitted_at?: string | null
  impact_analysis_filename?: string | null
  impact_analysis_path?: string | null
  impact_analysis_mime_type?: string | null
  impact_analysis_size?: number | null
  impact_analysis_uploaded_by?: number | null
  impact_analysis_uploaded_at?: string | null
  impact_analysis_notes?: string | null
  review_days?: number | null
  review_due_at?: string | null
  review_decisions?: ChangeRequestReviewDecision[]
  review_summary?: ChangeRequestReviewSummary | null
  decided_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  can_delete?: boolean
  can_view_file?: boolean
  can_review_change_request?: boolean
  can_upload_impact_analysis?: boolean
  can_decide?: boolean
  is_active?: boolean
  requirement?: RequirementItemSummary | null
  current_requirement_snapshot?: Partial<RequirementItemSummary> | null
}

type RequirementChangeLog = {
  id: number
  project_id: number
  document_id: number
  item_id: number
  action: string
  description?: string | null
  before_snapshot?: any
  after_snapshot?: any
  changed_by?: number | null
  actor_role?: string | null
  user?: {
    id: number
    full_name: string
    email: string
    project_role?: string | null
    role?: string | null
  } | null
  created_at?: string | null
}

type RequirementTraceabilityChange = {
  field_key: string
  field_label: string
  before_value: string
  after_value: string
  change_type: "Added" | "Updated" | "Removed"
}

type ChangeRequestFormState = {
  requested_by_name: string
  requested_date: string
  change_type: string
  priority: string
  intended_change: string
  reason: string
  remarks: string
}

type RequirementPermissionState = {
  createAllowed: boolean
  editAllowed: boolean
  deleteAllowed: boolean
  submitAllowed: boolean
  freezeAllowed: boolean
  requestChangeAllowed: boolean
  reviewChangeRequestAllowed: boolean
  decideChangeRequestAllowed: boolean
}

const API_BASE_URL = "http://localhost:5000/api/business-analyst"
const ACCESS_API_BASE_URL = "http://localhost:5000/api/access"

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token")
  }

  return null
}

const createAuthHeaders = (includeContentType = true) => {
  const token = getAuthToken()

  const headers: Record<string, string> = {}

  if (includeContentType) {
    headers["Content-Type"] = "application/json"
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

function formatDate(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString()
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleString()
}

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function getInitialChangeRequestForm(): ChangeRequestFormState {
  return {
    requested_by_name: "",
    requested_date: getTodayDateInputValue(),
    change_type: "Modify",
    priority: "Medium",
    intended_change: "",
    reason: "",
    remarks: "",
  }
}

function getStatusDescription(status: string) {
  switch (status) {
    case "Draft":
      return "This requirements document is still editable."
    case "For Approval":
      return "The current requirements document is under project member review."
    case "Approved":
      return "All required project members have approved this document."
    case "Rejected":
      return "This requirements document was rejected and needs revision before resubmission."
    case "Frozen":
      return "This requirements document is locked and used as the development baseline."
    case "Unfrozen":
      return "This requirements document has been unfrozen. Create a new editable version before making changes."
    default:
      return "-"
  }
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "Draft":
      return "bg-amber-100 text-amber-700 ring-amber-200"
    case "For Approval":
      return "bg-blue-100 text-blue-700 ring-blue-200"
    case "Approved":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200"
    case "Rejected":
      return "bg-red-100 text-red-700 ring-red-200"
    case "Frozen":
      return "bg-slate-100 text-slate-700 ring-slate-200"
    case "Unfrozen":
      return "bg-purple-100 text-purple-700 ring-purple-200"
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200"
  }
}

function getApprovalStatusClasses(status: string) {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-700"
    case "Rejected":
      return "bg-red-100 text-red-700"
    default:
      return "bg-amber-100 text-amber-700"
  }
}

function getApprovalDecisionStatus(summary?: RequirementApprovalSummary | null) {
  if (!summary?.submitted) return "Not requested"

  if (summary.pending_count > 0) return "Pending"

  if (summary.rejected) return "Rejected"

  if (summary.is_fully_approved) return "Approved"

  return "Pending"
}

function getApprovalDecisionLabel(summary?: RequirementApprovalSummary | null) {
  if (!summary?.submitted) return "Not requested"

  if (summary.pending_count > 0 && summary.rejected_count > 0) {
    return "Review in progress"
  }

  if (summary.pending_count > 0) return "Pending review"

  if (summary.rejected) return "Rejected"

  if (summary.is_fully_approved) return "Approved"

  return "Pending review"
}

function getChangeRequestStatusClasses(status: string) {
  switch (status) {
    case "Draft":
    case "Pending":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "Submitted":
    case "Impact Analysis Requested":
      return "border-blue-200 bg-blue-50 text-blue-700"
    case "Stakeholder Review":
      return "border-purple-200 bg-purple-50 text-purple-700"
    case "Proceed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "Declined":
      return "border-red-200 bg-red-50 text-red-700"
    default:
      return "border-border bg-background text-muted-foreground"
  }
}

function getChangeRequestDisplayStatus(status: string) {
  switch (status) {
    case "Submitted":
    case "Impact Analysis Requested":
      return "Impact Analysis Requested"
    case "Stakeholder Review":
      return "Sent to Stakeholders"
    case "Proceed":
      return "Approved to Proceed"
    case "Declined":
      return "Declined"
    default:
      return status || "-"
  }
}

function getChangeRequestStakeholderStatusLabel(changeRequest: RequirementChangeRequest) {
  const summary = changeRequest.review_summary
  const currentUserStatus = summary?.current_user_status

  if (changeRequest.status !== "Stakeholder Review") {
    if (
      changeRequest.status === "Impact Analysis Requested" ||
      changeRequest.status === "Submitted"
    ) {
      if (changeRequest.can_upload_impact_analysis) {
        return "Upload Impact Analysis Result"
      }

      if (changeRequest.can_review_change_request) {
        return "For Impact Analysis Review"
      }
    }

    return getChangeRequestDisplayStatus(changeRequest.status)
  }

  if (changeRequest.can_decide || currentUserStatus === "Pending") {
    return "Decision Required"
  }

  if (currentUserStatus && currentUserStatus !== "Pending") {
    return summary?.pending_count && summary.pending_count > 0
      ? "Waiting for Other Stakeholders"
      : "Decision Completed"
  }

  return "Sent to Stakeholders"
}

function getChangeRequestReviewSummaryLabel(changeRequest: RequirementChangeRequest) {
  const summary = changeRequest.review_summary

  if (!summary || !changeRequest.review_decisions?.length) {
    if (changeRequest.status === "Stakeholder Review") return "Sent to stakeholders for decision"
    if (changeRequest.status === "Impact Analysis Requested" || changeRequest.status === "Submitted") {
      return "Waiting for impact analysis upload"
    }
    return "-"
  }

  if (changeRequest.status === "Stakeholder Review") {
    return `${summary.proceed_count} proceed · ${summary.declined_count} declined · ${summary.pending_count} pending`
  }

  if (
    changeRequest.status === "Impact Analysis Requested" ||
    changeRequest.status === "Submitted"
  ) {
    if (changeRequest.can_upload_impact_analysis) {
      return "Waiting for you to upload the impact analysis result"
    }

    if (changeRequest.can_review_change_request) {
      return "Review the logged request before the external impact analysis meeting"
    }
  }

  return `${summary.proceed_count} proceed · ${summary.declined_count} declined`
}

function getCurrentReviewerDecisionLabel(changeRequest: RequirementChangeRequest) {
  const currentStatus = changeRequest.review_summary?.current_user_status

  if (!currentStatus) return null

  if (currentStatus === "Pending") return "Your stakeholder decision is required"

  return `Your decision: ${getChangeRequestDisplayStatus(currentStatus)}`
}

function isActiveChangeRequestStatus(status: string) {
  return [
    "Draft",
    "Submitted",
    "Impact Analysis Requested",
    "Stakeholder Review",
  ].includes(status)
}

function formatTraceabilityFieldLabel(fieldKey: string) {
  return fieldKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalizeSnapshotValues(snapshot: any): Record<string, string> {
  if (!snapshot || typeof snapshot !== "object") return {}

  const values = snapshot.values

  if (!values || typeof values !== "object") return {}

  return Object.entries(values).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = value === null || value === undefined ? "" : String(value)
    return acc
  }, {})
}

function buildRequirementTraceabilityChanges(
  log: RequirementChangeLog,
  fieldLabelsByKey: Record<string, string>
): RequirementTraceabilityChange[] {
  const action = (log.action || "").toLowerCase()
  const beforeValues = normalizeSnapshotValues(log.before_snapshot)
  const afterValues = normalizeSnapshotValues(log.after_snapshot)

  const hasBeforeSnapshot = Boolean(log.before_snapshot?.values)
  const hasAfterSnapshot = Boolean(log.after_snapshot?.values)

  if (!hasBeforeSnapshot && !hasAfterSnapshot) return []

  let before = beforeValues
  let after = afterValues

  if (action === "created") {
    before = {}
    after = afterValues
  } else if (action === "deleted") {
    before = beforeValues
    after = {}
  } else if (!hasBeforeSnapshot || !hasAfterSnapshot) {
    return []
  }

  const fieldKeys = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)])
  ).sort((a, b) => {
    const labelA = fieldLabelsByKey[a] || formatTraceabilityFieldLabel(a)
    const labelB = fieldLabelsByKey[b] || formatTraceabilityFieldLabel(b)
    return labelA.localeCompare(labelB)
  })

  return fieldKeys.reduce<RequirementTraceabilityChange[]>((changes, fieldKey) => {
    const beforeValue = before[fieldKey] || ""
    const afterValue = after[fieldKey] || ""

    if (beforeValue === afterValue) return changes

    let changeType: RequirementTraceabilityChange["change_type"] = "Updated"

    if (!beforeValue && afterValue) {
      changeType = "Added"
    } else if (beforeValue && !afterValue) {
      changeType = "Removed"
    }

    changes.push({
      field_key: fieldKey,
      field_label: fieldLabelsByKey[fieldKey] || formatTraceabilityFieldLabel(fieldKey),
      before_value: beforeValue,
      after_value: afterValue,
      change_type: changeType,
    })

    return changes
  }, [])
}

function formatTraceabilityValue(value: string) {
  return value && value.trim() ? value : "-"
}

function getTraceabilityChangeClasses(changeType: string) {
  switch (changeType) {
    case "Added":
      return "bg-emerald-100 text-emerald-700"
    case "Removed":
      return "bg-red-100 text-red-700"
    default:
      return "bg-blue-100 text-blue-700"
  }
}

function getRequirementLogActorLabel(log: RequirementChangeLog) {
  const actorName =
    log.user?.full_name ||
    log.user?.email ||
    (log.changed_by ? `User #${log.changed_by}` : "System")

  const actorRole =
    log.user?.project_role ||
    log.user?.role ||
    log.actor_role ||
    null

  return actorRole ? `${actorName} · ${actorRole}` : actorName
}

export default function RequirementsDocumentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const projectIdParam = searchParams.get("projectId")
  const documentIdParam = searchParams.get("id")

  const projectId = projectIdParam ? Number(projectIdParam) : null
  const documentId = documentIdParam ? Number(documentIdParam) : null

  const [documentSummary, setDocumentSummary] =
    useState<RequirementDocumentSummary | null>(null)
  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [requirements, setRequirements] = useState<RequirementItemSummary[]>([])
  const [changeRequests, setChangeRequests] = useState<RequirementChangeRequest[]>([])

  const [fetching, setFetching] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [permissionLoading, setPermissionLoading] = useState(true)
  const [message, setMessage] = useState("")

  const [canCreateRequirements, setCanCreateRequirements] = useState(false)
  const [canEditRequirements, setCanEditRequirements] = useState(false)
  const [canDeleteRequirements, setCanDeleteRequirements] = useState(false)
  const [canSubmitApproval, setCanSubmitApproval] = useState(false)
  const [canFreezeRequirements, setCanFreezeRequirements] = useState(false)
  const [canRequestChange, setCanRequestChange] = useState(false)
  const [canReviewChangeRequest, setCanReviewChangeRequest] = useState(false)
  const [canDecideChangeRequest, setCanDecideChangeRequest] = useState(false)

  const [requirementModalOpen, setRequirementModalOpen] = useState(false)
  const [editingRequirementId, setEditingRequirementId] =
    useState<number | null>(null)
  const [requirementValues, setRequirementValues] = useState<
    Record<string, string>
  >({})
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({})
  const [requirementToDelete, setRequirementToDelete] =
    useState<RequirementItemSummary | null>(null)
  const [selectedRequirementDetails, setSelectedRequirementDetails] =
    useState<RequirementItemDetailsResponse | null>(null)

  const [isApprovalSummaryOpen, setIsApprovalSummaryOpen] = useState(false)
  const [approvalSummary, setApprovalSummary] =
    useState<ApprovalSummary | null>(null)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
  const [isSubmitApprovalModalOpen, setIsSubmitApprovalModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<number[]>([])
  const [reviewDays, setReviewDays] = useState("3")
  const [selectedRequirementForLogs, setSelectedRequirementForLogs] =
    useState<RequirementItemSummary | null>(null)
  const [changeLogs, setChangeLogs] = useState<RequirementChangeLog[]>([])
  const [changeLogsLoading, setChangeLogsLoading] = useState(false)

  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false)
  const [selectedRequirementForComments, setSelectedRequirementForComments] =
    useState<RequirementItemSummary | null>(null)
  const [comments, setComments] = useState<RequirementComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState("")

  const [changeRequestModalOpen, setChangeRequestModalOpen] = useState(false)
  const [isSubmitChangeRequestsModalOpen, setIsSubmitChangeRequestsModalOpen] =
    useState(false)
  const [impactAnalysisModalOpen, setImpactAnalysisModalOpen] = useState(false)
  const [selectedChangeRequestForImpactAnalysis, setSelectedChangeRequestForImpactAnalysis] =
    useState<RequirementChangeRequest | null>(null)
  const [impactAnalysisFile, setImpactAnalysisFile] = useState<File | null>(null)
  const [impactAnalysisNotes, setImpactAnalysisNotes] = useState("")
  const [stakeholderReviewDays, setStakeholderReviewDays] = useState("3")
  const [selectedRequirementForChange, setSelectedRequirementForChange] =
    useState<RequirementItemSummary | null>(null)
  const [
    selectedRequirementForChangeRequestDetails,
    setSelectedRequirementForChangeRequestDetails,
  ] = useState<RequirementItemSummary | null>(null)
  const [changeRequestForm, setChangeRequestForm] =
    useState<ChangeRequestFormState>(getInitialChangeRequestForm())
  const [signedChangeRequestFile, setSignedChangeRequestFile] =
    useState<File | null>(null)
  const [changeRequestDecisionTarget, setChangeRequestDecisionTarget] =
    useState<RequirementChangeRequest | null>(null)
  const [changeRequestDecision, setChangeRequestDecision] = useState<
    "Proceed" | "Declined"
  >("Proceed")
  const [changeRequestDecisionNote, setChangeRequestDecisionNote] = useState("")

  const isActionLoading = (action: string) => actionLoading === action

  const canModify =
    documentSummary?.status === "Draft" || documentSummary?.status === "Rejected"

  const canAddRequirement = Boolean(canModify && canCreateRequirements)
  const canEditRequirement = Boolean(canModify && canEditRequirements)
  const canDeleteRequirement = Boolean(canModify && canDeleteRequirements)

  const canRequestChangeForDocument = Boolean(
    documentSummary &&
      canRequestChange &&
      ["Approved", "Frozen", "Unfrozen"].includes(documentSummary.status)
  )

  const canViewChangeRequests =
    canRequestChange || canReviewChangeRequest || canDecideChangeRequest

  const draftChangeRequestCount = useMemo(() => {
    if (!canRequestChange) return 0

    return changeRequests.filter((changeRequest) => changeRequest.status === "Draft")
      .length
  }, [canRequestChange, changeRequests])

  const changeRequestsByRequirementId = useMemo(() => {
    const grouped = new Map<number, RequirementChangeRequest[]>()

    if (!canViewChangeRequests) return grouped

    changeRequests.forEach((changeRequest) => {
      const current = grouped.get(changeRequest.item_id) || []
      current.push(changeRequest)
      grouped.set(changeRequest.item_id, current)
    })

    return grouped
  }, [canViewChangeRequests, changeRequests])

  const activeChangeRequestRequirementIds = useMemo(() => {
    const activeIds = new Set<number>()

    changeRequests.forEach((changeRequest) => {
      if (isActiveChangeRequestStatus(changeRequest.status)) {
        activeIds.add(changeRequest.item_id)
      }
    })

    return activeIds
  }, [changeRequests])

  const selectedRequirementChangeRequests = useMemo(() => {
    if (!canViewChangeRequests || !selectedRequirementForChangeRequestDetails) return []

    return (
      changeRequestsByRequirementId.get(
        selectedRequirementForChangeRequestDetails.id
      ) || []
    )
  }, [
    canViewChangeRequests,
    changeRequestsByRequirementId,
    selectedRequirementForChangeRequestDetails,
  ])

  const requirementFieldLabelsByKey = useMemo(() => {
    const labels: Record<string, string> = {}

    template?.sections.forEach((section) => {
      section.fields.forEach((field) => {
        labels[field.key] = field.label
      })
    })

    return labels
  }, [template])

  const approvableRequirementIds = useMemo(() => {
    return requirements
      .filter((requirement) => requirement.approval_summary?.current_user_can_approve)
      .map((requirement) => requirement.id)
  }, [requirements])

  const rejectableRequirementIds = useMemo(() => {
    return requirements
      .filter((requirement) => requirement.approval_summary?.current_user_can_reject)
      .map((requirement) => requirement.id)
  }, [requirements])

  const approvalSelectableRequirementIds = useMemo(() => {
    const actionableIds = new Set([
      ...approvableRequirementIds,
      ...rejectableRequirementIds,
    ])

    return requirements
      .filter(
        (requirement) =>
          requirement.status === "For Approval" && actionableIds.has(requirement.id)
      )
      .map((requirement) => requirement.id)
  }, [approvableRequirementIds, rejectableRequirementIds, requirements])

  const selectedApprovableRequirementIds = useMemo(() => {
    const selected = new Set(selectedRequirementIds)
    return approvableRequirementIds.filter((id) => selected.has(id))
  }, [approvableRequirementIds, selectedRequirementIds])

  const selectedRejectableRequirementIds = useMemo(() => {
    const selected = new Set(selectedRequirementIds)
    return rejectableRequirementIds.filter((id) => selected.has(id))
  }, [rejectableRequirementIds, selectedRequirementIds])

  const allVisibleRequirementsSelected =
    approvalSelectableRequirementIds.length > 0 &&
    approvalSelectableRequirementIds.every((id) => selectedRequirementIds.includes(id))

  const submittableApprovalRequirementIds = useMemo(() => {
    if (documentSummary?.status === "Rejected") {
      return requirements
        .filter((requirement) => requirement.status === "Rejected")
        .map((requirement) => requirement.id)
    }

    return requirements.map((requirement) => requirement.id)
  }, [documentSummary?.status, requirements])

  const submitApprovalRequirementCount = submittableApprovalRequirementIds.length
  const isResubmittingRejectedRequirements = documentSummary?.status === "Rejected"

  const checkPermission = async (permission: string) => {
    if (!projectId || Number.isNaN(projectId)) return false

    try {
      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return false
      }

      const res = await fetch(`${ACCESS_API_BASE_URL}/check`, {
        method: "POST",
        headers: createAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          permission,
          project_id: projectId,
        }),
      })

      const data = await res.json()

      if (!res.ok) return false

      return Boolean(data.allowed)
    } catch (error) {
      console.error(`Failed to check permission: ${permission}`, error)
      return false
    }
  }

  const fetchPermissions = async (): Promise<RequirementPermissionState> => {
    try {
      setPermissionLoading(true)

      const [
        createAllowed,
        editAllowed,
        deleteAllowed,
        submitAllowed,
        freezeAllowed,
        requestChangeAllowed,
        reviewChangeRequestAllowed,
        decideChangeRequestAllowed,
      ] = await Promise.all([
        checkPermission("requirements.create"),
        checkPermission("requirements.edit"),
        checkPermission("requirements.delete"),
        checkPermission("requirements.submit_approval"),
        checkPermission("requirements.freeze"),
        checkPermission("requirements.request_change"),
        checkPermission("requirements.review_change_request"),
        checkPermission("requirements.decide_change_request"),
      ])

      setCanCreateRequirements(createAllowed)
      setCanEditRequirements(editAllowed)
      setCanDeleteRequirements(deleteAllowed)
      setCanSubmitApproval(submitAllowed)
      setCanFreezeRequirements(freezeAllowed)
      setCanRequestChange(requestChangeAllowed)
      setCanReviewChangeRequest(reviewChangeRequestAllowed)
      setCanDecideChangeRequest(decideChangeRequestAllowed)

      return {
        createAllowed,
        editAllowed,
        deleteAllowed,
        submitAllowed,
        freezeAllowed,
        requestChangeAllowed,
        reviewChangeRequestAllowed,
        decideChangeRequestAllowed,
      }
    } finally {
      setPermissionLoading(false)
    }
  }

  const fetchChangeRequests = async (
    targetDocumentId?: number,
    changeRequestsVisible = canViewChangeRequests
  ) => {
    if (!changeRequestsVisible) {
      setChangeRequests([])
      return
    }

    if (!projectId || (!targetDocumentId && !documentSummary)) return

    const activeDocumentId = targetDocumentId || documentSummary?.id

    if (!activeDocumentId) return

    try {
      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${activeDocumentId}/change-requests`,
        {
          method: "GET",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setChangeRequests([])
        return
      }

      setChangeRequests(Array.isArray(data.change_requests) ? data.change_requests : [])
    } catch (error) {
      console.error("Failed to load change requests:", error)
      setChangeRequests([])
    }
  }

  const viewSignedChangeRequestFile = async (
    changeRequest: RequirementChangeRequest
  ) => {
    if (!documentSummary || !canViewChangeRequests) return

    try {
      setActionLoading(`view-change-request-file-${changeRequest.id}`)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/change-requests/${changeRequest.id}/file`,
        {
          method: "GET",
          headers: createAuthHeaders(false),
          credentials: "include",
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setMessage(data?.message || "Failed to open signed change request form.")
        return
      }

      const blob = await res.blob()
      const fileUrl = window.URL.createObjectURL(blob)

      window.open(fileUrl, "_blank", "noopener,noreferrer")

      window.setTimeout(() => {
        window.URL.revokeObjectURL(fileUrl)
      }, 30000)
    } catch (error) {
      console.error("Failed to view signed change request form:", error)
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to open signed change request form."
      )
    } finally {
      setActionLoading(null)
    }
  }

  const viewImpactAnalysisFile = async (
    changeRequest: RequirementChangeRequest
  ) => {
    if (!documentSummary || !canViewChangeRequests) return

    try {
      setActionLoading(`view-impact-analysis-file-${changeRequest.id}`)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/change-requests/${changeRequest.id}/impact-analysis-file`,
        {
          method: "GET",
          headers: createAuthHeaders(false),
          credentials: "include",
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setMessage(data?.message || "Failed to open impact analysis result.")
        return
      }

      const blob = await res.blob()
      const fileUrl = window.URL.createObjectURL(blob)

      window.open(fileUrl, "_blank", "noopener,noreferrer")

      window.setTimeout(() => {
        window.URL.revokeObjectURL(fileUrl)
      }, 30000)
    } catch (error) {
      console.error("Failed to view impact analysis result:", error)
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to open impact analysis result."
      )
    } finally {
      setActionLoading(null)
    }
  }

  const fetchApprovalSummary = async (
    openModal = false,
    targetDocumentId?: number
  ) => {
    if (!projectId || (!targetDocumentId && !documentSummary)) return

    const activeDocumentId = targetDocumentId || documentSummary?.id

    if (!activeDocumentId) return

    try {
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${activeDocumentId}/approval-summary`,
        {
          method: "GET",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to load approval summary")
        return
      }

      setApprovalSummary(data.summary || null)

      if (openModal && data.summary?.current_user_is_submitter) {
        setIsApprovalSummaryOpen(true)
      }
    } catch (error) {
      console.error("Failed to load approval summary:", error)
      setMessage("Failed to load approval summary")
    }
  }

  const openChangeLogsModal = async (requirement: RequirementItemSummary) => {
    if (!projectId || !documentSummary) return

    try {
      setSelectedRequirementForLogs(requirement)
      setChangeLogsLoading(true)
      setChangeLogs([])
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${requirement.id}/change-logs`,
        {
          method: "GET",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to load requirement logs")
        return
      }

      setChangeLogs(data.logs || [])
    } catch (error) {
      console.error("Failed to load requirement logs:", error)
      setMessage("Failed to load requirement logs")
    } finally {
      setChangeLogsLoading(false)
    }
  }

  const fetchData = async (requestChangeAllowed = false) => {
    if (!projectId || !documentId || Number.isNaN(projectId) || Number.isNaN(documentId)) {
      setFetching(false)
      setMessage("Missing project or document information. Please go back and try again.")
      return
    }

    try {
      setFetching(true)
      setMessage("")

      const token = getAuthToken()

      if (!token) {
        router.push("/signin")
        return
      }

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentId}`,
        {
          method: "GET",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data: RequirementDocumentDetailsResponse = await res.json()

      if (!res.ok) {
        setMessage((data as any).message || "Failed to fetch requirement document.")
        return
      }

      setDocumentSummary(data.document_summary)
      setTemplate(data.template || null)
      setRequirements(data.requirements || [])

      if (data.template) {
        const initialOpenSections: Record<number, boolean> = {}

        data.template.sections.forEach((section) => {
          initialOpenSections[section.id] = true
        })

        setOpenSections(initialOpenSections)
      }

      if (data.document_summary.status !== "Draft") {
        await fetchApprovalSummary(false, data.document_summary.id)
      }

      await fetchChangeRequests(
        data.document_summary.id,
        requestChangeAllowed
      )
    } catch (error) {
      console.error("Failed to fetch requirement document page:", error)
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to fetch requirement document page."
      )
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadPage = async () => {
      const permissions = await fetchPermissions()

      if (cancelled) return

      await fetchData(
        permissions.requestChangeAllowed ||
          permissions.reviewChangeRequestAllowed ||
          permissions.decideChangeRequestAllowed
      )
    }

    loadPage()

    return () => {
      cancelled = true
    }
  }, [projectId, documentId])

  useEffect(() => {
    setSelectedRequirementIds((prev) => {
      const availableIds = new Set(approvalSelectableRequirementIds)
      return prev.filter((id) => availableIds.has(id))
    })
  }, [approvalSelectableRequirementIds])

  const updateRequirementInList = (summary: RequirementItemSummary) => {
    setRequirements((prev) => {
      const exists = prev.some((requirement) => requirement.id === summary.id)

      if (exists) {
        return prev.map((requirement) =>
          requirement.id === summary.id ? summary : requirement
        )
      }

      return [...prev, summary]
    })

    setSelectedRequirementDetails((prev) =>
      prev && prev.summary.id === summary.id
        ? {
            ...prev,
            summary,
          }
        : prev
    )
  }

  const toggleRequirementSelection = (requirementId: number) => {
    if (!approvalSelectableRequirementIds.includes(requirementId)) return

    setSelectedRequirementIds((prev) =>
      prev.includes(requirementId)
        ? prev.filter((id) => id !== requirementId)
        : [...prev, requirementId]
    )
  }

  const toggleSelectAllRequirements = () => {
    setSelectedRequirementIds(
      allVisibleRequirementsSelected ? [] : approvalSelectableRequirementIds
    )
  }

  const replaceRequirementsFromAction = (updatedRequirements?: RequirementItemSummary[]) => {
    if (!updatedRequirements || updatedRequirements.length === 0) return

    const updatedById = new Map(
      updatedRequirements.map((requirement) => [requirement.id, requirement])
    )

    setRequirements((prev) =>
      prev.map((requirement) => updatedById.get(requirement.id) || requirement)
    )

    setSelectedRequirementDetails((prev) => {
      if (!prev) return prev
      const updated = updatedById.get(prev.summary.id)
      return updated ? { ...prev, summary: updated } : prev
    })
  }

  const updateDocumentStatus = (status: string) => {
    setDocumentSummary((prev) =>
      prev
        ? {
            ...prev,
            status,
            updated_at: new Date().toISOString(),
          }
        : prev
    )
  }

  const toggleSection = (sectionId: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const initializeBlankRequirementValues = (docTemplate: DocumentTemplate) => {
    const initialValues: Record<string, string> = {}
    const initialOpenSections: Record<number, boolean> = {}

    docTemplate.sections.forEach((section) => {
      initialOpenSections[section.id] = true

      section.fields.forEach((field) => {
        initialValues[field.key] = field.default_value || ""
      })
    })

    setOpenSections(initialOpenSections)
    setRequirementValues(initialValues)
  }

  const buildValuesFromRequirementRecord = (
    docTemplate: DocumentTemplate,
    item: RequirementItemDetailsResponse["item"]
  ) => {
    const fieldMap = new Map<number, string>()

    docTemplate.sections.forEach((section) => {
      section.fields.forEach((field) => {
        fieldMap.set(field.id, field.key)
      })
    })

    const values: Record<string, string> = {}

    ;(item.values || []).forEach((entry) => {
      const fieldKey = fieldMap.get(entry.template_field_id)

      if (fieldKey) {
        values[fieldKey] = entry.value_text || ""
      }
    })

    docTemplate.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (values[field.key] === undefined) {
          values[field.key] = field.default_value || ""
        }
      })
    })

    return values
  }

  const getRequirementDetailFieldValue = (fieldId: number) => {
    const value = selectedRequirementDetails?.item.values?.find(
      (entry) => entry.template_field_id === fieldId
    )

    return value?.value_text || "-"
  }

  const openCreateRequirementModal = () => {
    if (!canAddRequirement) {
      setMessage("You don't have permission to create requirements.")
      return
    }

    if (!template) return

    initializeBlankRequirementValues(template)
    setEditingRequirementId(null)
    setRequirementModalOpen(true)
  }

  const openEditRequirementModal = async (requirementId: number) => {
    if (!canEditRequirement) {
      setMessage("You don't have permission to edit requirements.")
      return
    }

    if (!template || !documentSummary) return

    try {
      setActionLoading(`load-requirement-${requirementId}`)

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${requirementId}`,
        {
          method: "GET",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data: RequirementItemDetailsResponse = await res.json()

      if (!res.ok || !data.template) {
        setMessage((data as any).message || "Failed to load requirement.")
        return
      }

      const values = buildValuesFromRequirementRecord(template, data.item)

      setRequirementValues(values)
      setEditingRequirementId(requirementId)
      setRequirementModalOpen(true)
    } catch (error) {
      console.error("Failed to load requirement:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to load requirement."
      )
    } finally {
      setActionLoading(null)
    }
  }

  const openRequirementDetails = async (requirementId: number) => {
    if (!template || !documentSummary) return

    try {
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${requirementId}`,
        {
          method: "GET",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data: RequirementItemDetailsResponse = await res.json()

      if (!res.ok || !data.template) {
        setMessage((data as any).message || "Failed to load requirement.")
        return
      }

      setSelectedRequirementDetails(data)
    } catch (error) {
      console.error("Failed to load requirement details:", error)
      setMessage("Failed to load requirement details.")
    }
  }

  const closeRequirementDetails = () => {
    setSelectedRequirementDetails(null)
  }

  const handleRequirementChange = (fieldKey: string, value: string) => {
    setRequirementValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
  }

  const handleChangeRequestFormChange = (
    fieldKey: keyof ChangeRequestFormState,
    value: string
  ) => {
    setChangeRequestForm((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
  }

  const buildRequirementValuesPayload = () => {
    if (!template) return []

    return template.sections.flatMap((section) =>
      section.fields.map((field) => ({
        template_field_id: field.id,
        value_text: requirementValues[field.key] || "",
      }))
    )
  }

  const saveRequirement = async () => {
    if (!template || !documentSummary) return

    if (editingRequirementId && !canEditRequirement) {
      setMessage("You don't have permission to edit requirements.")
      return
    }

    if (!editingRequirementId && !canAddRequirement) {
      setMessage("You don't have permission to create requirements.")
      return
    }

    const actionKey = editingRequirementId
      ? `save-requirement-${editingRequirementId}`
      : "create-requirement"

    try {
      setActionLoading(actionKey)
      setMessage("")

      const payload = {
        values: buildRequirementValuesPayload(),
      }

      const url = editingRequirementId
        ? `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${editingRequirementId}`
        : `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items`

      const method = editingRequirementId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: createAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to save requirement.")
        return
      }

      const savedSummary =
        data.summary || data.requirement || data.item_summary || data.item || null

      if (savedSummary) {
        updateRequirementInList(savedSummary)
      }

      setRequirementModalOpen(false)
      setEditingRequirementId(null)
      setSelectedRequirementDetails(null)

      setDocumentSummary((prev) =>
        prev
          ? {
              ...prev,
              requirement_count:
                !editingRequirementId && savedSummary
                  ? prev.requirement_count + 1
                  : prev.requirement_count,
              updated_at: new Date().toISOString(),
            }
          : prev
      )

      setMessage(data.message || "Requirement saved successfully.")
    } catch (error) {
      console.error("Failed to save requirement:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to save requirement."
      )
    } finally {
      setActionLoading(null)
    }
  }

  const openChangeRequestModal = (requirement: RequirementItemSummary) => {
    if (!canRequestChangeForDocument) {
      setMessage("You don't have permission to log change requests for this document.")
      return
    }

    if (requirementHasActiveChangeRequest(requirement.id)) {
      setMessage("This requirement already has an active change request.")
      return
    }

    setSelectedRequirementForChange(requirement)
    setChangeRequestForm(getInitialChangeRequestForm())
    setSignedChangeRequestFile(null)
    setChangeRequestModalOpen(true)
  }

  const closeChangeRequestModal = () => {
    setSelectedRequirementForChange(null)
    setChangeRequestForm(getInitialChangeRequestForm())
    setSignedChangeRequestFile(null)
    setChangeRequestModalOpen(false)
  }

  const openChangeRequestDetailsModal = (requirement: RequirementItemSummary) => {
    if (!canViewChangeRequests) return

    setSelectedRequirementForChangeRequestDetails(requirement)
  }

  const closeChangeRequestDetailsModal = () => {
    setSelectedRequirementForChangeRequestDetails(null)
  }

  const requirementHasActiveChangeRequest = (requirementId: number) => {
    return activeChangeRequestRequirementIds.has(requirementId)
  }

  const getRequestChangeDisabledMessage = (requirementId: number) => {
    const activeRequest = changeRequestsByRequirementId
      .get(requirementId)
      ?.find((changeRequest) =>
        isActiveChangeRequestStatus(changeRequest.status)
      )

    if (!activeRequest) return "Request Change"

    if (activeRequest.status === "Draft") return "Draft Change Request Exists"
    if (activeRequest.status === "Stakeholder Review") return "Waiting for Stakeholder Decision"

    return "Waiting for Impact Analysis Result"
  }

  const replaceChangeRequestInList = (updatedChangeRequest: RequirementChangeRequest) => {
    setChangeRequests((prev) =>
      prev.map((changeRequest) =>
        changeRequest.id === updatedChangeRequest.id
          ? updatedChangeRequest
          : changeRequest
      )
    )
  }

  const openChangeRequestDecisionModal = (
    changeRequest: RequirementChangeRequest,
    decision: "Proceed" | "Declined"
  ) => {
    setChangeRequestDecisionTarget(changeRequest)
    setChangeRequestDecision(decision)
    setChangeRequestDecisionNote("")
  }

  const closeChangeRequestDecisionModal = () => {
    setChangeRequestDecisionTarget(null)
    setChangeRequestDecision("Proceed")
    setChangeRequestDecisionNote("")
  }

  const saveChangeRequestDraft = async () => {
    if (!documentSummary || !selectedRequirementForChange) return

    if (!canRequestChangeForDocument) {
      setMessage("You don't have permission to log change requests for this document.")
      return
    }

    if (!changeRequestForm.requested_by_name.trim()) {
      setMessage("Stakeholder/requester name is required.")
      return
    }

    if (!changeRequestForm.intended_change.trim()) {
      setMessage("Intended change description is required.")
      return
    }

    if (!signedChangeRequestFile) {
      setMessage("Signed change request form upload is required.")
      return
    }

    try {
      setActionLoading("save-change-request")
      setMessage("")

      const formData = new FormData()
      formData.append("requested_by_name", changeRequestForm.requested_by_name)
      formData.append("requested_date", changeRequestForm.requested_date)
      formData.append("change_type", changeRequestForm.change_type)
      formData.append("priority", changeRequestForm.priority)
      formData.append("intended_change", changeRequestForm.intended_change)
      formData.append("reason", changeRequestForm.reason)
      formData.append("remarks", changeRequestForm.remarks)
      formData.append("signed_change_request_form", signedChangeRequestFile)

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${selectedRequirementForChange.id}/change-requests`,
        {
          method: "POST",
          headers: createAuthHeaders(false),
          credentials: "include",
          body: formData,
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to save change request.")
        return
      }

      const savedChangeRequest: RequirementChangeRequest | null =
        data.change_request || data.request || null

      if (savedChangeRequest) {
        setChangeRequests((prev) => [savedChangeRequest, ...prev])
      }

      closeChangeRequestModal()
      setMessage(data.message || "Change request saved as draft.")
    } catch (error) {
      console.error("Failed to save change request:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to save change request."
      )
    } finally {
      setActionLoading(null)
    }
  }

  const submitChangeRequests = async () => {
    if (!documentSummary) return

    if (!canRequestChange) {
      setMessage("You don't have permission to submit change requests.")
      return
    }

    try {
      setActionLoading("submit-change-requests")
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/change-requests/submit`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to submit change requests.")
        return
      }

      const submittedChangeRequests: RequirementChangeRequest[] =
        Array.isArray(data.change_requests) ? data.change_requests : []

      if (submittedChangeRequests.length > 0) {
        const submittedById = new Map(
          submittedChangeRequests.map((changeRequest) => [
            changeRequest.id,
            changeRequest,
          ])
        )

        setChangeRequests((prev) =>
          prev.map((changeRequest) =>
            submittedById.get(changeRequest.id) || changeRequest
          )
        )
      } else {
        const submittedAt = new Date().toISOString()

        setChangeRequests((prev) =>
          prev.map((changeRequest) =>
            changeRequest.status === "Draft"
              ? {
                  ...changeRequest,
                  status: "Impact Analysis Requested",
                  submitted_at: submittedAt,
                  is_active: true,
                }
              : changeRequest
          )
        )
      }

      closeChangeRequestDetailsModal()
      setIsSubmitChangeRequestsModalOpen(false)

      setMessage(
        `${data.message || "Change requests submitted for impact analysis review"}. Sent ${
          data.submitted_count ?? draftChangeRequestCount
        } change request(s) for impact analysis affecting ${
          data.affected_requirement_count ?? "selected"
        } requirement(s).`
      )
    } catch (error) {
      console.error("Failed to submit change requests:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to submit change requests."
      )
    } finally {
      setActionLoading(null)
    }
  }

  const openImpactAnalysisModal = (changeRequest: RequirementChangeRequest) => {
    setSelectedChangeRequestForImpactAnalysis(changeRequest)
    setImpactAnalysisFile(null)
    setImpactAnalysisNotes("")
    setStakeholderReviewDays("3")
    setImpactAnalysisModalOpen(true)
  }

  const closeImpactAnalysisModal = () => {
    setSelectedChangeRequestForImpactAnalysis(null)
    setImpactAnalysisFile(null)
    setImpactAnalysisNotes("")
    setStakeholderReviewDays("3")
    setImpactAnalysisModalOpen(false)
  }

  const uploadImpactAnalysis = async () => {
    if (!documentSummary || !selectedChangeRequestForImpactAnalysis) return

    if (!impactAnalysisFile) {
      setMessage("Impact analysis result file is required.")
      return
    }

    try {
      setActionLoading(
        `upload-impact-analysis-${selectedChangeRequestForImpactAnalysis.id}`
      )
      setMessage("")

      const formData = new FormData()
      formData.append("impact_analysis_file", impactAnalysisFile)
      formData.append("impact_analysis_notes", impactAnalysisNotes)
      formData.append("review_days", String(Number(stakeholderReviewDays) || 3))

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/change-requests/${selectedChangeRequestForImpactAnalysis.id}/impact-analysis`,
        {
          method: "POST",
          headers: createAuthHeaders(false),
          credentials: "include",
          body: formData,
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to upload impact analysis result.")
        return
      }

      if (data.change_request) {
        replaceChangeRequestInList(data.change_request)
      }

      closeImpactAnalysisModal()
      setMessage(
        data.message ||
          "Impact analysis uploaded and sent to stakeholders for decision."
      )
    } catch (error) {
      console.error("Failed to upload impact analysis:", error)
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to upload impact analysis result."
      )
    } finally {
      setActionLoading(null)
    }
  }

  const decideChangeRequest = async () => {
    if (!documentSummary || !changeRequestDecisionTarget) return

    if (changeRequestDecision === "Declined" && !changeRequestDecisionNote.trim()) {
      setMessage("A reason is required when marking a change request as Declined.")
      return
    }

    try {
      setActionLoading(`decide-change-request-${changeRequestDecisionTarget.id}`)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/change-requests/${changeRequestDecisionTarget.id}/decision`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            decision: changeRequestDecision,
            note: changeRequestDecisionNote,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to update change request decision.")
        return
      }

      if (data.change_request) {
        replaceChangeRequestInList(data.change_request)
      }

      closeChangeRequestDecisionModal()
      setMessage(data.message || "Change request decision saved.")
    } catch (error) {
      console.error("Failed to update change request decision:", error)
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update change request decision."
      )
    } finally {
      setActionLoading(null)
    }
  }

  const deleteDraftChangeRequest = async (changeRequest: RequirementChangeRequest) => {
    if (!documentSummary) return

    if (!canRequestChange || changeRequest.can_delete === false) {
      setMessage("You don't have permission to delete this draft change request.")
      return
    }

    const confirmed = window.confirm("Delete this draft change request?")

    if (!confirmed) return

    try {
      setActionLoading(`delete-change-request-${changeRequest.id}`)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/change-requests/${changeRequest.id}`,
        {
          method: "DELETE",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to delete change request.")
        return
      }

      setChangeRequests((prev) =>
        prev.filter((item) => item.id !== changeRequest.id)
      )

      closeChangeRequestDetailsModal()
      setMessage(data.message || "Draft change request deleted successfully.")
    } catch (error) {
      console.error("Failed to delete change request:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to delete change request."
      )
    } finally {
      setActionLoading(null)
    }
  }

  const confirmDeleteRequirement = async () => {
    if (!documentSummary || !requirementToDelete) return

    if (!canDeleteRequirement) {
      setMessage("You don't have permission to delete requirements.")
      return
    }

    try {
      setActionLoading(`delete-requirement-${requirementToDelete.id}`)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${requirementToDelete.id}`,
        {
          method: "DELETE",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to delete requirement")
        return
      }

      setRequirements((prev) =>
        prev.filter((requirement) => requirement.id !== requirementToDelete.id)
      )

      setChangeRequests((prev) =>
        prev.filter((changeRequest) => changeRequest.item_id !== requirementToDelete.id)
      )

      setDocumentSummary((prev) =>
        prev
          ? {
              ...prev,
              requirement_count: Math.max(prev.requirement_count - 1, 0),
              updated_at: new Date().toISOString(),
            }
          : prev
      )

      setRequirementToDelete(null)
      setSelectedRequirementDetails(null)
      setMessage(data.message || "Requirement deleted successfully.")
    } catch (error) {
      console.error("Failed to delete requirement:", error)
      setMessage("Failed to delete requirement")
    } finally {
      setActionLoading(null)
    }
  }

  const submitForApproval = async () => {
    if (!documentSummary) return

    if (!canSubmitApproval) {
      setMessage("You don't have permission to submit requirements for approval.")
      return
    }

    const itemIds = submittableApprovalRequirementIds

    if (itemIds.length === 0) {
      setMessage(
        isResubmittingRejectedRequirements
          ? "There are no rejected requirements to resubmit."
          : "Add at least one requirement before submitting for approval."
      )
      return
    }

    try {
      setActionLoading("submit-approval")
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/submit-approval`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            item_ids: itemIds,
            review_days: Number(reviewDays) || 3,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to submit for approval")
        return
      }

      setApprovalSummary(data.approval_summary || null)
      replaceRequirementsFromAction(data.requirements || [])
      updateDocumentStatus(data.document?.status || "For Approval")
      setSelectedRequirementIds([])
      setIsSubmitApprovalModalOpen(false)
      setMessage(
        data.message ||
          (isResubmittingRejectedRequirements
            ? "Rejected requirement(s) resubmitted for approval."
            : "All requirements submitted for approval.")
      )
    } catch (error) {
      console.error("Failed to submit for approval:", error)
      setMessage("Failed to submit for approval")
    } finally {
      setActionLoading(null)
    }
  }

  const approveDocument = async () => {
    if (!documentSummary) return

    if (approvalSummary?.current_user_is_submitter) {
      setMessage("The user who submitted this document does not need to approve their own requirements.")
      return
    }

    const itemIds = selectedApprovableRequirementIds

    if (itemIds.length === 0) {
      setMessage("Tick at least one requirement that is for approval.")
      return
    }

    try {
      setActionLoading("approve-document")
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/approve`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({ item_ids: itemIds }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to approve requirements")
        return
      }

      setApprovalSummary(data.approval_summary || null)
      replaceRequirementsFromAction(data.requirements || [])

      if (data.document?.status) {
        updateDocumentStatus(data.document.status)
      }

      const changedRequirementIds = Array.isArray(data.changed_requirement_ids)
        ? data.changed_requirement_ids
        : itemIds

      setSelectedRequirementIds((prev) =>
        prev.filter((id) => !changedRequirementIds.includes(id))
      )
      setMessage(data.message || "Requirement(s) approved")
    } catch (error) {
      console.error("Failed to approve requirements:", error)
      setMessage("Failed to approve requirements")
    } finally {
      setActionLoading(null)
    }
  }

  const rejectDocument = async () => {
    if (!documentSummary) return

    if (approvalSummary?.current_user_is_submitter) {
      setMessage("The user who submitted this document does not need to reject their own requirements.")
      return
    }

    const itemIds = selectedRejectableRequirementIds

    if (itemIds.length === 0) {
      setMessage("Tick at least one requirement that is for approval.")
      return
    }

    try {
      setActionLoading("reject-document")
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/reject`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            item_ids: itemIds,
            reason: rejectionReason,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to reject requirements")
        return
      }

      setApprovalSummary(data.approval_summary || null)
      replaceRequirementsFromAction(data.requirements || [])
      setIsRejectModalOpen(false)
      setRejectionReason("")

      if (data.document?.status) {
        updateDocumentStatus(data.document.status)
      }

      const changedRequirementIds = Array.isArray(data.changed_requirement_ids)
        ? data.changed_requirement_ids
        : itemIds

      setSelectedRequirementIds((prev) =>
        prev.filter((id) => !changedRequirementIds.includes(id))
      )
      setMessage(data.message || "Requirement(s) rejected")
    } catch (error) {
      console.error("Failed to reject requirements:", error)
      setMessage("Failed to reject requirements")
    } finally {
      setActionLoading(null)
    }
  }

  const freezeDocument = async () => {
    if (!documentSummary) return

    if (!canFreezeRequirements) {
      setMessage("You don't have permission to freeze requirements.")
      return
    }

    if (!approvalSummary?.current_user_is_submitter) {
      setMessage("Only the user who created this document can freeze it.")
      return
    }

    try {
      setActionLoading("freeze-document")
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/freeze`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to freeze document")
        return
      }

      updateDocumentStatus("Frozen")
      setMessage(data.message || "Requirement document frozen successfully")
    } catch (error) {
      console.error("Failed to freeze document:", error)
      setMessage("Failed to freeze document")
    } finally {
      setActionLoading(null)
    }
  }

  const unfreezeDocument = async () => {
    if (!documentSummary) return

    if (!canFreezeRequirements) {
      setMessage("You don't have permission to unfreeze requirements.")
      return
    }

    try {
      setActionLoading("unfreeze-document")
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/unfreeze`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to unfreeze document")
        return
      }

      updateDocumentStatus("Unfrozen")
      setMessage(data.message || "Requirement document unfrozen successfully")
    } catch (error) {
      console.error("Failed to unfreeze document:", error)
      setMessage("Failed to unfreeze document")
    } finally {
      setActionLoading(null)
    }
  }

  const createNewVersion = async (changeType: "minor" | "major") => {
    if (!documentSummary) return

    if (!canEditRequirements) {
      setMessage("You don't have permission to create a new requirement version.")
      return
    }

    try {
      setActionLoading(`create-version-${changeType}`)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/create-version`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({ change_type: changeType }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to create new version")
        return
      }

      router.push(
        `/stakeholder/projects/requirements-document?id=${data.document.id}&projectId=${projectId}`
      )
    } catch (error) {
      console.error("Failed to create new version:", error)
      setMessage("Failed to create new version")
    } finally {
      setActionLoading(null)
      setIsVersionModalOpen(false)
    }
  }

  const fetchRequirementComments = async (requirementId: number) => {
    if (!documentSummary) return

    try {
      setCommentsLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${requirementId}/comments`,
        {
          method: "GET",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to load comments")
        return
      }

      setComments(data.comments || [])
    } catch (error) {
      console.error("Failed to load comments:", error)
      setMessage("Failed to load comments")
    } finally {
      setCommentsLoading(false)
    }
  }

  const openCommentsDrawer = async (requirement: RequirementItemSummary) => {
    setSelectedRequirementForComments(requirement)
    setNewComment("")
    setCommentDrawerOpen(true)

    await fetchRequirementComments(requirement.id)
  }

  const closeCommentsDrawer = () => {
    setSelectedRequirementForComments(null)
    setComments([])
    setNewComment("")
    setCommentDrawerOpen(false)
  }

  const saveRequirementComment = async () => {
    if (!documentSummary || !selectedRequirementForComments) return

    const cleanComment = newComment.trim()

    if (!cleanComment) {
      setMessage("Comment cannot be empty.")
      return
    }

    try {
      setActionLoading("save-comment")
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${selectedRequirementForComments.id}/comments`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            comment_text: cleanComment,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to add comment")
        return
      }

      const savedComment = data.comment || null

      if (savedComment) {
        setComments((prev) => [savedComment, ...prev])
      } else {
        await fetchRequirementComments(selectedRequirementForComments.id)
      }

      setRequirements((prev) =>
        prev.map((requirement) =>
          requirement.id === selectedRequirementForComments.id
            ? {
                ...requirement,
                comment_count: (requirement.comment_count || 0) + 1,
              }
            : requirement
        )
      )

      setSelectedRequirementDetails((prev) =>
        prev && prev.summary.id === selectedRequirementForComments.id
          ? {
              ...prev,
              summary: {
                ...prev.summary,
                comment_count: (prev.summary.comment_count || 0) + 1,
              },
            }
          : prev
      )

      setNewComment("")
      setMessage(data.message || "Comment added successfully.")
    } catch (error) {
      console.error("Failed to add comment:", error)
      setMessage("Failed to add comment")
    } finally {
      setActionLoading(null)
    }
  }

  const deleteRequirementComment = async (comment: RequirementComment) => {
    if (!documentSummary || !selectedRequirementForComments) return

    try {
      setActionLoading(`delete-comment-${comment.id}`)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/items/${selectedRequirementForComments.id}/comments/${comment.id}`,
        {
          method: "DELETE",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to delete comment")
        return
      }

      setComments((prev) => prev.filter((item) => item.id !== comment.id))

      setRequirements((prev) =>
        prev.map((requirement) =>
          requirement.id === selectedRequirementForComments.id
            ? {
                ...requirement,
                comment_count: Math.max((requirement.comment_count || 0) - 1, 0),
              }
            : requirement
        )
      )

      setSelectedRequirementDetails((prev) =>
        prev && prev.summary.id === selectedRequirementForComments.id
          ? {
              ...prev,
              summary: {
                ...prev.summary,
                comment_count: Math.max((prev.summary.comment_count || 0) - 1, 0),
              },
            }
          : prev
      )

      setMessage(data.message || "Comment deleted successfully.")
    } catch (error) {
      console.error("Failed to delete comment:", error)
      setMessage("Failed to delete comment")
    } finally {
      setActionLoading(null)
    }
  }

  if (!projectIdParam || !documentIdParam || !projectId || !documentId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-destructive">
            Missing project or document information. Please go back and try again.
          </div>

          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            <ChevronLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!documentSummary && fetching) {
    return null
  }

  if (!documentSummary) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          {message || "Requirement document not found."}
        </div>
      </section>
    )
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6">
        <button
          onClick={() =>
            router.push(
              `/stakeholder/projects/project-details?id=${projectId}&tab=requirements`
            )
          }
          className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Requirements
        </button>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {documentSummary.name || `Requirements ${documentSummary.version}`}
            </h1>

            <p className="mt-2 text-muted-foreground">
              Version {documentSummary.version}
            </p>

            <p className="mt-1 text-muted-foreground">
              Created {formatDate(documentSummary.created_at)} · Updated{" "}
              {formatDate(documentSummary.updated_at)}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="mb-6 rounded-2xl bg-background p-6 ring-1 ring-border">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Current Status:
          </p>

          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusBadgeClasses(
              documentSummary.status
            )}`}
          >
            {documentSummary.status}
          </span>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {getStatusDescription(documentSummary.status)}
        </p>

        {canRequestChange && draftChangeRequestCount > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You have {draftChangeRequestCount} draft change request
            {draftChangeRequestCount > 1 ? "s" : ""} ready for submission.
            Submit them together after logging all affected requirements.
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {(documentSummary.status === "Draft" ||
            documentSummary.status === "Rejected") &&
            !permissionLoading &&
            canSubmitApproval && (
              <button
                type="button"
                onClick={() => setIsSubmitApprovalModalOpen(true)}
                disabled={
                  isActionLoading("submit-approval") ||
                  submitApprovalRequirementCount === 0
                }
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <FileCheck className="h-4 w-4" />
                {isActionLoading("submit-approval")
                  ? "Submitting..."
                  : documentSummary.status === "Rejected"
                    ? "Resubmit for Approval"
                    : "Submit for Approval"}
              </button>
            )}

          {documentSummary.status !== "Draft" &&
            approvalSummary && (
              <button
                type="button"
                onClick={() => fetchApprovalSummary(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Eye className="h-4 w-4" />
                View Approval Summary
              </button>
            )}

          {documentSummary.status === "Approved" &&
            !permissionLoading &&
            canFreezeRequirements &&
            approvalSummary?.current_user_is_submitter && (
              <button
                type="button"
                onClick={freezeDocument}
                disabled={isActionLoading("freeze-document")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Snowflake className="h-4 w-4" />
                {isActionLoading("freeze-document")
                  ? "Freezing..."
                  : "Freeze Document"}
              </button>
            )}

          {documentSummary.status === "Frozen" &&
            !permissionLoading &&
            canFreezeRequirements && (
              <button
                type="button"
                onClick={unfreezeDocument}
                disabled={isActionLoading("unfreeze-document")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Unlock className="h-4 w-4" />
                {isActionLoading("unfreeze-document")
                  ? "Unfreezing..."
                  : "Unfreeze Document"}
              </button>
            )}

          {documentSummary.status === "Unfrozen" &&
            !permissionLoading &&
            canEditRequirements && (
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}

          {!permissionLoading && canRequestChange && draftChangeRequestCount > 0 && (
            <button
              type="button"
              onClick={() => setIsSubmitChangeRequestsModalOpen(true)}
              disabled={isActionLoading("submit-change-requests")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isActionLoading("submit-change-requests")
                ? "Submitting..."
                : "Send for Impact Analysis"}
            </button>
          )}
        </div>
      </div>

      {selectedRequirementDetails && template ? (
        <div className="rounded-2xl bg-background ring-1 ring-border">
          <div className="flex flex-col gap-3 border-b border-border px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {selectedRequirementDetails.summary.requirement_code}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {selectedRequirementDetails.summary.title || "-"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openCommentsDrawer(selectedRequirementDetails.summary)
                }
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                title="View comments"
              >
                <MessageSquare className="h-4 w-4" />
                {selectedRequirementDetails.summary.comment_count &&
                  selectedRequirementDetails.summary.comment_count > 0 && (
                    <span>{selectedRequirementDetails.summary.comment_count}</span>
                  )}
              </button>

              {canRequestChangeForDocument && (
                <button
                  type="button"
                  onClick={() =>
                    openChangeRequestModal(selectedRequirementDetails.summary)
                  }
                  disabled={requirementHasActiveChangeRequest(
                    selectedRequirementDetails.summary.id
                  )}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ClipboardList className="h-4 w-4" />
                  {getRequestChangeDisabledMessage(
                    selectedRequirementDetails.summary.id
                  )}
                </button>
              )}

              {canEditRequirement && (
                <button
                  type="button"
                  onClick={() =>
                    openEditRequirementModal(selectedRequirementDetails.summary.id)
                  }
                  disabled={isActionLoading(
                    `load-requirement-${selectedRequirementDetails.summary.id}`
                  )}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              )}

              <button
                type="button"
                onClick={closeRequirementDetails}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Table
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-b border-border p-6 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Requirement ID
              </p>
              <p className="mt-1 text-foreground">
                {selectedRequirementDetails.summary.requirement_code}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Priority
              </p>
              <p className="mt-1 text-foreground">
                {selectedRequirementDetails.summary.priority || "-"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Status
              </p>
              <p className="mt-1 text-foreground">
                {selectedRequirementDetails.summary.status || "-"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Last Updated
              </p>
              <p className="mt-1 text-foreground">
                {formatDate(selectedRequirementDetails.summary.updated_at)}
              </p>
            </div>
          </div>

          <div className="space-y-4 p-4 md:p-6">
            {template.sections.map((section) => (
              <div key={section.id} className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                  <p className="font-medium text-foreground">{section.title}</p>

                  {section.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  )}
                </div>

                <div className="space-y-5 px-4 py-4">
                  {section.fields.map((field) => (
                    <div key={field.id}>
                      <p className="text-sm font-semibold text-foreground">
                        {field.label}
                      </p>

                      <div className="mt-2 rounded-lg border border-border bg-background px-4 py-3">
                        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                          {getRequirementDetailFieldValue(field.id)}
                        </p>
                      </div>

                      {field.help_text && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {field.help_text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border">
          <div className="flex flex-col gap-3 border-b border-border px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Requirements Table
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                These requirements use the dynamic template. Requirements that are already for approval can be ticked for approve or reject actions.
              </p>
            </div>

            {canAddRequirement && template && (
              <button
                type="button"
                onClick={openCreateRequirementModal}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add Requirement
              </button>
            )}
          </div>

          {requirements.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              No requirements in this document yet.
            </div>
          ) : (
            <>
              {documentSummary.status === "For Approval" &&
                approvalSelectableRequirementIds.length > 0 && (
                  <div className="flex flex-col gap-3 border-b border-border px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={allVisibleRequirementsSelected}
                          onChange={toggleSelectAllRequirements}
                          className="h-4 w-4 rounded border-border"
                        />
                        Select all pending approvals
                      </label>

                      <span className="text-sm text-muted-foreground">
                        {selectedRequirementIds.length} selected
                      </span>
                    </div>

                    {selectedRequirementIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={approveDocument}
                          disabled={
                            isActionLoading("approve-document") ||
                            selectedApprovableRequirementIds.length === 0
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {isActionLoading("approve-document")
                            ? "Approving..."
                            : "Approve Selected"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsRejectModalOpen(true)}
                          disabled={
                            isActionLoading("reject-document") ||
                            selectedRejectableRequirementIds.length === 0
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject Selected
                        </button>
                      </div>
                    )}
                  </div>
                )}

              <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left text-foreground">
                  <tr>
                    <th className="w-10 px-4 py-3 font-medium">
                      {documentSummary.status === "For Approval" &&
                        approvalSelectableRequirementIds.length > 0 && (
                          <input
                            type="checkbox"
                            checked={allVisibleRequirementsSelected}
                            onChange={toggleSelectAllRequirements}
                            className="h-4 w-4 rounded border-border"
                            aria-label="Select all pending approvals"
                          />
                        )}
                    </th>
                    <th className="px-4 py-3 font-medium">Requirement ID</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Approval</th>
                    <th className="px-4 py-3 font-medium">Comments</th>
                    <th className="px-4 py-3 font-medium">Logs</th>
                    {canViewChangeRequests && (
                      <th className="px-4 py-3 font-medium">Change Requests</th>
                    )}
                    <th className="px-4 py-3 font-medium">Date Modified</th>
                    <th className="w-72 px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {requirements.map((requirement) => {
                    const relatedChangeRequests = canViewChangeRequests
                      ? changeRequestsByRequirementId.get(requirement.id) || []
                      : []

                    const requirementDraftCount = relatedChangeRequests.filter(
                      (changeRequest) => changeRequest.status === "Draft"
                    ).length

                    const requirementImpactAnalysisRequestedCount = relatedChangeRequests.filter(
                      (changeRequest) =>
                        changeRequest.status === "Impact Analysis Requested" ||
                        changeRequest.status === "Submitted"
                    ).length

                    const requirementDecisionRequiredCount = relatedChangeRequests.filter(
                      (changeRequest) =>
                        changeRequest.status === "Stakeholder Review" &&
                        changeRequest.can_decide
                    ).length

                    const requirementSentToStakeholdersCount = relatedChangeRequests.filter(
                      (changeRequest) =>
                        changeRequest.status === "Stakeholder Review" &&
                        !changeRequest.can_decide
                    ).length

                    const requirementProceedCount = relatedChangeRequests.filter(
                      (changeRequest) => changeRequest.status === "Proceed"
                    ).length

                    const requirementDeclinedCount = relatedChangeRequests.filter(
                      (changeRequest) => changeRequest.status === "Declined"
                    ).length

                    const isApprovalSelectable =
                      documentSummary.status === "For Approval" &&
                      approvalSelectableRequirementIds.includes(requirement.id)

                    const approvalDecisionStatus = getApprovalDecisionStatus(
                      requirement.approval_summary
                    )
                    const approvalDecisionLabel = getApprovalDecisionLabel(
                      requirement.approval_summary
                    )

                    return (
                      <tr
                        key={requirement.id}
                        className="border-t border-border hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          {isApprovalSelectable ? (
                            <input
                              type="checkbox"
                              checked={selectedRequirementIds.includes(requirement.id)}
                              onChange={() => toggleRequirementSelection(requirement.id)}
                              className="h-4 w-4 rounded border-border"
                              aria-label={`Select ${requirement.requirement_code}`}
                            />
                          ) : null}
                        </td>

                        <td className="px-4 py-3 font-medium text-foreground">
                          {requirement.requirement_code}
                        </td>

                        <td className="px-4 py-3 text-foreground">
                          {requirement.title || "-"}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {requirement.priority || "-"}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {requirement.status || "-"}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {requirement.approval_summary?.submitted ? (
                            <div className="space-y-1">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getApprovalStatusClasses(
                                  approvalDecisionStatus
                                )}`}
                              >
                                {approvalDecisionLabel} · {requirement.approval_summary.approved_count}/
                                {requirement.approval_summary.total_required} approved
                              </span>
                              {requirement.approval_summary.pending_count > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {requirement.approval_summary.pending_count} pending
                                </p>
                              )}
                              {requirement.approval_summary.rejected_count > 0 && (
                                <p className="text-xs text-red-600">
                                  {requirement.approval_summary.rejected_count} rejection vote
                                  {requirement.approval_summary.rejected_count === 1 ? "" : "s"} recorded
                                </p>
                              )}
                            </div>
                          ) : (
                            "Not requested"
                          )}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {requirement.comment_count || 0}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => openChangeLogsModal(requirement)}
                            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
                          >
                            {requirement.change_log_count || 0} log
                            {(requirement.change_log_count || 0) === 1 ? "" : "s"}
                          </button>
                        </td>

                        {canViewChangeRequests && (
                          <td className="px-4 py-3 text-muted-foreground">
                            {relatedChangeRequests.length === 0 ? (
                              "-"
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                {requirementDraftCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openChangeRequestDetailsModal(requirement)
                                    }
                                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                                    title="View draft change request"
                                  >
                                    {requirementDraftCount} draft
                                  </button>
                                )}

                                {requirementImpactAnalysisRequestedCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openChangeRequestDetailsModal(requirement)
                                    }
                                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                    title="View change request waiting for impact analysis"
                                  >
                                    {requirementImpactAnalysisRequestedCount} impact analysis requested
                                  </button>
                                )}

                                {requirementDecisionRequiredCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openChangeRequestDetailsModal(requirement)
                                    }
                                    className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100"
                                    title="Stakeholder decision required for this change request"
                                  >
                                    {requirementDecisionRequiredCount} decision required
                                  </button>
                                )}

                                {requirementSentToStakeholdersCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openChangeRequestDetailsModal(requirement)
                                    }
                                    className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100"
                                    title="View change request sent to stakeholders"
                                  >
                                    {requirementSentToStakeholdersCount} sent to stakeholders
                                  </button>
                                )}

                                {requirementProceedCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openChangeRequestDetailsModal(requirement)
                                    }
                                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                                    title="View approved-to-proceed change request"
                                  >
                                    {requirementProceedCount} proceed
                                  </button>
                                )}

                                {requirementDeclinedCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openChangeRequestDetailsModal(requirement)
                                    }
                                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                                    title="View declined change request"
                                  >
                                    {requirementDeclinedCount} declined
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        )}

                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(requirement.updated_at)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openRequirementDetails(requirement.id)}
                              className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                              title="View Requirement"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openCommentsDrawer(requirement)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-foreground hover:bg-muted"
                              title="View comments"
                            >
                              <MessageSquare className="h-4 w-4" />
                              {requirement.comment_count &&
                                requirement.comment_count > 0 && (
                                  <span className="text-xs">
                                    {requirement.comment_count}
                                  </span>
                                )}
                            </button>

                            {canRequestChangeForDocument && (
                              <button
                                type="button"
                                onClick={() => openChangeRequestModal(requirement)}
                                disabled={requirementHasActiveChangeRequest(requirement.id)}
                                className="rounded-lg border border-border p-2 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                                title={getRequestChangeDisabledMessage(requirement.id)}
                              >
                                <ClipboardList className="h-4 w-4" />
                              </button>
                            )}

                            {canEditRequirement && (
                              <button
                                type="button"
                                onClick={() =>
                                  openEditRequirementModal(requirement.id)
                                }
                                disabled={isActionLoading(
                                  `load-requirement-${requirement.id}`
                                )}
                                className="rounded-lg border border-border p-2 text-foreground hover:bg-muted disabled:opacity-60"
                                title="Edit Requirement"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}

                            {canDeleteRequirement && (
                              <button
                                type="button"
                                onClick={() => setRequirementToDelete(requirement)}
                                className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                title="Delete Requirement"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {requirementModalOpen && template && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto max-w-4xl rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              {editingRequirementId ? "Edit Requirement" : "Create Requirement"}
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              This uses the dynamic template for the requirement itself.
            </p>

            <div className="mt-5">
              <DynamicTemplateForm
                template={template}
                values={requirementValues}
                openSections={openSections}
                onToggleSection={toggleSection}
                onChangeValue={handleRequirementChange}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRequirementModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isActionLoading("create-requirement") ||
                  Boolean(
                    editingRequirementId &&
                      isActionLoading(`save-requirement-${editingRequirementId}`)
                  )
                }
                onClick={saveRequirement}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {editingRequirementId
                  ? isActionLoading(`save-requirement-${editingRequirementId}`)
                    ? "Updating..."
                    : "Update Requirement"
                  : isActionLoading("create-requirement")
                    ? "Saving..."
                    : "Create Requirement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {changeRequestModalOpen && selectedRequirementForChange && canRequestChangeForDocument && (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Log Stakeholder Change Request
            </h3>

            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Selected Requirement
              </p>

              <p className="mt-1 font-semibold text-foreground">
                {selectedRequirementForChange.requirement_code} ·{" "}
                {selectedRequirementForChange.title || "Untitled Requirement"}
              </p>

              {selectedRequirementForChange.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedRequirementForChange.description}
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-foreground">
                  Stakeholder / Requester Name
                </span>
                <input
                  type="text"
                  value={changeRequestForm.requested_by_name}
                  onChange={(event) =>
                    handleChangeRequestFormChange(
                      "requested_by_name",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Enter stakeholder name"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-foreground">
                  Date Requested
                </span>
                <input
                  type="date"
                  value={changeRequestForm.requested_date}
                  onChange={(event) =>
                    handleChangeRequestFormChange(
                      "requested_date",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-foreground">
                  Change Type
                </span>
                <select
                  value={changeRequestForm.change_type}
                  onChange={(event) =>
                    handleChangeRequestFormChange("change_type", event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Modify">Modify</option>
                  <option value="Add">Add</option>
                  <option value="Remove">Remove</option>
                  <option value="Clarify">Clarify</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-foreground">
                  Priority
                </span>
                <select
                  value={changeRequestForm.priority}
                  onChange={(event) =>
                    handleChangeRequestFormChange("priority", event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-foreground">
                Intended Change
              </span>
              <textarea
                value={changeRequestForm.intended_change}
                onChange={(event) =>
                  handleChangeRequestFormChange(
                    "intended_change",
                    event.target.value
                  )
                }
                className="mt-2 min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Describe the intended change for this requirement."
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-foreground">
                Reason / Justification
              </span>
              <textarea
                value={changeRequestForm.reason}
                onChange={(event) =>
                  handleChangeRequestFormChange("reason", event.target.value)
                }
                className="mt-2 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Explain why this change is needed."
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-foreground">
                Remarks
              </span>
              <textarea
                value={changeRequestForm.remarks}
                onChange={(event) =>
                  handleChangeRequestFormChange("remarks", event.target.value)
                }
                className="mt-2 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Optional notes from the BA."
              />
            </label>

            <label className="mt-4 block rounded-xl border border-dashed border-border bg-background p-4">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Upload className="h-4 w-4" />
                Signed Change Request Form
              </span>

              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(event) =>
                  setSignedChangeRequestFile(event.target.files?.[0] || null)
                }
                className="mt-3 block w-full text-sm text-muted-foreground"
              />

              <p className="mt-2 text-xs text-muted-foreground">
                Upload the signed request form issued by the stakeholder. Accepted files: PDF, DOC, DOCX, PNG, JPG, JPEG.
              </p>
            </label>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeChangeRequestModal}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isActionLoading("save-change-request")}
                onClick={saveChangeRequestDraft}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {isActionLoading("save-change-request")
                  ? "Saving..."
                  : "Save Change Request Draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRequirementForChangeRequestDetails && canViewChangeRequests && (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Change Request Details
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedRequirementForChangeRequestDetails.requirement_code} ·{" "}
                  {selectedRequirementForChangeRequestDetails.title || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeChangeRequestDetailsModal}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {selectedRequirementChangeRequests.length === 0 ? (
                <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                  No change requests found for this requirement.
                </div>
              ) : (
                selectedRequirementChangeRequests.map((changeRequest) => (
                  <div
                    key={changeRequest.id}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getChangeRequestStatusClasses(
                            changeRequest.status
                          )}`}
                        >
                          {getChangeRequestStakeholderStatusLabel(changeRequest)}
                        </span>

                        <p className="mt-3 text-sm text-muted-foreground">
                          Requested by
                        </p>
                        <p className="font-medium text-foreground">
                          {changeRequest.requested_by_name || "-"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {changeRequest.status === "Stakeholder Review" &&
                          changeRequest.can_decide && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openChangeRequestDecisionModal(
                                    changeRequest,
                                    "Proceed"
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Proceed
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openChangeRequestDecisionModal(
                                    changeRequest,
                                    "Declined"
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" />
                                Decline
                              </button>
                            </>
                          )}

                        {changeRequest.can_upload_impact_analysis && (
                          <button
                            type="button"
                            onClick={() => openImpactAnalysisModal(changeRequest)}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                          >
                            <Upload className="h-4 w-4" />
                            Upload Impact Analysis
                          </button>
                        )}

                        {changeRequest.status === "Draft" &&
                          canRequestChange &&
                          changeRequest.can_delete !== false && (
                            <button
                              type="button"
                              onClick={() => deleteDraftChangeRequest(changeRequest)}
                              disabled={isActionLoading(
                                `delete-change-request-${changeRequest.id}`
                              )}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                              {isActionLoading(`delete-change-request-${changeRequest.id}`)
                                ? "Deleting..."
                                : "Delete Draft"}
                            </button>
                          )}
                      </div>
                    </div>

                    {(changeRequest.status === "Impact Analysis Requested" ||
                      changeRequest.status === "Submitted") &&
                      changeRequest.can_review_change_request &&
                      !changeRequest.can_upload_impact_analysis && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                          Review the logged change request for impact analysis. The impact analysis meeting/result is handled outside the system, and the requester/BA will upload the final result after it is ready.
                        </div>
                      )}

                    {(changeRequest.status === "Impact Analysis Requested" ||
                      changeRequest.status === "Submitted") &&
                      changeRequest.can_upload_impact_analysis && (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Upload the impact analysis result after the external impact analysis meeting is complete. Decision makers will be notified only after the result is uploaded.
                        </div>
                      )}

                    {changeRequest.status === "Stakeholder Review" && !changeRequest.can_decide &&
                      getCurrentReviewerDecisionLabel(changeRequest) && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                          {getCurrentReviewerDecisionLabel(changeRequest)}. The change request will remain open until all assigned stakeholders have submitted their decision.
                        </div>
                      )}

                    {changeRequest.review_summary &&
                      changeRequest.review_decisions &&
                      changeRequest.review_decisions.length > 0 && (
                      <div className="mt-4 rounded-lg border border-border bg-card p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Stakeholder decision progress
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {getChangeRequestReviewSummaryLabel(changeRequest)}
                            </p>
                          </div>

                          <div className="text-xs text-muted-foreground md:text-right">
                            <p>Stakeholder review days: {changeRequest.review_days || "-"}</p>
                            <p>Due: {formatDateTime(changeRequest.review_due_at)}</p>
                          </div>
                        </div>

                        {changeRequest.review_decisions &&
                          changeRequest.review_decisions.length > 0 && (
                            <div className="mt-4 overflow-hidden rounded-lg border border-border">
                              <table className="min-w-full text-sm">
                                <thead className="bg-muted/40 text-left text-foreground">
                                  <tr>
                                    <th className="px-4 py-3 font-medium">Stakeholder</th>
                                    <th className="px-4 py-3 font-medium">Decision</th>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Note</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {changeRequest.review_decisions.map((decision) => (
                                    <tr
                                      key={`${changeRequest.id}-${decision.user_id}`}
                                      className="border-t border-border align-top"
                                    >
                                      <td className="px-4 py-3">
                                        <p className="text-foreground">{decision.full_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {decision.email}
                                        </p>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span
                                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getChangeRequestStatusClasses(
                                            decision.status
                                          )}`}
                                        >
                                          {getChangeRequestDisplayStatus(decision.status)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-muted-foreground">
                                        {formatDateTime(decision.decided_at)}
                                      </td>
                                      <td className="max-w-xs whitespace-pre-wrap px-4 py-3 text-muted-foreground">
                                        {decision.note || "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                      </div>
                    )}

                    {changeRequest.impact_analysis_notes && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground">
                          Impact Analysis Notes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground">
                          {changeRequest.impact_analysis_notes}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Date Requested
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {formatDate(changeRequest.requested_date)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Change Type
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {changeRequest.change_type || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Priority
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {changeRequest.priority || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        Intended Change
                      </p>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground">
                        {changeRequest.intended_change || "-"}
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        Reason / Justification
                      </p>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground">
                        {changeRequest.reason || "-"}
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        Remarks
                      </p>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground">
                        {changeRequest.remarks || "-"}
                      </p>
                    </div>

                    {changeRequest.impact_analysis_notes && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground">
                          Impact Analysis Notes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground">
                          {changeRequest.impact_analysis_notes}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Signed Form
                        </p>

                        {changeRequest.stakeholder_form_filename &&
                        changeRequest.can_view_file !== false ? (
                          <button
                            type="button"
                            onClick={() => viewSignedChangeRequestFile(changeRequest)}
                            disabled={isActionLoading(
                              `view-change-request-file-${changeRequest.id}`
                            )}
                            className="mt-1 inline-flex max-w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
                          >
                            <Eye className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {isActionLoading(`view-change-request-file-${changeRequest.id}`)
                                ? "Opening..."
                                : changeRequest.stakeholder_form_filename}
                            </span>
                          </button>
                        ) : (
                          <p className="mt-1 text-sm text-foreground">-</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Impact Analysis Result
                        </p>

                        {changeRequest.impact_analysis_filename &&
                        changeRequest.can_view_file !== false ? (
                          <button
                            type="button"
                            onClick={() => viewImpactAnalysisFile(changeRequest)}
                            disabled={isActionLoading(
                              `view-impact-analysis-file-${changeRequest.id}`
                            )}
                            className="mt-1 inline-flex max-w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
                          >
                            <Eye className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {isActionLoading(`view-impact-analysis-file-${changeRequest.id}`)
                                ? "Opening..."
                                : changeRequest.impact_analysis_filename}
                            </span>
                          </button>
                        ) : (
                          <p className="mt-1 text-sm text-foreground">Not uploaded</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Sent for Impact Analysis At
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {changeRequest.submitted_at
                            ? formatDateTime(changeRequest.submitted_at)
                            : "Not sent for impact analysis"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {draftChangeRequestCount > 0 && canRequestChange && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSubmitChangeRequestsModalOpen(true)}
                  disabled={isActionLoading("submit-change-requests")}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {isActionLoading("submit-change-requests")
                    ? "Submitting..."
                    : "Send for Impact Analysis"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {requirementToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Delete Requirement
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {requirementToDelete.requirement_code}
              </span>
              ?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRequirementToDelete(null)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteRequirement}
                disabled={isActionLoading(`delete-requirement-${requirementToDelete.id}`)}
                className="rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90 disabled:opacity-60"
              >
                {isActionLoading(`delete-requirement-${requirementToDelete.id}`)
                  ? "Deleting..."
                  : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRequirementForLogs && (
        <div className="fixed inset-0 z-[85] overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto max-w-5xl rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Requirement Traceability Logs
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedRequirementForLogs.requirement_code} · {selectedRequirementForLogs.title || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedRequirementForLogs(null)
                  setChangeLogs([])
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {changeLogsLoading ? (
                <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                  Loading logs...
                </div>
              ) : changeLogs.length === 0 ? (
                <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                  No logs found for this requirement.
                </div>
              ) : (
                changeLogs.map((log) => {
                  const traceabilityChanges = buildRequirementTraceabilityChanges(
                    log,
                    requirementFieldLabelsByKey
                  )

                  return (
                    <div key={log.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex w-fit rounded-full border border-border px-3 py-1 text-xs font-medium capitalize text-foreground">
                            {log.action.replace(/_/g, " ")}
                          </span>

                          <span className="text-xs text-muted-foreground">
                            Action by: {getRequirementLogActorLabel(log)}
                          </span>
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-foreground">
                        {log.description || "No description provided."}
                      </p>

                      {traceabilityChanges.length > 0 ? (
                        <div className="mt-4 overflow-hidden rounded-lg border border-border">
                          <div className="border-b border-border bg-muted/40 px-4 py-3">
                            <p className="text-sm font-medium text-foreground">
                              Field-level traceability
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Shows the exact old value and new value recorded for this requirement.
                            </p>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-background text-left text-foreground">
                                <tr>
                                  <th className="px-4 py-3 font-medium">Field</th>
                                  <th className="px-4 py-3 font-medium">Change</th>
                                  <th className="px-4 py-3 font-medium">Before</th>
                                  <th className="px-4 py-3 font-medium">After</th>
                                </tr>
                              </thead>

                              <tbody>
                                {traceabilityChanges.map((change) => (
                                  <tr key={`${log.id}-${change.field_key}`} className="border-t border-border align-top">
                                    <td className="px-4 py-3 font-medium text-foreground">
                                      {change.field_label}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getTraceabilityChangeClasses(
                                          change.change_type
                                        )}`}
                                      >
                                        {change.change_type}
                                      </span>
                                    </td>
                                    <td className="max-w-xs whitespace-pre-wrap px-4 py-3 text-muted-foreground">
                                      {formatTraceabilityValue(change.before_value)}
                                    </td>
                                    <td className="max-w-xs whitespace-pre-wrap px-4 py-3 text-foreground">
                                      {formatTraceabilityValue(change.after_value)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                          No requirement field value changes were recorded for this action.
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {commentDrawerOpen && selectedRequirementForComments && (
        <div className="fixed inset-0 z-[85] bg-black/40">
          <div className="ml-auto flex h-full w-full max-w-lg flex-col bg-card shadow-xl ring-1 ring-border">
            <div className="border-b border-border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Requirement Comments
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedRequirementForComments.requirement_code} ·{" "}
                    {selectedRequirementForComments.title || "-"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCommentsDrawer}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {commentsLoading ? (
                <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                  Loading comments...
                </div>
              ) : comments.length === 0 ? (
                <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                  No comments yet.
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {comment.user?.full_name ||
                            comment.user?.email ||
                            "Unknown User"}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(comment.created_at)}
                        </p>
                      </div>

                      {comment.can_delete && (
                        <button
                          type="button"
                          onClick={() => deleteRequirementComment(comment)}
                          disabled={isActionLoading(`delete-comment-${comment.id}`)}
                          className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-60"
                          title="Delete comment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {comment.comment_text}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border p-5">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                placeholder="Write a comment about this requirement..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              />

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={saveRequirementComment}
                  disabled={isActionLoading("save-comment") || !newComment.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  <MessageSquare className="h-4 w-4" />
                  {isActionLoading("save-comment") ? "Saving..." : "Add Comment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {isSubmitChangeRequestsModalOpen && (
        <div className="fixed inset-0 z-[92] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Send Change Requests for Impact Analysis
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              This will notify only users with the change request review permission. They can review the logged request before the external impact analysis meeting. The requester/BA uploads the impact analysis result later.
            </p>

            <div className="mt-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              {draftChangeRequestCount} draft change request
              {draftChangeRequestCount === 1 ? "" : "s"} will be sent to the team for impact analysis.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSubmitChangeRequestsModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitChangeRequests}
                disabled={isActionLoading("submit-change-requests")}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {isActionLoading("submit-change-requests")
                  ? "Sending..."
                  : "Send for Impact Analysis"}
              </button>
            </div>
          </div>
        </div>
      )}

      {impactAnalysisModalOpen && selectedChangeRequestForImpactAnalysis && (
        <div className="fixed inset-0 z-[94] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Upload Impact Analysis Result
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Upload the impact analysis result after the team discussion. After upload, users with decision permission will be notified to decide whether the change request should proceed or be declined.
            </p>

            <label className="mt-4 block rounded-xl border border-dashed border-border bg-background p-4">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Upload className="h-4 w-4" />
                Impact Analysis Result File
              </span>

              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(event) => setImpactAnalysisFile(event.target.files?.[0] || null)}
                className="mt-3 block w-full text-sm text-muted-foreground"
              />

              <p className="mt-2 text-xs text-muted-foreground">
                Accepted files: PDF, DOC, DOCX, PNG, JPG, JPEG.
              </p>
            </label>

            <label className="mt-4 block text-sm font-medium text-foreground">
              Stakeholder review days
              <input
                type="number"
                min="1"
                value={stakeholderReviewDays}
                onChange={(event) => setStakeholderReviewDays(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-foreground">
              Impact analysis notes
              <textarea
                value={impactAnalysisNotes}
                onChange={(event) => setImpactAnalysisNotes(event.target.value)}
                rows={4}
                placeholder="Optional summary or notes from the impact analysis meeting..."
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeImpactAnalysisModal}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={uploadImpactAnalysis}
                disabled={
                  isActionLoading(
                    `upload-impact-analysis-${selectedChangeRequestForImpactAnalysis.id}`
                  ) || !impactAnalysisFile
                }
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {isActionLoading(
                  `upload-impact-analysis-${selectedChangeRequestForImpactAnalysis.id}`
                )
                  ? "Uploading..."
                  : "Upload and Notify Stakeholders"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isApprovalSummaryOpen &&
        approvalSummary && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
              <h3 className="text-lg font-semibold text-foreground">
                Approval Summary
              </h3>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Required
                  </p>
                  <p className="mt-1 text-foreground">
                    {approvalSummary.total_required}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Approved
                  </p>
                  <p className="mt-1 text-emerald-600">
                    {approvalSummary.approved_count}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Rejected
                  </p>
                  <p className="mt-1 text-red-600">
                    {approvalSummary.rejected_count}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending
                  </p>
                  <p className="mt-1 text-amber-600">
                    {approvalSummary.pending_count}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-foreground">Notes</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {approvalSummary.note || "-"}
                </p>
              </div>

              <div className="mt-5 space-y-4">
                {(approvalSummary.requirements || []).length === 0 ? (
                  <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                    No requirement approval details found.
                  </div>
                ) : (
                  (approvalSummary.requirements || []).map((requirementSummary) => {
                    const requirement = requirements.find(
                      (item) => item.id === requirementSummary.item_id
                    )
                    const approvalDecisionStatus = getApprovalDecisionStatus(
                      requirementSummary
                    )
                    const approvalDecisionLabel = getApprovalDecisionLabel(
                      requirementSummary
                    )

                    return (
                      <div
                        key={requirementSummary.item_id}
                        className="rounded-xl border border-border bg-background p-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {requirement?.requirement_code || `Requirement #${requirementSummary.item_id}`}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {requirement?.title || "-"}
                            </p>
                          </div>

                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${getApprovalStatusClasses(
                              approvalDecisionStatus
                            )}`}
                          >
                            {approvalDecisionLabel} · {requirementSummary.approved_count}/{requirementSummary.total_required} approved
                          </span>
                        </div>

                        <div className="mt-4 overflow-hidden rounded-lg border border-border">
                          <table className="min-w-full text-sm">
                            <thead className="bg-muted/40 text-left text-foreground">
                              <tr>
                                <th className="px-4 py-3 font-medium">Approver</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Due</th>
                                <th className="px-4 py-3 font-medium">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {requirementSummary.approvers.map((approver) => (
                                <tr key={approver.user_id} className="border-t border-border">
                                  <td className="px-4 py-3">
                                    <p className="text-foreground">{approver.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{approver.email}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getApprovalStatusClasses(
                                        approver.status
                                      )}`}
                                    >
                                      {approver.auto_approved_at ? "Auto Approved" : approver.status}
                                    </span>
                                    {approver.rejection_reason && (
                                      <p className="mt-1 text-xs text-red-600">
                                        Reason: {approver.rejection_reason}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {formatDateTime(approver.review_due_at)}
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {approver.approved_at
                                      ? formatDateTime(approver.approved_at)
                                      : approver.rejected_at
                                        ? formatDateTime(approver.rejected_at)
                                        : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsApprovalSummaryOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      {isSubmitApprovalModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              {isResubmittingRejectedRequirements
                ? "Resubmit Rejected Requirements for Approval"
                : "Submit All Requirements for Approval"}
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              {isResubmittingRejectedRequirements
                ? `This will resubmit only the ${submitApprovalRequirementCount} rejected requirement(s). Requirements that are already approved will stay approved and will not be sent for another approval cycle.`
                : "This will submit all requirements in this document. The submitter is excluded from approval voting. Enter how many days project members are allowed to review before pending votes are automatically approved."}
            </p>

            <label className="mt-4 block text-sm font-medium text-foreground">
              Review days
              <input
                type="number"
                min="1"
                value={reviewDays}
                onChange={(event) => setReviewDays(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSubmitApprovalModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitForApproval}
                disabled={isActionLoading("submit-approval")}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {isActionLoading("submit-approval")
                  ? "Submitting..."
                  : "Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Reject Selected Requirement(s)
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Add the reason why the selected requirement(s) need revision.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={5}
              placeholder="Enter rejection reason..."
              className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false)
                  setRejectionReason("")
                }}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={rejectDocument}
                disabled={isActionLoading("reject-document")}
                className="rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90 disabled:opacity-60"
              >
                {isActionLoading("reject-document")
                  ? "Rejecting..."
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {changeRequestDecisionTarget && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              {changeRequestDecision === "Proceed"
                ? "Proceed with Change Request"
                : "Decline Change Request"}
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              The requester will be notified after all assigned stakeholders have submitted their decision.
            </p>

            <label className="mt-4 block text-sm font-medium text-foreground">
              Decision note
              <textarea
                value={changeRequestDecisionNote}
                onChange={(event) =>
                  setChangeRequestDecisionNote(event.target.value)
                }
                rows={5}
                placeholder={
                  changeRequestDecision === "Proceed"
                    ? "Optional stakeholder decision note..."
                    : "Required reason why you are declining this change request..."
                }
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeChangeRequestDecisionModal}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={decideChangeRequest}
                disabled={isActionLoading(
                  `decide-change-request-${changeRequestDecisionTarget.id}`
                )}
                className={`rounded-lg px-4 py-2 text-white disabled:opacity-60 ${
                  changeRequestDecision === "Proceed"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-destructive hover:bg-destructive/90"
                }`}
              >
                {isActionLoading(
                  `decide-change-request-${changeRequestDecisionTarget.id}`
                )
                  ? "Saving..."
                  : changeRequestDecision === "Proceed"
                    ? "Confirm Proceed"
                    : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isVersionModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Create New Version
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              This document has been unfrozen. Choose whether the next editable
              version should be a minor or major update.
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => createNewVersion("minor")}
                disabled={isActionLoading("create-version-minor")}
                className="w-full rounded-lg border border-border px-4 py-3 text-left hover:bg-muted disabled:opacity-60"
              >
                <p className="font-medium text-foreground">
                  {isActionLoading("create-version-minor")
                    ? "Creating Minor Version..."
                    : "Minor Update"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Creates the next minor version, for example 1.0 to 1.1.
                </p>
              </button>

              <button
                type="button"
                onClick={() => createNewVersion("major")}
                disabled={isActionLoading("create-version-major")}
                className="w-full rounded-lg border border-border px-4 py-3 text-left hover:bg-muted disabled:opacity-60"
              >
                <p className="font-medium text-foreground">
                  {isActionLoading("create-version-major")
                    ? "Creating Major Version..."
                    : "Major Update"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Creates the next major version, for example 1.0 to 2.0.
                </p>
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
