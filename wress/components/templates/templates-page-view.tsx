"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal } from "lucide-react"
import {
  createAdminTemplate,
  deleteAdminTemplate,
  duplicateAdminTemplate,
  getAdminTemplates,
  setDefaultAdminTemplate,
  updateAdminTemplate,
} from "@/features/templates/api"
import type { DocumentTemplate } from "@/features/templates/types"
import usePermissions from "@/features/access/use-permissions"

const ITEMS_PER_PAGE = 5
const ACTION_MENU_WIDTH = 192

type TemplateForm = {
  id?: number
  name: string
  code: string
  module: string
  description: string
  is_active: boolean
  is_default: boolean
}

const emptyTemplate: TemplateForm = {
  name: "",
  code: "",
  module: "vision_scope",
  description: "",
  is_active: true,
  is_default: false,
}

function makeTemplateCode(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export default function TemplatesPageView() {
  const router = useRouter()
  const { loading: permissionsLoading, hasPermission } = usePermissions()

  const canViewTemplates = hasPermission("templates.view")
  const canCreateTemplates = hasPermission("templates.create")
  const canEditTemplates = hasPermission("templates.edit")
  const canDeleteTemplates = hasPermission("templates.delete")

  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateForm>(emptyTemplate)
  const [templateToDelete, setTemplateToDelete] =
    useState<DocumentTemplate | null>(null)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAddMode, setIsAddMode] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    left: number
  } | null>(null)

  const fetchTemplates = async () => {
    try {
      setFetching(true)
      setMessage("")
      const data = await getAdminTemplates("vision_scope")
      setTemplates(data)
    } catch (error) {
      console.error("Failed to fetch templates:", error)
      setMessage("Failed to fetch templates")
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (!permissionsLoading && canViewTemplates) {
      fetchTemplates()
    } else if (!permissionsLoading && !canViewTemplates) {
      setFetching(false)
    }
  }, [permissionsLoading, canViewTemplates])

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuId(null)
      setMenuPosition(null)
    }

    window.addEventListener("click", handleOutsideClick)
    return () => window.removeEventListener("click", handleOutsideClick)
  }, [])

  const totalPages = Math.max(1, Math.ceil(templates.length / ITEMS_PER_PAGE))

  const paginatedTemplates = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return templates.slice(startIndex, endIndex)
  }, [templates, currentPage])

  const activeMenuTemplate =
    openMenuId !== null
      ? templates.find((template) => template.id === openMenuId) ?? null
      : null

  const toggleMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    templateId: number
  ) => {
    e.stopPropagation()

    if (openMenuId === templateId) {
      setOpenMenuId(null)
      setMenuPosition(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const left = Math.max(16, rect.right - ACTION_MENU_WIDTH)

    setOpenMenuId(templateId)
    setMenuPosition({
      top: rect.bottom + 8,
      left,
    })
  }

  const openAddModal = () => {
    if (!canCreateTemplates) return
    setIsAddMode(true)
    setSelectedTemplate(emptyTemplate)
    setMessage("")
    setIsModalOpen(true)
  }

  const openEditMetaModal = (template: DocumentTemplate) => {
    if (!canEditTemplates) return
    setIsAddMode(false)
    setSelectedTemplate({
      id: template.id,
      name: template.name,
      code: template.code,
      module: template.module,
      description: template.description ?? "",
      is_active: template.is_active,
      is_default: template.is_default,
    })
    setMessage("")
    setIsModalOpen(true)
    setOpenMenuId(null)
    setMenuPosition(null)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedTemplate(emptyTemplate)
    setMessage("")
  }

  const openDeleteModal = (template: DocumentTemplate) => {
    if (!canDeleteTemplates) return
    setTemplateToDelete(template)
    setIsDeleteModalOpen(true)
    setOpenMenuId(null)
    setMenuPosition(null)
  }

  const closeDeleteModal = () => {
    setTemplateToDelete(null)
    setIsDeleteModalOpen(false)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.currentTarget
    const name = target.name as keyof TemplateForm

    setSelectedTemplate((prev) => ({
      ...prev,
      [name]:
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? target.checked
          : target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      if (selectedTemplate.id) {
        await updateAdminTemplate(selectedTemplate.id, {
          name: selectedTemplate.name,
          code: selectedTemplate.code,
          description: selectedTemplate.description,
          is_active: selectedTemplate.is_active,
          is_default: selectedTemplate.is_default,
        })
        setMessage("Template updated successfully")
      } else {
        const generatedCode = `${makeTemplateCode(selectedTemplate.name)}_${Date.now()}`

        await createAdminTemplate({
          name: selectedTemplate.name,
          code: generatedCode,
          module: selectedTemplate.module,
          description: selectedTemplate.description,
          is_active: selectedTemplate.is_active,
          is_default: selectedTemplate.is_default,
        })
        setMessage("Template created successfully")
      }

      await fetchTemplates()
      closeModal()
    } catch (error) {
      console.error("Failed to save template:", error)
      setMessage(error instanceof Error ? error.message : "Failed to save template")
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicate = async (templateId: number) => {
    try {
      setLoading(true)
      setMessage("")
      await duplicateAdminTemplate(templateId)
      setMessage("Template duplicated successfully")
      await fetchTemplates()
      setOpenMenuId(null)
      setMenuPosition(null)
    } catch (error) {
      console.error("Failed to duplicate template:", error)
      setMessage(error instanceof Error ? error.message : "Failed to duplicate template")
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (templateId: number) => {
    try {
      setLoading(true)
      setMessage("")
      await setDefaultAdminTemplate(templateId)
      setMessage("Template set as default successfully")
      await fetchTemplates()
      setOpenMenuId(null)
      setMenuPosition(null)
    } catch (error) {
      console.error("Failed to set default template:", error)
      setMessage(error instanceof Error ? error.message : "Failed to set default template")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!templateToDelete?.id) return

    try {
      setLoading(true)
      setMessage("")
      await deleteAdminTemplate(templateToDelete.id)
      setMessage("Template deleted successfully")

      const updatedTemplates = templates.filter(
        (template) => template.id !== templateToDelete.id
      )
      const newTotalPages = Math.max(
        1,
        Math.ceil(updatedTemplates.length / ITEMS_PER_PAGE)
      )

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages)
      }

      await fetchTemplates()

      if (isModalOpen && selectedTemplate.id === templateToDelete.id) {
        closeModal()
      }

      closeDeleteModal()
    } catch (error) {
      console.error("Failed to delete template:", error)
      setMessage(error instanceof Error ? error.message : "Failed to delete template")
    } finally {
      setLoading(false)
    }
  }

  if (permissionsLoading) {
    return (
      <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          Loading permissions...
        </div>
      </section>
    )
  }

  if (!canViewTemplates) {
    return (
      <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
        <div className="rounded-2xl bg-background p-8 text-center text-muted-foreground ring-1 ring-border">
          You do not have permission to view templates.
        </div>
      </section>
    )
  }

  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Templates</h1>
          <p className="mt-2 text-muted-foreground">
            Admins can manage Vision &amp; Scope templates for business analysts.
          </p>
        </div>

        {canCreateTemplates && (
          <button
            onClick={openAddModal}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Add Template
          </button>
        )}
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Template Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Module</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Default</th>
                <th className="w-24 px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    Loading templates...
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No templates found.
                  </td>
                </tr>
              ) : (
                paginatedTemplates.map((template) => (
                  <tr key={template.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {template.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{template.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{template.module}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {template.is_active ? "Active" : "Inactive"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {template.is_default ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => toggleMenu(e, template.id)}
                        className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!fetching && templates.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, templates.length)} of{" "}
              {templates.length} templates
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    currentPage === page
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {openMenuId !== null && menuPosition && activeMenuTemplate && (
        <div
          className="fixed z-[100] w-48 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1 text-sm">
            {canEditTemplates && (
              <button
                onClick={() => {
                  router.push(`/admin/templates/${activeMenuTemplate.id}`)
                  setOpenMenuId(null)
                  setMenuPosition(null)
                }}
                className="block w-full px-4 py-2 text-left text-foreground hover:bg-muted"
              >
                Edit Structure
              </button>
            )}

            {canEditTemplates && (
              <button
                onClick={() => openEditMetaModal(activeMenuTemplate)}
                className="block w-full px-4 py-2 text-left text-foreground hover:bg-muted"
              >
                Edit Info
              </button>
            )}

            {canCreateTemplates && (
              <button
                onClick={() => handleDuplicate(activeMenuTemplate.id)}
                className="block w-full px-4 py-2 text-left text-foreground hover:bg-muted"
              >
                Duplicate
              </button>
            )}

            {canEditTemplates && !activeMenuTemplate.is_default && (
              <button
                onClick={() => handleSetDefault(activeMenuTemplate.id)}
                className="block w-full px-4 py-2 text-left text-foreground hover:bg-muted"
              >
                Set Default
              </button>
            )}

            {canDeleteTemplates && (
              <button
                onClick={() => openDeleteModal(activeMenuTemplate)}
                className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {isAddMode ? "Add Template" : "Edit Template Info"}
              </h2>

              <button
                onClick={closeModal}
                className="rounded-md px-3 py-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Template Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={selectedTemplate.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="Enter template name"
                  required
                />
              </div>

              {!isAddMode && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Template Code
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={selectedTemplate.code}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    placeholder="Enter template code"
                    required
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Module
                </label>
                <select
                  name="module"
                  value={selectedTemplate.module}
                  onChange={handleChange}
                  disabled={!isAddMode}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="vision_scope">Vision &amp; Scope</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  name="description"
                  value={selectedTemplate.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="Enter template description"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={selectedTemplate.is_active}
                    onChange={handleChange}
                  />
                  Active
                </label>

                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={selectedTemplate.is_default}
                    onChange={handleChange}
                  />
                  Set as default
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Saving..." : isAddMode ? "Add Template" : "Update Template"}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && templateToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
            <h3 className="text-lg font-semibold text-foreground">Delete Template</h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {templateToDelete.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={loading}
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
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