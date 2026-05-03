"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CheckCircle,
  ChevronLeft,
  Eye,
  FileCheck,
  MessageSquare,
  Pencil,
  Plus,
  Snowflake,
  Trash2,
  Unlock,
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

const API_BASE_URL = "http://localhost:5000/api/business-analyst"
const ACCESS_API_BASE_URL = "http://localhost:5000/api/access"

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token")
  }

  return null
}

const createAuthHeaders = () => {
  const token = getAuthToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
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

  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [permissionLoading, setPermissionLoading] = useState(true)
  const [message, setMessage] = useState("")

  const [canCreateRequirements, setCanCreateRequirements] = useState(false)
  const [canEditRequirements, setCanEditRequirements] = useState(false)
  const [canDeleteRequirements, setCanDeleteRequirements] = useState(false)
  const [canSubmitApproval, setCanSubmitApproval] = useState(false)
  const [canFreezeRequirements, setCanFreezeRequirements] = useState(false)

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

  const canModify =
    documentSummary?.status === "Draft" || documentSummary?.status === "Rejected"

  const canAddRequirement = Boolean(canModify && canCreateRequirements)
  const canEditRequirement = Boolean(canModify && canEditRequirements)
  const canDeleteRequirement = Boolean(canModify && canDeleteRequirements)

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

  const fetchPermissions = async () => {
    try {
      setPermissionLoading(true)

      const [
        createAllowed,
        editAllowed,
        deleteAllowed,
        submitAllowed,
        freezeAllowed,
      ] = await Promise.all([
        checkPermission("requirements.create"),
        checkPermission("requirements.edit"),
        checkPermission("requirements.delete"),
        checkPermission("requirements.submit_approval"),
        checkPermission("requirements.freeze"),
      ])

      setCanCreateRequirements(createAllowed)
      setCanEditRequirements(editAllowed)
      setCanDeleteRequirements(deleteAllowed)
      setCanSubmitApproval(submitAllowed)
      setCanFreezeRequirements(freezeAllowed)
    } finally {
      setPermissionLoading(false)
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
      setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
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
    fetchPermissions()
    fetchData()
  }, [projectId, documentId])

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
      setLoading(true)

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
      setLoading(false)
    }
  }

  const openRequirementDetails = async (requirementId: number) => {
    if (!template || !documentSummary) return

    try {
      setLoading(true)
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
    } finally {
      setLoading(false)
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

    try {
      setLoading(true)
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

      setRequirementModalOpen(false)
      setEditingRequirementId(null)
      setSelectedRequirementDetails(null)

      await fetchData()
    } catch (error) {
      console.error("Failed to save requirement:", error)
      setMessage(
        error instanceof Error ? error.message : "Failed to save requirement."
      )
    } finally {
      setLoading(false)
    }
  }

  const confirmDeleteRequirement = async () => {
    if (!documentSummary || !requirementToDelete) return

    if (!canDeleteRequirement) {
      setMessage("You don't have permission to delete requirements.")
      return
    }

    try {
      setLoading(true)
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

      setRequirementToDelete(null)
      setSelectedRequirementDetails(null)

      await fetchData()
    } catch (error) {
      console.error("Failed to delete requirement:", error)
      setMessage("Failed to delete requirement")
    } finally {
      setLoading(false)
    }
  }

  const submitForApproval = async () => {
    if (!documentSummary) return

    if (!canSubmitApproval) {
      setMessage("You don't have permission to submit requirements for approval.")
      return
    }

    try {
      setLoading(true)
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

      await fetchData()
    } catch (error) {
      console.error("Failed to submit for approval:", error)
      setMessage("Failed to submit for approval")
    } finally {
      setLoading(false)
    }
  }

  const approveDocument = async () => {
    if (!documentSummary) return

    try {
      setLoading(true)
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

      await fetchData()
    } catch (error) {
      console.error("Failed to approve document:", error)
      setMessage("Failed to approve document")
    } finally {
      setLoading(false)
    }
  }

  const rejectDocument = async () => {
    if (!documentSummary) return

    try {
      setLoading(true)
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

      await fetchData()
    } catch (error) {
      console.error("Failed to reject document:", error)
      setMessage("Failed to reject document")
    } finally {
      setLoading(false)
    }
  }

  const freezeDocument = async () => {
    if (!documentSummary) return

    if (!canFreezeRequirements) {
      setMessage("You don't have permission to freeze requirements.")
      return
    }

    try {
      setLoading(true)
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

      setMessage(data.message || "Requirement document frozen successfully")
      await fetchData()
    } catch (error) {
      console.error("Failed to freeze document:", error)
      setMessage("Failed to freeze document")
    } finally {
      setLoading(false)
    }
  }

  const unfreezeDocument = async () => {
    if (!documentSummary) return

    if (!canFreezeRequirements) {
      setMessage("You don't have permission to unfreeze requirements.")
      return
    }

    try {
      setLoading(true)
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

      setMessage(data.message || "Requirement document unfrozen successfully")
      await fetchData()
    } catch (error) {
      console.error("Failed to unfreeze document:", error)
      setMessage("Failed to unfreeze document")
    } finally {
      setLoading(false)
    }
  }

  const createNewVersion = async (changeType: "minor" | "major") => {
    if (!documentSummary) return

    if (!canEditRequirements) {
      setMessage("You don't have permission to create a new requirement version.")
      return
    }

    try {
      setLoading(true)
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
      setLoading(false)
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
      setLoading(true)
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

      setNewComment("")

      await fetchRequirementComments(selectedRequirementForComments.id)
      await fetchData()
    } catch (error) {
      console.error("Failed to add comment:", error)
      setMessage("Failed to add comment")
    } finally {
      setLoading(false)
    }
  }

  const deleteRequirementComment = async (comment: RequirementComment) => {
    if (!documentSummary || !selectedRequirementForComments) return

    try {
      setLoading(true)
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

      await fetchRequirementComments(selectedRequirementForComments.id)
      await fetchData()
    } catch (error) {
      console.error("Failed to delete comment:", error)
      setMessage("Failed to delete comment")
    } finally {
      setLoading(false)
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

  if (fetching) {
    return (
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading requirement document...
        </div>
      </section>
    )
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

        <div className="mt-6 flex flex-wrap gap-2">
          {(documentSummary.status === "Draft" ||
            documentSummary.status === "Rejected") &&
            !permissionLoading &&
            canSubmitApproval && (
              <button
                type="button"
                onClick={submitForApproval}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <FileCheck className="h-4 w-4" />
                {documentSummary.status === "Rejected"
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
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <CheckCircle className="h-4 w-4" />
                Approve Document
              </button>
            )}

          {documentSummary.status === "For Approval" &&
            approvalSummary?.current_user_can_reject && (
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(true)}
                disabled={loading}
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
                You already approved this document
              </span>
            )}

          {documentSummary.status === "For Approval" &&
            approvalSummary?.current_user_has_rejected && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                <XCircle className="h-4 w-4" />
                You already rejected this document
              </span>
            )}

          {documentSummary.status === "Approved" &&
            !permissionLoading &&
            canFreezeRequirements && (
              <button
                type="button"
                onClick={freezeDocument}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Snowflake className="h-4 w-4" />
                Freeze Document
              </button>
            )}

          {documentSummary.status === "Frozen" &&
            !permissionLoading &&
            canFreezeRequirements && (
              <button
                type="button"
                onClick={unfreezeDocument}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Unlock className="h-4 w-4" />
                Unfreeze Document
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

              {canEditRequirement && (
                <button
                  type="button"
                  onClick={() =>
                    openEditRequirementModal(selectedRequirementDetails.summary.id)
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
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
                    <th className="px-4 py-3 font-medium">Date Modified</th>
                    <th className="w-52 px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {requirements.map((requirement) => (
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

                          {canEditRequirement && (
                            <button
                              type="button"
                              onClick={() =>
                                openEditRequirementModal(requirement.id)
                              }
                              className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
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
                  ))}
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
                disabled={loading}
                onClick={saveRequirement}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {loading
                  ? "Saving..."
                  : editingRequirementId
                    ? "Update Requirement"
                    : "Create Requirement"}
              </button>
            </div>
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
                disabled={loading}
                className="rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90 disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Confirm Delete"}
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
                          disabled={loading}
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
                  disabled={loading || !newComment.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  <MessageSquare className="h-4 w-4" />
                  {loading ? "Saving..." : "Add Comment"}
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
                disabled={loading}
                className="rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90 disabled:opacity-60"
              >
                {loading ? "Rejecting..." : "Confirm Reject"}
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
                disabled={loading}
                className="w-full rounded-lg border border-border px-4 py-3 text-left hover:bg-muted disabled:opacity-60"
              >
                <p className="font-medium text-foreground">Minor Update</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Creates the next minor version, for example 1.0 to 1.1.
                </p>
              </button>

              <button
                type="button"
                onClick={() => createNewVersion("major")}
                disabled={loading}
                className="w-full rounded-lg border border-border px-4 py-3 text-left hover:bg-muted disabled:opacity-60"
              >
                <p className="font-medium text-foreground">Major Update</p>
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