"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  LayoutPanelTop,
  FileText,
  GripVertical,
  Settings2,
} from "lucide-react"
import {
  createTemplateField,
  createTemplateSection,
  deleteTemplateField,
  deleteTemplateSection,
  getAdminTemplate,
  updateAdminTemplate,
  updateTemplateField,
  updateTemplateSection,
} from "@/features/templates/api"
import type {
  DocumentTemplate,
  TemplateField,
  TemplateSection,
} from "@/features/templates/types"

type TemplateInfoForm = {
  name: string
  code: string
  description: string
  is_active: boolean
  is_default: boolean
}

type SectionForm = {
  title: string
  description: string
  sort_order: number
  is_collapsible: boolean
}

type FieldForm = {
  key: string
  label: string
  field_type: string
  placeholder: string
  help_text: string
  default_value: string
  options_json: string
  is_required: boolean
  sort_order: number
}

const emptyTemplateInfo: TemplateInfoForm = {
  name: "",
  code: "",
  description: "",
  is_active: true,
  is_default: false,
}

const emptySectionForm: SectionForm = {
  title: "",
  description: "",
  sort_order: 1,
  is_collapsible: true,
}

const emptyFieldForm: FieldForm = {
  key: "",
  label: "",
  field_type: "textarea",
  placeholder: "",
  help_text: "",
  default_value: "",
  options_json: "",
  is_required: false,
  sort_order: 1,
}

function getFieldTypeBadgeClass(fieldType: string) {
  switch (fieldType) {
    case "textarea":
      return "bg-sky-50 text-sky-700 ring-sky-200"
    case "text":
      return "bg-slate-100 text-slate-700 ring-slate-200"
    case "number":
      return "bg-violet-50 text-violet-700 ring-violet-200"
    case "select":
      return "bg-amber-50 text-amber-700 ring-amber-200"
    case "checkbox":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200"
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200"
  }
}

export default function TemplateEditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get('id')
  const templateIdNumber = templateId ? parseInt(templateId) : null

  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const [templateInfo, setTemplateInfo] =
    useState<TemplateInfoForm>(emptyTemplateInfo)

  const [sectionModalOpen, setSectionModalOpen] = useState(false)
  const [fieldModalOpen, setFieldModalOpen] = useState(false)

  const [editingSection, setEditingSection] = useState<TemplateSection | null>(null)
  const [editingField, setEditingField] = useState<TemplateField | null>(null)

  const [targetSectionId, setTargetSectionId] = useState<number | null>(null)

  const [sectionForm, setSectionForm] = useState<SectionForm>(emptySectionForm)
  const [fieldForm, setFieldForm] = useState<FieldForm>(emptyFieldForm)

  // Delete modal states
  const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false)
  const [deleteFieldModalOpen, setDeleteFieldModalOpen] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<TemplateSection | null>(null)
  const [fieldToDelete, setFieldToDelete] = useState<TemplateField | null>(null)

  const fetchTemplate = async () => {
    if (!templateIdNumber) return

    try {
      setFetching(true)
      setMessage("")
      const data = await getAdminTemplate(templateIdNumber)
      setTemplate(data)
      setTemplateInfo({
        name: data.name,
        code: data.code,
        description: data.description ?? "",
        is_active: data.is_active,
        is_default: data.is_default,
      })
    } catch (error) {
      console.error("Failed to fetch template:", error)
      setMessage("Failed to fetch template. Please make sure you are logged in.")
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (templateIdNumber) {
      fetchTemplate()
    }
  }, [templateIdNumber])

  const handleTemplateInfoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.currentTarget
    const name = target.name as keyof TemplateInfoForm

    setTemplateInfo((prev) => ({
      ...prev,
      [name]:
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? target.checked
          : target.value,
    }))
  }

  const saveTemplateInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateIdNumber) return

    try {
      setLoading(true)
      setMessage("")

      await updateAdminTemplate(templateIdNumber, {
        name: templateInfo.name,
        code: templateInfo.code,
        description: templateInfo.description,
        is_active: templateInfo.is_active,
        is_default: templateInfo.is_default,
      })

      setMessage("Template information updated successfully")
      await fetchTemplate()
    } catch (error) {
      console.error("Failed to update template:", error)
      setMessage(error instanceof Error ? error.message : "Failed to update template")
    } finally {
      setLoading(false)
    }
  }

  const openAddSectionModal = () => {
    setEditingSection(null)
    setSectionForm({
      ...emptySectionForm,
      sort_order: (template?.sections?.length ?? 0) + 1,
    })
    setSectionModalOpen(true)
  }

  const openEditSectionModal = (section: TemplateSection) => {
    setEditingSection(section)
    setSectionForm({
      title: section.title,
      description: section.description ?? "",
      sort_order: section.sort_order,
      is_collapsible: section.is_collapsible,
    })
    setSectionModalOpen(true)
  }

  const closeSectionModal = () => {
    setSectionModalOpen(false)
    setEditingSection(null)
    setSectionForm(emptySectionForm)
  }

  const openAddFieldModal = (sectionId: number, fieldsCount: number) => {
    setTargetSectionId(sectionId)
    setEditingField(null)
    setFieldForm({
      ...emptyFieldForm,
      sort_order: fieldsCount + 1,
    })
    setFieldModalOpen(true)
  }

  const openEditFieldModal = (sectionId: number, field: TemplateField) => {
    setTargetSectionId(sectionId)
    setEditingField(field)
    setFieldForm({
      key: field.key,
      label: field.label,
      field_type: field.field_type,
      placeholder: field.placeholder ?? "",
      help_text: field.help_text ?? "",
      default_value: field.default_value ?? "",
      options_json: field.options_json ?? "",
      is_required: field.is_required,
      sort_order: field.sort_order,
    })
    setFieldModalOpen(true)
  }

  const closeFieldModal = () => {
    setFieldModalOpen(false)
    setEditingField(null)
    setTargetSectionId(null)
    setFieldForm(emptyFieldForm)
  }

  const handleSectionChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.currentTarget
    const name = target.name as keyof SectionForm

    setSectionForm((prev) => ({
      ...prev,
      [name]:
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? target.checked
          : name === "sort_order"
            ? Number(target.value)
            : target.value,
    }))
  }

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.currentTarget
    const name = target.name as keyof FieldForm

    setFieldForm((prev) => ({
      ...prev,
      [name]:
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? target.checked
          : name === "sort_order"
            ? Number(target.value)
            : target.value,
    }))
  }

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateIdNumber) return

    try {
      setLoading(true)
      setMessage("")

      if (editingSection) {
        await updateTemplateSection(editingSection.id, sectionForm)
        setMessage("Section updated successfully")
      } else {
        await createTemplateSection(templateIdNumber, sectionForm)
        setMessage("Section created successfully")
      }

      closeSectionModal()
      await fetchTemplate()
    } catch (error) {
      console.error("Failed to save section:", error)
      setMessage(error instanceof Error ? error.message : "Failed to save section")
    } finally {
      setLoading(false)
    }
  }

  // Delete Section Modal Handlers
  const openDeleteSectionModal = (section: TemplateSection) => {
    setSectionToDelete(section)
    setDeleteSectionModalOpen(true)
  }

  const closeDeleteSectionModal = () => {
    setSectionToDelete(null)
    setDeleteSectionModalOpen(false)
  }

  const confirmDeleteSection = async () => {
    if (!sectionToDelete?.id) return

    try {
      setLoading(true)
      setMessage("")
      await deleteTemplateSection(sectionToDelete.id)
      setMessage("Section deleted successfully")
      await fetchTemplate()
      closeDeleteSectionModal()
    } catch (error) {
      console.error("Failed to delete section:", error)
      setMessage(error instanceof Error ? error.message : "Failed to delete section")
    } finally {
      setLoading(false)
    }
  }

  // Delete Field Modal Handlers
  const openDeleteFieldModal = (field: TemplateField) => {
    setFieldToDelete(field)
    setDeleteFieldModalOpen(true)
  }

  const closeDeleteFieldModal = () => {
    setFieldToDelete(null)
    setDeleteFieldModalOpen(false)
  }

  const confirmDeleteField = async () => {
    if (!fieldToDelete?.id) return

    try {
      setLoading(true)
      setMessage("")
      await deleteTemplateField(fieldToDelete.id)
      setMessage("Field deleted successfully")
      await fetchTemplate()
      closeDeleteFieldModal()
    } catch (error) {
      console.error("Failed to delete field:", error)
      setMessage(error instanceof Error ? error.message : "Failed to delete field")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetSectionId) return

    try {
      setLoading(true)
      setMessage("")

      if (editingField) {
        await updateTemplateField(editingField.id, fieldForm)
        setMessage("Field updated successfully")
      } else {
        await createTemplateField(targetSectionId, fieldForm)
        setMessage("Field created successfully")
      }

      closeFieldModal()
      await fetchTemplate()
    } catch (error) {
      console.error("Failed to save field:", error)
      setMessage(error instanceof Error ? error.message : "Failed to save field")
    } finally {
      setLoading(false)
    }
  }

  // Check if templateId is missing
  if (!templateIdNumber) {
    return (
      <section className="w-full rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-10 text-center text-muted-foreground ring-1 ring-border">
          <h2 className="text-lg font-semibold mb-2">No Template Selected</h2>
          <p>Please go back and select a template to edit.</p>
          <button
            onClick={() => router.push("/org-admin/templates")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Templates
          </button>
        </div>
      </section>
    )
  }

  if (fetching) {
    return (
      <section className="w-full rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-10 text-center text-muted-foreground ring-1 ring-border">
          Loading template...
        </div>
      </section>
    )
  }

  if (!template) {
    return (
      <section className="w-full rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-10 text-center text-muted-foreground ring-1 ring-border">
          <h2 className="text-lg font-semibold mb-2">Template not found</h2>
          <p>The template you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => router.push("/org-admin/templates")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Templates
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-sidebar-gradient text-white shadow-sm">
        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <Settings2 className="h-4 w-4" />
              Template Builder
            </div>

            <h1 className="text-2xl font-semibold md:text-3xl">
              {template.name}
            </h1>

            <p className="mt-2 text-sm text-white/85 md:text-base">
              Configure template information, organize sections, and define the
              fields that business analysts will use in documents.
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1">
                Code: {template.code}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1">
                Module: {template.module}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1">
                {template.is_active ? "Active" : "Inactive"}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1">
                {template.is_default ? "Default Template" : "Non-default"}
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push("/org-admin/templates")}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Templates
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${message.includes("successfully")
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
          }`}>
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr,1.9fr]">
        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Template Information
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Update the core details of this template.
              </p>
            </div>
          </div>

          <form onSubmit={saveTemplateInfo} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Template Name
              </label>
              <input
                type="text"
                name="name"
                value={templateInfo.name}
                onChange={handleTemplateInfoChange}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Template Code
              </label>
              <input
                type="text"
                name="code"
                value={templateInfo.code}
                onChange={handleTemplateInfoChange}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                name="description"
                value={templateInfo.description}
                onChange={handleTemplateInfoChange}
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="mb-3 text-sm font-medium text-foreground">
                Template Status
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={templateInfo.is_active}
                    onChange={handleTemplateInfoChange}
                    className="h-4 w-4 rounded border-border"
                  />
                  Active template
                </label>

                <label className="flex items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={templateInfo.is_default}
                    onChange={handleTemplateInfoChange}
                    className="h-4 w-4 rounded border-border"
                  />
                  Set as default template
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save Template Info"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <LayoutPanelTop className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Sections &amp; Fields
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Structure the form and manage the fields inside each section.
                </p>
              </div>
            </div>

            <button
              onClick={openAddSectionModal}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Section
            </button>
          </div>

          <div className="space-y-5">
            {template.sections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <LayoutPanelTop className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  No sections yet
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start building your template by adding the first section.
                </p>
              </div>
            ) : (
              template.sections.map((section) => (
                <div
                  key={section.id}
                  className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm"
                >
                  <div className="border-b border-border bg-muted/30 px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-xl bg-white p-2 text-slate-500 ring-1 ring-border">
                          <GripVertical className="h-4 w-4" />
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {section.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {section.description || "No description provided."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-border">
                              Sort Order: {section.sort_order}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-border">
                              {section.is_collapsible
                                ? "Collapsible"
                                : "Always Expanded"}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-border">
                              {section.fields.length} field
                              {section.fields.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            openAddFieldModal(section.id, section.fields.length)
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                        >
                          <Plus className="h-4 w-4" />
                          Add Field
                        </button>

                        <button
                          onClick={() => openEditSectionModal(section)}
                          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          onClick={() => openDeleteSectionModal(section)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    {section.fields.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        No fields in this section yet.
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {section.fields.map((field) => (
                          <div
                            key={field.id}
                            className="rounded-2xl border border-border bg-card p-4 transition hover:shadow-sm"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold text-foreground">
                                    {field.label}
                                  </h4>

                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getFieldTypeBadgeClass(
                                      field.field_type
                                    )}`}
                                  >
                                    {field.field_type}
                                  </span>

                                  {field.is_required && (
                                    <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                                      Required
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                  <p>
                                    <span className="font-medium text-foreground">
                                      Key:
                                    </span>{" "}
                                    {field.key}
                                  </p>
                                  <p>
                                    <span className="font-medium text-foreground">
                                      Sort Order:
                                    </span>{" "}
                                    {field.sort_order}
                                  </p>
                                  {field.placeholder && (
                                    <p>
                                      <span className="font-medium text-foreground">
                                        Placeholder:
                                      </span>{" "}
                                      {field.placeholder}
                                    </p>
                                  )}
                                  {field.help_text && (
                                    <p>
                                      <span className="font-medium text-foreground">
                                        Help Text:
                                      </span>{" "}
                                      {field.help_text}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-wrap gap-2">
                                <button
                                  onClick={() =>
                                    openEditFieldModal(section.id, field)
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </button>

                                <button
                                  onClick={() => openDeleteFieldModal(field)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Section Modal */}
      {sectionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="flex w-full max-w-xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-border">
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <h3 className="text-xl font-semibold text-foreground">
                  {editingSection ? "Edit Section" : "Add Section"}
                </h3>

                <button
                  onClick={closeSectionModal}
                  className="rounded-xl px-3 py-1.5 text-muted-foreground transition hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5">
                <form onSubmit={handleSaveSection} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Section Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={sectionForm.title}
                      onChange={handleSectionChange}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={sectionForm.description}
                      onChange={handleSectionChange}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      name="sort_order"
                      value={sectionForm.sort_order}
                      onChange={handleSectionChange}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      min={1}
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-sm text-foreground">
                    <input
                      type="checkbox"
                      name="is_collapsible"
                      checked={sectionForm.is_collapsible}
                      onChange={handleSectionChange}
                      className="h-4 w-4 rounded border-border"
                    />
                    Make this section collapsible
                  </label>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {loading
                        ? "Saving..."
                        : editingSection
                          ? "Update Section"
                          : "Add Section"}
                    </button>

                    <button
                      type="button"
                      onClick={closeSectionModal}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Field Modal */}
      {fieldModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-border">
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <h3 className="text-xl font-semibold text-foreground">
                  {editingField ? "Edit Field" : "Add Field"}
                </h3>

                <button
                  onClick={closeFieldModal}
                  className="rounded-xl px-3 py-1.5 text-muted-foreground transition hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5">
                <form onSubmit={handleSaveField} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Field Label
                    </label>
                    <input
                      type="text"
                      name="label"
                      value={fieldForm.label}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Field Key
                    </label>
                    <input
                      type="text"
                      name="key"
                      value={fieldForm.key}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Field Type
                    </label>
                    <select
                      name="field_type"
                      value={fieldForm.field_type}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="textarea">Textarea</option>
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="select">Select</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      name="sort_order"
                      value={fieldForm.sort_order}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      min={1}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Placeholder
                    </label>
                    <input
                      type="text"
                      name="placeholder"
                      value={fieldForm.placeholder}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Help Text
                    </label>
                    <input
                      type="text"
                      name="help_text"
                      value={fieldForm.help_text}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Default Value
                    </label>
                    <textarea
                      name="default_value"
                      value={fieldForm.default_value}
                      onChange={handleFieldChange}
                      rows={2}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Options JSON
                    </label>
                    <textarea
                      name="options_json"
                      value={fieldForm.options_json}
                      onChange={handleFieldChange}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder='[{"label":"Option 1","value":"option_1"}]'
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-sm text-foreground">
                      <input
                        type="checkbox"
                        name="is_required"
                        checked={fieldForm.is_required}
                        onChange={handleFieldChange}
                        className="h-4 w-4 rounded border-border"
                      />
                      Mark this field as required
                    </label>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {loading
                        ? "Saving..."
                        : editingField
                          ? "Update Field"
                          : "Add Field"}
                    </button>

                    <button
                      type="button"
                      onClick={closeFieldModal}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Section Modal */}
      {deleteSectionModalOpen && sectionToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">Delete Section</h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {sectionToDelete.title}
              </span>
              ? This will also delete all fields inside this section. This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteSectionModal}
                disabled={loading}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteSection}
                disabled={loading}
                className="rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90 disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Field Modal */}
      {deleteFieldModalOpen && fieldToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">Delete Field</h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {fieldToDelete.label}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteFieldModal}
                disabled={loading}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteField}
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