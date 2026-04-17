"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import RequirementsTabContent from "@/components/projects/requirements-tab-content"
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react"
import usePermissions from "@/features/access/use-permissions"

type Project = {
  id: number
  name: string
  description: string
  status: string
  start_date?: string | null
  end_date?: string | null
  organization_id: number
  organization_name?: string | null
  created_at?: string
  updated_at?: string
}

type ProjectForm = {
  name: string
  description: string
  start_date: string
  end_date: string
  status: string
}

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

type ProjectDocumentValue = {
  id: number
  document_id: number
  template_field_id: number
  value_text: string
  created_at?: string
  updated_at?: string
}

type ProjectDocument = {
  id: number
  project_id: number
  template_id: number
  version: string
  status: string
  created_by?: number | null
  created_at: string
  updated_at: string
  values?: ProjectDocumentValue[]
}

type VersionIncrementType = "minor" | "major"

type DocumentContextResponse = {
  document: ProjectDocument
  template: DocumentTemplate | null
  latest_default_template: DocumentTemplate | null
  has_template_update: boolean
}

type TemplateSwitchPreview = {
  values: Array<{
    template_field_id: number
    value_text: string
    field_key: string
    field_label: string
    is_transferred: boolean
  }>
  transferred_count: number
  unmatched_old_fields: string[]
  new_empty_fields: Array<{
    field_key: string
    field_label: string
  }>
}

const API_BASE_URL = "http://localhost:5000/api/business-analyst"
const TEMPLATE_API_BASE_URL = "http://localhost:5000/api/templates"

function getStatusClasses(status: string) {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200"
    case "In Progress":
      return "bg-amber-100 text-amber-700 ring-amber-200"
    case "Pending":
      return "bg-slate-100 text-slate-700 ring-slate-200"
    case "Archived":
      return "bg-red-100 text-red-700 ring-red-200"
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200"
  }
}

function normalizeVersion(version: string) {
  return version.replace(/^v/i, "").trim()
}

function parseVersion(version: string) {
  const clean = normalizeVersion(version)
  const [majorStr, minorStr] = clean.split(".")
  const major = Number(majorStr || 1)
  const minor = Number(minorStr || 0)

  return {
    major: Number.isNaN(major) ? 1 : major,
    minor: Number.isNaN(minor) ? 0 : minor,
  }
}

function compareVersions(a: string, b: string) {
  const va = parseVersion(a)
  const vb = parseVersion(b)

  if (va.major !== vb.major) return vb.major - va.major
  return vb.minor - va.minor
}

function getNextMinorVersion(version: string) {
  const { major, minor } = parseVersion(version)
  return `${major}.${minor + 1}`
}

function getNextMajorVersion(version: string) {
  const { major } = parseVersion(version)
  return `${major + 1}.0`
}

function parseOptions(optionsJson?: string | null): string[] {
  if (!optionsJson) return []
  try {
    const parsed = JSON.parse(optionsJson)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item))
    }
    return []
  } catch {
    return []
  }
}

export default function ProjectDetailsPageView() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = Number(params.id)

  const initialTab = searchParams.get("tab")
  const { loading: permissionsLoading, hasPermission } = usePermissions()

  const canViewProject = hasPermission("project.view")
  const canEditProject = hasPermission("project.edit")

  const canViewVisionScope = hasPermission("vision_scope.view")
  const canCreateVisionScope = hasPermission("vision_scope.create")
  const canEditVisionScope = hasPermission("vision_scope.edit")
  const canDeleteVisionScope = hasPermission("vision_scope.delete")

  const canViewRequirements = hasPermission("requirements.view")

  const [project, setProject] = useState<Project | null>(null)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState<
    "overview" | "stakeholders" | "vision-scope" | "requirements"
  >(
    initialTab === "vision-scope"
      ? "vision-scope"
      : initialTab === "stakeholders"
        ? "stakeholders"
        : initialTab === "requirements"
          ? "requirements"
          : "overview"
  )
  const [isEditMode, setIsEditMode] = useState(false)

  const [projectForm, setProjectForm] = useState<ProjectForm>({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "Pending",
  })

  const [defaultVisionScopeTemplate, setDefaultVisionScopeTemplate] = useState<DocumentTemplate | null>(null)
  const [visionScopeTemplate, setVisionScopeTemplate] = useState<DocumentTemplate | null>(null)
  const [visionScopeTemplateLoading, setVisionScopeTemplateLoading] = useState(false)
  const [visionScopeDocuments, setVisionScopeDocuments] = useState<ProjectDocument[]>([])
  const [selectedVisionScopeIds, setSelectedVisionScopeIds] = useState<number[]>([])
  const [visionScopeToDelete, setVisionScopeToDelete] = useState<ProjectDocument | null>(null)
  const [isVisionScopeFormOpen, setIsVisionScopeFormOpen] = useState(false)
  const [isSaveVisionScopeVersionModalOpen, setIsSaveVisionScopeVersionModalOpen] = useState(false)
  const [visionScopeValues, setVisionScopeValues] = useState<Record<string, string>>({})
  const [editingVisionScope, setEditingVisionScope] = useState<ProjectDocument | null>(null)
  const [baseVisionScopeDocument, setBaseVisionScopeDocument] = useState<ProjectDocument | null>(null)
  const [openVisionScopeSections, setOpenVisionScopeSections] = useState<Record<number, boolean>>({})

  const [isTemplateSwitchModalOpen, setIsTemplateSwitchModalOpen] = useState(false)
  const [templateSwitchSourceTemplate, setTemplateSwitchSourceTemplate] = useState<DocumentTemplate | null>(null)
  const [templateSwitchTargetTemplate, setTemplateSwitchTargetTemplate] = useState<DocumentTemplate | null>(null)
  const [templateSwitchPreview, setTemplateSwitchPreview] = useState<TemplateSwitchPreview | null>(null)

  const draftVisionScope = useMemo(
    () => visionScopeDocuments.find((doc) => doc.status === "Draft") || null,
    [visionScopeDocuments]
  )

  const publishedVisionScopes = useMemo(
    () =>
      [...visionScopeDocuments]
        .filter((doc) => doc.status !== "Draft")
        .sort((a, b) => compareVersions(a.version, b.version)),
    [visionScopeDocuments]
  )

  const latestVisionScope = useMemo(
    () => publishedVisionScopes[0] || null,
    [publishedVisionScopes]
  )

  const previousVisionScopes = useMemo(
    () => publishedVisionScopes.slice(1),
    [publishedVisionScopes]
  )

  const getFieldValueFromDocument = (
    document: ProjectDocument,
    fieldId: number
  ) => {
    const value = document.values?.find((item) => item.template_field_id === fieldId)
    return value?.value_text || ""
  }

  const buildValuesFromDocument = (
    document: ProjectDocument,
    template: DocumentTemplate | null
  ) => {
    const values: Record<string, string> = {}

    if (!template) return values

    template.sections.forEach((section) => {
      section.fields.forEach((field) => {
        values[field.key] = getFieldValueFromDocument(document, field.id)
      })
    })

    return values
  }

  const buildValuesFromTemplateDefaults = (template: DocumentTemplate | null) => {
    const values: Record<string, string> = {}

    if (!template) return values

    template.sections.forEach((section) => {
      section.fields.forEach((field) => {
        values[field.key] = field.default_value || ""
      })
    })

    return values
  }

  const buildValuesFromSwitchPreview = (
    template: DocumentTemplate,
    preview: TemplateSwitchPreview
  ) => {
    const previewByFieldId = new Map(
      preview.values.map((item) => [item.template_field_id, item.value_text])
    )

    const values: Record<string, string> = {}

    template.sections.forEach((section) => {
      section.fields.forEach((field) => {
        values[field.key] = previewByFieldId.get(field.id) || field.default_value || ""
      })
    })

    return values
  }

  const resetOpenSections = (
    template: DocumentTemplate | null,
    setter: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  ) => {
    if (!template) return
    const initialOpenSections: Record<number, boolean> = {}
    template.sections.forEach((section) => {
      initialOpenSections[section.id] = true
    })
    setter(initialOpenSections)
  }

  const fetchProject = async () => {
    try {
      setFetching(true)
      setMessage("")

      const res = await fetch(`${API_BASE_URL}/project/${projectId}`, {
        method: "GET",
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to fetch project")
        return
      }

      setProject(data.project)
      setProjectForm({
        name: data.project.name || "",
        description: data.project.description || "",
        start_date: data.project.start_date || "",
        end_date: data.project.end_date || "",
        status: data.project.status || "Pending",
      })
    } catch (error) {
      console.error("Failed to fetch project:", error)
      setMessage("Failed to fetch project")
    } finally {
      setFetching(false)
    }
  }

  const fetchVisionScopeTemplate = async () => {
    try {
      setVisionScopeTemplateLoading(true)

      const res = await fetch(`${TEMPLATE_API_BASE_URL}/vision_scope/default`, {
        method: "GET",
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to fetch Vision & Scope template")
        return
      }

      const fetchedTemplate: DocumentTemplate = data.template
      setDefaultVisionScopeTemplate(fetchedTemplate)

      if (!visionScopeTemplate) {
        setVisionScopeTemplate(fetchedTemplate)
        resetOpenSections(fetchedTemplate, setOpenVisionScopeSections)
      }
    } catch (error) {
      console.error("Failed to fetch Vision & Scope template:", error)
      setMessage("Failed to fetch Vision & Scope template")
    } finally {
      setVisionScopeTemplateLoading(false)
    }
  }

  const fetchVisionScopeDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/project/${projectId}/vision-scope/documents`, {
        method: "GET",
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to fetch Vision & Scope documents")
        return
      }

      setVisionScopeDocuments(data.documents || [])
    } catch (error) {
      console.error("Failed to fetch Vision & Scope documents:", error)
      setMessage("Failed to fetch Vision & Scope documents")
    }
  }

  useEffect(() => {
    if (!permissionsLoading && canViewProject && projectId) {
      fetchProject()
    } else if (!permissionsLoading && !canViewProject) {
      setFetching(false)
    }
  }, [permissionsLoading, canViewProject, projectId])

  useEffect(() => {
    if (!permissionsLoading && canViewVisionScope && projectId) {
      fetchVisionScopeTemplate()
      fetchVisionScopeDocuments()
    }
  }, [permissionsLoading, canViewVisionScope, projectId])

  const handleProjectChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setProjectForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleDynamicVisionScopeChange = (fieldKey: string, value: string) => {
    setVisionScopeValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const res = await fetch(`${API_BASE_URL}/project/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: projectForm.name,
          description: projectForm.description,
          start_date: projectForm.start_date || null,
          end_date: projectForm.end_date || null,
          status: projectForm.status,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to update project")
        return
      }

      setMessage(data.message || "Project updated successfully")
      setIsEditMode(false)
      await fetchProject()
    } catch (error) {
      console.error("Failed to update project:", error)
      setMessage("Failed to update project")
    } finally {
      setLoading(false)
    }
  }

  const openFormWithTemplate = (
    template: DocumentTemplate,
    values: Record<string, string>,
    baseDocument: ProjectDocument | null,
    editingDocument: ProjectDocument | null
  ) => {
    setVisionScopeTemplate(template)
    setVisionScopeValues(values)
    setBaseVisionScopeDocument(baseDocument)
    setEditingVisionScope(editingDocument)
    setIsVisionScopeFormOpen(true)
    setIsSaveVisionScopeVersionModalOpen(false)
    resetOpenSections(template, setOpenVisionScopeSections)
    setMessage("")
  }

  const openCreateVisionScopeForm = async () => {
    if ((!canCreateVisionScope && !canEditVisionScope) || !defaultVisionScopeTemplate) return

    setMessage("")

    if (draftVisionScope) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/project/${projectId}/vision-scope/documents/${draftVisionScope.id}`,
          {
            method: "GET",
            credentials: "include",
          }
        )

        const data: DocumentContextResponse = await res.json()

        if (!res.ok || !data.template) {
          setMessage((data as any).message || "Failed to load draft document")
          return
        }

        openFormWithTemplate(
          data.template,
          buildValuesFromDocument(data.document, data.template),
          data.document,
          data.document
        )
      } catch (error) {
        console.error("Failed to load draft document:", error)
        setMessage("Failed to load draft document")
      }
      return
    }

    if (!latestVisionScope) {
      openFormWithTemplate(
        defaultVisionScopeTemplate,
        buildValuesFromTemplateDefaults(defaultVisionScopeTemplate),
        null,
        null
      )
      return
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/vision-scope/documents/${latestVisionScope.id}`,
        {
          method: "GET",
          credentials: "include",
        }
      )

      const data: DocumentContextResponse = await res.json()

      if (!res.ok || !data.template) {
        setMessage((data as any).message || "Failed to load latest Vision & Scope")
        return
      }

      if (
        data.has_template_update &&
        data.latest_default_template &&
        data.template.id !== data.latest_default_template.id
      ) {
        const previewRes = await fetch(
          `${API_BASE_URL}/project/${projectId}/vision-scope/documents/${latestVisionScope.id}/template-switch-preview?target_template_id=${data.latest_default_template.id}`,
          {
            method: "GET",
            credentials: "include",
          }
        )

        const previewData = await previewRes.json()

        if (!previewRes.ok) {
          setMessage(previewData.message || "Failed to load template switch preview")
          return
        }

        setBaseVisionScopeDocument(data.document)
        setTemplateSwitchSourceTemplate(data.template)
        setTemplateSwitchTargetTemplate(data.latest_default_template)
        setTemplateSwitchPreview(previewData.preview)
        setIsTemplateSwitchModalOpen(true)
        return
      }

      openFormWithTemplate(
        data.template,
        buildValuesFromDocument(data.document, data.template),
        data.document,
        null
      )
    } catch (error) {
      console.error("Failed to prepare Vision & Scope form:", error)
      setMessage("Failed to prepare Vision & Scope form")
    }
  }

  const openEditVisionScopeForm = async (document: ProjectDocument) => {
    if (!canEditVisionScope) return

    try {
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/vision-scope/documents/${document.id}`,
        {
          method: "GET",
          credentials: "include",
        }
      )

      const data: DocumentContextResponse = await res.json()

      if (!res.ok || !data.template) {
        setMessage((data as any).message || "Failed to load document")
        return
      }

      openFormWithTemplate(
        data.template,
        buildValuesFromDocument(data.document, data.template),
        data.document,
        data.document.status === "Draft" ? data.document : null
      )
    } catch (error) {
      console.error("Failed to load document:", error)
      setMessage("Failed to load document")
    }
  }

  const handleKeepCurrentTemplate = () => {
    if (!templateSwitchSourceTemplate || !baseVisionScopeDocument) return

    openFormWithTemplate(
      templateSwitchSourceTemplate,
      buildValuesFromDocument(baseVisionScopeDocument, templateSwitchSourceTemplate),
      baseVisionScopeDocument,
      null
    )

    setIsTemplateSwitchModalOpen(false)
    setTemplateSwitchSourceTemplate(null)
    setTemplateSwitchTargetTemplate(null)
    setTemplateSwitchPreview(null)
  }

  const handleSwitchToLatestTemplate = () => {
    if (!templateSwitchTargetTemplate || !templateSwitchPreview || !baseVisionScopeDocument) return

    const transferredValues = buildValuesFromSwitchPreview(
      templateSwitchTargetTemplate,
      templateSwitchPreview
    )

    openFormWithTemplate(
      templateSwitchTargetTemplate,
      transferredValues,
      baseVisionScopeDocument,
      null
    )

    setIsTemplateSwitchModalOpen(false)
    setTemplateSwitchSourceTemplate(null)
    setTemplateSwitchTargetTemplate(null)
    setTemplateSwitchPreview(null)
  }

  const closeCreateVisionScopeForm = () => {
    setVisionScopeValues({})
    setEditingVisionScope(null)
    setBaseVisionScopeDocument(null)
    setIsVisionScopeFormOpen(false)
    setIsSaveVisionScopeVersionModalOpen(false)
  }

  const buildCurrentTemplateValuesPayload = () => {
    if (!visionScopeTemplate) return []

    return visionScopeTemplate.sections.flatMap((section) =>
      section.fields.map((field) => ({
        template_field_id: field.id,
        value_text: visionScopeValues[field.key] || "",
      }))
    )
  }

  const saveVisionScopeDraft = async () => {
    if (!visionScopeTemplate) {
      setMessage("Template not found")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const valuesPayload = buildCurrentTemplateValuesPayload()

      if (editingVisionScope?.status === "Draft") {
        const res = await fetch(
          `${API_BASE_URL}/project/${projectId}/vision-scope/documents/${editingVisionScope.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              template_id: visionScopeTemplate.id,
              status: "Draft",
              values: valuesPayload,
            }),
          }
        )

        const data = await res.json()

        if (!res.ok) {
          setMessage(data.message || "Failed to save draft")
          return
        }

        setMessage(data.message || "Draft updated successfully")
      } else {
        const res = await fetch(`${API_BASE_URL}/project/${projectId}/vision-scope/documents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            template_id: visionScopeTemplate.id,
            version: "Draft",
            status: "Draft",
            based_on_document_id: baseVisionScopeDocument?.id || null,
            values: valuesPayload,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setMessage(data.message || "Failed to save draft")
          return
        }

        setMessage(data.message || "Draft saved successfully")
      }

      closeCreateVisionScopeForm()
      await fetchVisionScopeDocuments()
    } catch (error) {
      console.error("Failed to save draft:", error)
      setMessage("Failed to save draft")
    } finally {
      setLoading(false)
    }
  }

  const saveVisionScopeVersion = async (incrementType: VersionIncrementType) => {
    if (!visionScopeTemplate) {
      setMessage("Template not found")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const baseVersion = latestVisionScope?.version || "1.0"

      const templateChanged =
        !!baseVisionScopeDocument && baseVisionScopeDocument.template_id !== visionScopeTemplate.id

      let computedVersion = "1.0"

      if (!latestVisionScope) {
        computedVersion = "1.0"
      } else if (templateChanged) {
        computedVersion = getNextMajorVersion(baseVersion)
      } else {
        computedVersion =
          incrementType === "major"
            ? getNextMajorVersion(baseVersion)
            : getNextMinorVersion(baseVersion)
      }

      const valuesPayload = buildCurrentTemplateValuesPayload()

      if (editingVisionScope?.status === "Draft") {
        const res = await fetch(
          `${API_BASE_URL}/project/${projectId}/vision-scope/documents/${editingVisionScope.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              template_id: visionScopeTemplate.id,
              version: computedVersion,
              status: "Published",
              values: valuesPayload,
            }),
          }
        )

        const data = await res.json()

        if (!res.ok) {
          setMessage(data.message || "Failed to publish version")
          return
        }

        setMessage(data.message || `Vision & Scope published as version ${computedVersion}`)
      } else {
        const res = await fetch(`${API_BASE_URL}/project/${projectId}/vision-scope/documents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            template_id: visionScopeTemplate.id,
            version: computedVersion,
            status: "Published",
            based_on_document_id: baseVisionScopeDocument?.id || latestVisionScope?.id || null,
            values: valuesPayload,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setMessage(data.message || "Failed to save Vision & Scope version")
          return
        }

        setMessage(
          data.message ||
            (!latestVisionScope
              ? "Initial Vision & Scope version created successfully"
              : `Vision & Scope saved as version ${computedVersion}`)
        )
      }

      setIsSaveVisionScopeVersionModalOpen(false)
      closeCreateVisionScopeForm()
      await fetchVisionScopeDocuments()
    } catch (error) {
      console.error("Failed to save vision & scope version:", error)
      setMessage("Failed to save vision & scope version")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenVisionScopePublishModal = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!visionScopeTemplate) {
      setMessage("Template not found")
      return
    }

    if (!latestVisionScope) {
      await saveVisionScopeVersion("minor")
      return
    }

    setIsSaveVisionScopeVersionModalOpen(true)
  }

  const toggleVisionScopeSelection = (id: number) => {
    setSelectedVisionScopeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAllVisionScopes = () => {
    if (
      previousVisionScopes.length > 0 &&
      selectedVisionScopeIds.length === previousVisionScopes.length
    ) {
      setSelectedVisionScopeIds([])
      return
    }

    setSelectedVisionScopeIds(previousVisionScopes.map((doc) => doc.id))
  }

  const confirmDeleteVisionScope = async () => {
    if (!visionScopeToDelete) return

    try {
      setLoading(true)
      setMessage("")

      const res = await fetch(
        `${API_BASE_URL}/project/${projectId}/vision-scope/documents/${visionScopeToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Failed to delete Vision & Scope version")
        return
      }

      const deletedId = visionScopeToDelete.id

      setVisionScopeToDelete(null)
      setSelectedVisionScopeIds((prev) => prev.filter((id) => id !== deletedId))
      setMessage(data.message || "Vision & Scope version deleted successfully")
      await fetchVisionScopeDocuments()
    } catch (error) {
      console.error("Failed to delete vision & scope:", error)
      setMessage("Failed to delete vision & scope")
    } finally {
      setLoading(false)
    }
  }

  const toggleVisionScopeSection = (sectionId: number) => {
    setOpenVisionScopeSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const renderDynamicField = (
    field: TemplateField,
    value: string,
    onChangeValue: (fieldKey: string, value: string) => void
  ) => {
    const commonClassName =
      "w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"

    switch (field.field_type) {
      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => onChangeValue(field.key, e.target.value)}
            rows={4}
            placeholder={field.placeholder || ""}
            className={commonClassName}
            required={field.is_required}
          />
        )

      case "select": {
        const options = parseOptions(field.options_json)
        return (
          <select
            value={value}
            onChange={(e) => onChangeValue(field.key, e.target.value)}
            className={commonClassName}
            required={field.is_required}
          >
            <option value="">Select an option</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )
      }

      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChangeValue(field.key, e.target.value)}
            placeholder={field.placeholder || ""}
            className={commonClassName}
            required={field.is_required}
          />
        )

      case "date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChangeValue(field.key, e.target.value)}
            className={commonClassName}
            required={field.is_required}
          />
        )

      case "checkbox":
        return (
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={value === "true"}
              onChange={(e) => onChangeValue(field.key, e.target.checked ? "true" : "false")}
            />
            {field.placeholder || field.label}
          </label>
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChangeValue(field.key, e.target.value)}
            placeholder={field.placeholder || ""}
            className={commonClassName}
            required={field.is_required}
          />
        )
    }
  }

  const SectionToggleIcon = ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />

  const tabButtonClasses = (tab: string) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      activeTab === tab
        ? "bg-primary text-primary-foreground"
        : "border border-border text-foreground hover:bg-muted"
    }`

  if (permissionsLoading) {
    return (
      <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading permissions...
        </div>
      </section>
    )
  }

  if (!canViewProject) {
    return (
      <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          You do not have permission to view this project.
        </div>
      </section>
    )
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            onClick={() => router.push("/project")}
            className="mb-3 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Back to Projects
          </button>

          <h1 className="text-2xl font-semibold text-foreground">
            {project?.name || "Project Details"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            View project overview, stakeholders, vision and scope, and requirements.
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <button onClick={() => setActiveTab("overview")} className={tabButtonClasses("overview")}>
          Overview
        </button>

        <button
          onClick={() => setActiveTab("stakeholders")}
          className={tabButtonClasses("stakeholders")}
        >
          Stakeholders
        </button>

        <button
          onClick={() => setActiveTab("vision-scope")}
          className={tabButtonClasses("vision-scope")}
        >
          Vision & Scope
        </button>

        <button
          onClick={() => setActiveTab("requirements")}
          className={tabButtonClasses("requirements")}
        >
          Requirements
        </button>
      </div>

      {fetching ? (
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading project details...
        </div>
      ) : !project ? (
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Project not found.
        </div>
      ) : activeTab === "overview" ? (
        <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Project details and basic information.
              </p>
            </div>

            {!isEditMode && canEditProject && (
              <button
                onClick={() => setIsEditMode(true)}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Edit
              </button>
            )}
          </div>

          {isEditMode ? (
            <form onSubmit={handleUpdateProject} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Project Title
                </label>
                <input
                  type="text"
                  name="name"
                  value={projectForm.name}
                  onChange={handleProjectChange}
                  required
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  name="description"
                  value={projectForm.description}
                  onChange={handleProjectChange}
                  rows={5}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
                <select
                  name="status"
                  value={projectForm.status}
                  onChange={handleProjectChange}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={projectForm.start_date}
                    onChange={handleProjectChange}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={projectForm.end_date}
                    onChange={handleProjectChange}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false)
                    setProjectForm({
                      name: project.name || "",
                      description: project.description || "",
                      start_date: project.start_date || "",
                      end_date: project.end_date || "",
                      status: project.status || "Pending",
                    })
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Title</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{project.name}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="mt-1 text-foreground">
                  {project.description || "No description provided."}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusClasses(project.status)}`}
                  >
                    {project.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="mt-1 text-foreground">{project.start_date || "-"}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="mt-1 text-foreground">{project.end_date || "-"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "stakeholders" ? (
        <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
          <h2 className="text-xl font-semibold text-foreground">Stakeholders</h2>
          <p className="mt-2 text-muted-foreground">Add stakeholder list here later.</p>
        </div>
      ) : activeTab === "vision-scope" ? (
        !canViewVisionScope ? (
          <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
            <h2 className="text-xl font-semibold text-foreground">Vision & Scope</h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to view vision and scope documents.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Vision & Scope</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Define the business direction before building requirements.
                </p>
              </div>

              {!isVisionScopeFormOpen && (canCreateVisionScope || canEditVisionScope) && (
                <button
                  onClick={openCreateVisionScopeForm}
                  disabled={!defaultVisionScopeTemplate || visionScopeTemplateLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {visionScopeTemplateLoading
                    ? "Loading Template..."
                    : draftVisionScope
                      ? "Continue Draft"
                      : visionScopeDocuments.length === 0
                        ? "Create Vision & Scope"
                        : "Create New Draft"}
                </button>
              )}
            </div>

            {isVisionScopeFormOpen && visionScopeTemplate && (
              <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {editingVisionScope?.status === "Draft"
                        ? "Edit Draft Vision & Scope"
                        : latestVisionScope
                          ? "Create New Draft"
                          : "Create Vision & Scope"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Drafts stay editable until you publish them as a version.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Using template: <span className="font-medium text-foreground">{visionScopeTemplate.name}</span>
                    </p>
                  </div>
                </div>

                <form onSubmit={handleOpenVisionScopePublishModal} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Current State
                      </label>
                      <input
                        type="text"
                        value={
                          editingVisionScope?.status === "Draft"
                            ? "Draft"
                            : latestVisionScope
                              ? `Based on version ${latestVisionScope.version}`
                              : "New draft"
                        }
                        readOnly
                        className="w-full cursor-not-allowed rounded-lg border border-border bg-muted px-3 py-2 text-foreground"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Template
                      </label>
                      <input
                        type="text"
                        value={visionScopeTemplate.name}
                        readOnly
                        className="w-full cursor-not-allowed rounded-lg border border-border bg-muted px-3 py-2 text-foreground"
                      />
                    </div>
                  </div>

                  {visionScopeTemplate.sections.map((section) => (
                    <div key={section.id} className="rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => toggleVisionScopeSection(section.id)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <div>
                          <p className="font-medium text-foreground">{section.title}</p>
                          {section.description && (
                            <p className="text-sm text-muted-foreground">{section.description}</p>
                          )}
                        </div>
                        <SectionToggleIcon isOpen={openVisionScopeSections[section.id]} />
                      </button>

                      {openVisionScopeSections[section.id] && (
                        <div className="space-y-4 border-t border-border px-4 py-4">
                          {section.fields.map((field) => (
                            <div key={field.id}>
                              <label className="mb-1 block text-sm font-medium text-foreground">
                                {field.label}
                                {field.is_required && <span className="ml-1 text-red-500">*</span>}
                              </label>

                              {renderDynamicField(
                                field,
                                visionScopeValues[field.key] || "",
                                handleDynamicVisionScopeChange
                              )}

                              {field.help_text && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {field.help_text}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={saveVisionScopeDraft}
                      disabled={loading}
                      className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted disabled:opacity-60"
                    >
                      {loading ? "Saving..." : "Save as Draft"}
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {loading ? "Saving..." : "Save Version"}
                    </button>

                    <button
                      type="button"
                      onClick={closeCreateVisionScopeForm}
                      className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
                    >
                      Back to Vision & Scope
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!isVisionScopeFormOpen && (
              <div className="space-y-6">
                {draftVisionScope && (
                  <div className="rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-200">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-amber-900">Draft in Progress</h3>
                        <p className="mt-1 text-sm text-amber-800">
                          This draft is still editable and has not been published as a version.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          Draft
                        </span>

                        {canEditVisionScope && (
                          <button
                            type="button"
                            onClick={() => openEditVisionScopeForm(draftVisionScope)}
                            className="rounded-lg border border-amber-300 bg-white p-2 text-amber-800 hover:bg-amber-100"
                            title="Edit Draft"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}

                        {canDeleteVisionScope && (
                          <button
                            type="button"
                            onClick={() => setVisionScopeToDelete(draftVisionScope)}
                            className="rounded-lg border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"
                            title="Delete Draft"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <p className="text-sm font-medium text-amber-700">Status</p>
                        <p className="mt-1 text-lg font-semibold text-amber-900">Draft</p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <p className="text-sm font-medium text-amber-700">Created</p>
                        <p className="mt-1 text-amber-900">
                          {new Date(draftVisionScope.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <p className="text-sm font-medium text-amber-700">Last Updated</p>
                        <p className="mt-1 text-amber-900">
                          {new Date(draftVisionScope.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {latestVisionScope ? (
                  <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          Latest Published Version
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Most recent published Vision & Scope version for this project.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          Version {latestVisionScope.version}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/project/${projectId}/vision-scope/${latestVisionScope.id}`)
                          }
                          className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                          title="View Latest Version"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canEditVisionScope && !draftVisionScope && (
                          <button
                            type="button"
                            onClick={openCreateVisionScopeForm}
                            className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                            title="Create Draft From Latest Version"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}

                        {canDeleteVisionScope && (
                          <button
                            type="button"
                            onClick={() => setVisionScopeToDelete(latestVisionScope)}
                            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            title="Delete Latest Version"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-sm font-medium text-muted-foreground">Version</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {latestVisionScope.version}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-sm font-medium text-muted-foreground">Created</p>
                        <p className="mt-1 text-foreground">
                          {new Date(latestVisionScope.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                        <p className="mt-1 text-foreground">
                          {new Date(latestVisionScope.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : !draftVisionScope ? (
                  <div className="rounded-2xl bg-background p-10 text-center ring-1 ring-border">
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <ClipboardList className="h-7 w-7 text-muted-foreground" />
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-foreground">
                      No Vision & Scope Document yet
                    </h3>

                    <p className="mt-2 text-sm text-muted-foreground">
                      Start defining your project vision and scope to guide requirement development.
                    </p>
                  </div>
                ) : null}

                {previousVisionScopes.length > 0 && (
                  <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border">
                    <div className="border-b border-border px-6 py-4">
                      <h3 className="text-lg font-semibold text-foreground">Previous Versions</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        View earlier published versions of the Vision & Scope document.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/40 text-left text-foreground">
                          <tr>
                            <th className="w-14 px-4 py-3 font-medium">
                              <input
                                type="checkbox"
                                checked={
                                  previousVisionScopes.length > 0 &&
                                  selectedVisionScopeIds.length === previousVisionScopes.length
                                }
                                onChange={toggleSelectAllVisionScopes}
                              />
                            </th>
                            <th className="px-4 py-3 font-medium">Version</th>
                            <th className="px-4 py-3 font-medium">Date Created</th>
                            <th className="px-4 py-3 font-medium">Date Modified</th>
                            <th className="w-40 px-4 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {previousVisionScopes.map((document) => (
                            <tr
                              key={document.id}
                              className="cursor-pointer border-t border-border hover:bg-muted/30"
                              onClick={() =>
                                router.push(`/project/${projectId}/vision-scope/${document.id}`)
                              }
                            >
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedVisionScopeIds.includes(document.id)}
                                  onChange={() => toggleVisionScopeSelection(document.id)}
                                />
                              </td>

                              <td className="px-4 py-3 font-medium text-foreground">
                                {document.version}
                              </td>

                              <td className="px-4 py-3 text-muted-foreground">
                                {new Date(document.created_at).toLocaleDateString()}
                              </td>

                              <td className="px-4 py-3 text-muted-foreground">
                                {new Date(document.updated_at).toLocaleDateString()}
                              </td>

                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      router.push(`/project/${projectId}/vision-scope/${document.id}`)
                                    }
                                    className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                                    title="View Version"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  {canDeleteVisionScope && (
                                    <button
                                      type="button"
                                      onClick={() => setVisionScopeToDelete(document)}
                                      className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                      title="Delete Version"
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
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ) : !canViewRequirements ? (
        <div className="rounded-2xl bg-background p-6 ring-1 ring-border">
          <h2 className="text-xl font-semibold text-foreground">Requirements</h2>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to view requirements.
          </p>
        </div>
      ) : (
        <RequirementsTabContent projectId={projectId} />
      )}

      {isTemplateSwitchModalOpen && templateSwitchSourceTemplate && templateSwitchTargetTemplate && templateSwitchPreview && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              A newer template is available
            </h3>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This document is currently using{" "}
              <span className="font-medium text-foreground">
                {templateSwitchSourceTemplate.name}
              </span>
              . A newer template,{" "}
              <span className="font-medium text-foreground">
                {templateSwitchTargetTemplate.name}
              </span>
              , is now available.
            </p>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You can continue using your current template, or switch to the newer one.
              If you switch, matching information will be carried over automatically.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Information carried over
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {templateSwitchPreview.transferred_count}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Information that won’t be included
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {templateSwitchPreview.unmatched_old_fields.length}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  New information to fill in
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {templateSwitchPreview.new_empty_fields.length}
                </p>
              </div>
            </div>

            {templateSwitchPreview.unmatched_old_fields.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">
                  Some information from your current template is not part of the newer template
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  This information will not be carried over if you switch.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {templateSwitchPreview.unmatched_old_fields.map((fieldKey) => (
                    <span
                      key={fieldKey}
                      className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
                    >
                      {fieldKey}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {templateSwitchPreview.new_empty_fields.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-foreground">
                  New information you may need to complete
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You can review and fill these in after switching templates.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {templateSwitchPreview.new_empty_fields.map((field) => (
                    <span
                      key={field.field_key}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {field.field_label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsTemplateSwitchModalOpen(false)
                  setTemplateSwitchSourceTemplate(null)
                  setTemplateSwitchTargetTemplate(null)
                  setTemplateSwitchPreview(null)
                }}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleKeepCurrentTemplate}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Keep current template
              </button>

              <button
                type="button"
                onClick={handleSwitchToLatestTemplate}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Use newer template
              </button>
            </div>
          </div>
        </div>
      )}

      {isSaveVisionScopeVersionModalOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">Save as Published Version</h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Choose how the system should version this Vision & Scope document.
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => saveVisionScopeVersion("minor")}
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
                onClick={() => saveVisionScopeVersion("major")}
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
                onClick={() => setIsSaveVisionScopeVersionModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {visionScopeToDelete && canDeleteVisionScope && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">
              Delete Vision & Scope {visionScopeToDelete.status === "Draft" ? "Draft" : "Version"}
            </h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {visionScopeToDelete.status === "Draft" ? "this draft" : visionScopeToDelete.version}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setVisionScopeToDelete(null)}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteVisionScope}
                disabled={loading}
                className="rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90 disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}