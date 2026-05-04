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
  current_user_is_submitter: boolean
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
    approved_at?: string | null
    rejected_at?: string | null
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

type RequirementChangeRequest = {
  id: number
  project_id: number
  document_id: number
  item_id: number
  status: "Draft" | "Submitted" | string
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
  created_at?: string | null
  updated_at?: string | null
  can_delete?: boolean
  can_view_file?: boolean
  requirement?: RequirementItemSummary | null
  current_requirement_snapshot?: Partial<RequirementItemSummary> | null
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

function getChangeRequestStatusClasses(status: string) {
  switch (status) {
    case "Draft":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "Submitted":
      return "border-blue-200 bg-blue-50 text-blue-700"
    default:
      return "border-border bg-background text-muted-foreground"
  }
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
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false)
  const [selectedRequirementForComments, setSelectedRequirementForComments] =
    useState<RequirementItemSummary | null>(null)
  const [comments, setComments] = useState<RequirementComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState("")

  const [changeRequestModalOpen, setChangeRequestModalOpen] = useState(false)
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

  const draftChangeRequestCount = useMemo(() => {
    if (!canRequestChange) return 0

    return changeRequests.filter((changeRequest) => changeRequest.status === "Draft")
      .length
  }, [canRequestChange, changeRequests])

  const changeRequestsByRequirementId = useMemo(() => {
    const grouped = new Map<number, RequirementChangeRequest[]>()

    if (!canRequestChange) return grouped

    changeRequests.forEach((changeRequest) => {
      const current = grouped.get(changeRequest.item_id) || []
      current.push(changeRequest)
      grouped.set(changeRequest.item_id, current)
    })

    return grouped
  }, [canRequestChange, changeRequests])

  const selectedRequirementChangeRequests = useMemo(() => {
    if (!canRequestChange || !selectedRequirementForChangeRequestDetails) return []

    return (
      changeRequestsByRequirementId.get(
        selectedRequirementForChangeRequestDetails.id
      ) || []
    )
  }, [
    canRequestChange,
    changeRequestsByRequirementId,
    selectedRequirementForChangeRequestDetails,
  ])

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
      ] = await Promise.all([
        checkPermission("requirements.create"),
        checkPermission("requirements.edit"),
        checkPermission("requirements.delete"),
        checkPermission("requirements.submit_approval"),
        checkPermission("requirements.freeze"),
        checkPermission("requirements.request_change"),
      ])

      setCanCreateRequirements(createAllowed)
      setCanEditRequirements(editAllowed)
      setCanDeleteRequirements(deleteAllowed)
      setCanSubmitApproval(submitAllowed)
      setCanFreezeRequirements(freezeAllowed)
      setCanRequestChange(requestChangeAllowed)

      return {
        createAllowed,
        editAllowed,
        deleteAllowed,
        submitAllowed,
        freezeAllowed,
        requestChangeAllowed,
      }
    } finally {
      setPermissionLoading(false)
    }
  }

  const fetchChangeRequests = async (targetDocumentId?: number) => {
    if (!canRequestChange) {
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
    if (!documentSummary || !canRequestChange) return

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

      if (requestChangeAllowed) {
        await fetchChangeRequests(data.document_summary.id)
      } else {
        setChangeRequests([])
      }
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

      await fetchData(permissions.requestChangeAllowed)
    }

    loadPage()

    return () => {
      cancelled = true
    }
  }, [projectId, documentId])

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
    if (!canRequestChange) return

    setSelectedRequirementForChangeRequestDetails(requirement)
  }

  const closeChangeRequestDetailsModal = () => {
    setSelectedRequirementForChangeRequestDetails(null)
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

      const submittedAt = new Date().toISOString()

      setChangeRequests((prev) =>
        prev.map((changeRequest) =>
          changeRequest.status === "Draft"
            ? {
                ...changeRequest,
                status: "Submitted",
                submitted_at: submittedAt,
              }
            : changeRequest
        )
      )

      closeChangeRequestDetailsModal()

      setMessage(
        `${data.message || "Change requests submitted successfully"}. Submitted ${
          data.submitted_count ?? draftChangeRequestCount
        } change request(s) affecting ${
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

    try {
      setActionLoading("submit-approval")
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/submit-approval`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to submit for approval")
        return
      }

      setApprovalSummary(data.approval_summary || null)
      updateDocumentStatus("For Approval")
      setMessage(data.message || "Requirement document submitted for approval.")
    } catch (error) {
      console.error("Failed to submit for approval:", error)
      setMessage("Failed to submit for approval")
    } finally {
      setActionLoading(null)
    }
  }

  const approveDocument = async () => {
    if (!documentSummary) return

    try {
      setActionLoading("approve-document")
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/approve`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to approve document")
        return
      }

      setMessage(data.message || "Requirement document approved")
      setApprovalSummary(data.approval_summary || null)

      if (data.approval_summary?.is_fully_approved || data.document?.status === "Approved") {
        updateDocumentStatus("Approved")
      }
    } catch (error) {
      console.error("Failed to approve document:", error)
      setMessage("Failed to approve document")
    } finally {
      setActionLoading(null)
    }
  }

  const rejectDocument = async () => {
    if (!documentSummary) return

    try {
      setActionLoading("reject-document")
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/requirement-documents/${documentSummary.id}/reject`,
        {
          method: "POST",
          headers: createAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            reason: rejectionReason,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to reject document")
        return
      }

      setMessage(data.message || "Requirement document rejected")
      setApprovalSummary(data.approval_summary || null)
      setIsRejectModalOpen(false)
      setRejectionReason("")
      updateDocumentStatus("Rejected")
    } catch (error) {
      console.error("Failed to reject document:", error)
      setMessage("Failed to reject document")
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
                onClick={submitForApproval}
                disabled={isActionLoading("submit-approval")}
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
            approvalSummary?.current_user_is_submitter && (
              <button
                type="button"
                onClick={() => fetchApprovalSummary(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Eye className="h-4 w-4" />
                View Approval Summary
              </button>
            )}

          {documentSummary.status === "For Approval" &&
            approvalSummary?.current_user_can_approve && (
              <button
                type="button"
                onClick={approveDocument}
                disabled={isActionLoading("approve-document")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <CheckCircle className="h-4 w-4" />
                {isActionLoading("approve-document")
                  ? "Approving..."
                  : "Approve Requirements"}
              </button>
            )}

          {documentSummary.status === "For Approval" &&
            approvalSummary?.current_user_can_reject && (
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(true)}
                disabled={isActionLoading("reject-document")}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Reject Document
              </button>
            )}

          {documentSummary.status === "For Approval" &&
            approvalSummary?.current_user_has_approved && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                You already approved this requirements
              </span>
            )}

          {documentSummary.status === "For Approval" &&
            approvalSummary?.current_user_has_rejected && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                <XCircle className="h-4 w-4" />
                You already rejected this requirements
              </span>
            )}

          {documentSummary.status === "Approved" &&
            !permissionLoading &&
            canFreezeRequirements && (
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
              onClick={submitChangeRequests}
              disabled={isActionLoading("submit-change-requests")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isActionLoading("submit-change-requests")
                ? "Submitting..."
                : "Submit Change Requests"}
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
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <ClipboardList className="h-4 w-4" />
                  Request Change
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
                These requirements use the dynamic template.
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
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left text-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Requirement ID</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Comments</th>
                    {canRequestChange && (
                      <th className="px-4 py-3 font-medium">Change Requests</th>
                    )}
                    <th className="px-4 py-3 font-medium">Date Modified</th>
                    <th className="w-64 px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {requirements.map((requirement) => {
                    const relatedChangeRequests = canRequestChange
                      ? changeRequestsByRequirementId.get(requirement.id) || []
                      : []

                    const requirementDraftCount = relatedChangeRequests.filter(
                      (changeRequest) => changeRequest.status === "Draft"
                    ).length

                    const requirementSubmittedCount = relatedChangeRequests.filter(
                      (changeRequest) => changeRequest.status === "Submitted"
                    ).length

                    return (
                      <tr
                        key={requirement.id}
                        className="border-t border-border hover:bg-muted/30"
                      >
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
                          {requirement.comment_count || 0}
                        </td>

                        {canRequestChange && (
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

                                {requirementSubmittedCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openChangeRequestDetailsModal(requirement)
                                    }
                                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                    title="View submitted change request"
                                  >
                                    {requirementSubmittedCount} submitted
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
                                className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                                title="Request Change"
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

      {selectedRequirementForChangeRequestDetails && canRequestChange && (
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
                          {changeRequest.status}
                        </span>

                        <p className="mt-3 text-sm text-muted-foreground">
                          Requested by
                        </p>
                        <p className="font-medium text-foreground">
                          {changeRequest.requested_by_name || "-"}
                        </p>
                      </div>

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

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                          Submitted At
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {changeRequest.submitted_at
                            ? formatDateTime(changeRequest.submitted_at)
                            : "Not submitted"}
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
                  onClick={submitChangeRequests}
                  disabled={isActionLoading("submit-change-requests")}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {isActionLoading("submit-change-requests")
                    ? "Submitting..."
                    : "Submit Change Requests"}
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

      {isApprovalSummaryOpen &&
        approvalSummary &&
        approvalSummary.current_user_is_submitter && (
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

              <div className="mt-5 overflow-hidden rounded-xl border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40 text-left text-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Approver</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {approvalSummary.approvers.map((approver) => (
                      <tr
                        key={approver.user_id}
                        className="border-t border-border"
                      >
                        <td className="px-4 py-3 text-foreground">
                          {approver.full_name}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {approver.email}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getApprovalStatusClasses(
                              approver.status
                            )}`}
                          >
                            {approver.status}
                          </span>

                          {approver.rejection_reason && (
                            <p className="mt-1 text-xs text-red-600">
                              Reason: {approver.rejection_reason}
                            </p>
                          )}
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

      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Reject Requirement Document
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Add the reason why this requirements document needs revision.
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