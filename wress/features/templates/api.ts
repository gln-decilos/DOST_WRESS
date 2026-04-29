import type { DocumentTemplate, TemplateSection, TemplateField } from "./types"

const TEMPLATE_API_BASE_URL = "http://localhost:5000/api/templates"
const ADMIN_TEMPLATE_API_BASE_URL = "http://localhost:5000/api/admin/templates"
const ADMIN_TEMPLATE_SECTION_API_BASE_URL =
  "http://localhost:5000/api/admin/template-sections"
const ADMIN_TEMPLATE_FIELD_API_BASE_URL =
  "http://localhost:5000/api/admin/template-fields"

// Helper to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

// Helper to get headers with auth
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  }
}

async function parseResponse<T>(
  res: Response,
  fallbackMessage: string
): Promise<T> {
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}

  if (!res.ok) {
    throw new Error(data.message || data.error || fallbackMessage)
  }

  return data as T
}

export async function getDefaultTemplate(
  moduleCode: string
): Promise<DocumentTemplate> {
  const res = await fetch(`${TEMPLATE_API_BASE_URL}/${moduleCode}/default`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  })

  const data = await parseResponse<{ template: DocumentTemplate }>(
    res,
    "Failed to fetch template"
  )

  return data.template
}

export async function getAdminTemplates(
  module?: string
): Promise<DocumentTemplate[]> {
  const url = module
    ? `${ADMIN_TEMPLATE_API_BASE_URL}?module=${encodeURIComponent(module)}`
    : ADMIN_TEMPLATE_API_BASE_URL

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  })

  const data = await parseResponse<{ templates: DocumentTemplate[] }>(
    res,
    "Failed to fetch templates"
  )

  return data.templates
}

export async function getAdminTemplate(
  templateId: number
): Promise<DocumentTemplate> {
  const res = await fetch(`${ADMIN_TEMPLATE_API_BASE_URL}/${templateId}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  })

  const data = await parseResponse<{ template: DocumentTemplate }>(
    res,
    "Failed to fetch template"
  )

  return data.template
}

export async function createAdminTemplate(payload: {
  name: string
  code: string
  module: string
  description?: string
  is_active?: boolean
  is_default?: boolean
  organization_id?: number | null
}): Promise<DocumentTemplate> {
  const res = await fetch(ADMIN_TEMPLATE_API_BASE_URL, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  const data = await parseResponse<{ template: DocumentTemplate }>(
    res,
    "Failed to create template"
  )

  return data.template
}

export async function updateAdminTemplate(
  templateId: number,
  payload: Partial<{
    name: string
    code: string
    description: string
    is_active: boolean
    is_default: boolean
    organization_id: number | null
  }>
): Promise<DocumentTemplate> {
  const res = await fetch(`${ADMIN_TEMPLATE_API_BASE_URL}/${templateId}`, {
    method: "PUT",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  const data = await parseResponse<{ template: DocumentTemplate }>(
    res,
    "Failed to update template"
  )

  return data.template
}

export async function deleteAdminTemplate(templateId: number): Promise<void> {
  const res = await fetch(`${ADMIN_TEMPLATE_API_BASE_URL}/${templateId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  })

  await parseResponse<{ message: string }>(res, "Failed to delete template")
}

export async function setDefaultAdminTemplate(
  templateId: number
): Promise<DocumentTemplate> {
  const res = await fetch(
    `${ADMIN_TEMPLATE_API_BASE_URL}/${templateId}/set-default`,
    {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
    }
  )

  const data = await parseResponse<{ template: DocumentTemplate }>(
    res,
    "Failed to set default template"
  )

  return data.template
}

export async function duplicateAdminTemplate(
  templateId: number
): Promise<DocumentTemplate> {
  const res = await fetch(
    `${ADMIN_TEMPLATE_API_BASE_URL}/${templateId}/duplicate`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    }
  )

  const data = await parseResponse<{ template: DocumentTemplate }>(
    res,
    "Failed to duplicate template"
  )

  return data.template
}

export async function createTemplateSection(
  templateId: number,
  payload: {
    title: string
    description?: string
    sort_order?: number
    is_collapsible?: boolean
  }
): Promise<TemplateSection> {
  const res = await fetch(
    `${ADMIN_TEMPLATE_SECTION_API_BASE_URL}/template/${templateId}`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  )

  const data = await parseResponse<{ section: TemplateSection }>(
    res,
    "Failed to create section"
  )

  return data.section
}

export async function updateTemplateSection(
  sectionId: number,
  payload: Partial<{
    title: string
    description: string
    sort_order: number
    is_collapsible: boolean
  }>
): Promise<TemplateSection> {
  const res = await fetch(`${ADMIN_TEMPLATE_SECTION_API_BASE_URL}/${sectionId}`, {
    method: "PUT",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  const data = await parseResponse<{ section: TemplateSection }>(
    res,
    "Failed to update section"
  )

  return data.section
}

export async function deleteTemplateSection(sectionId: number): Promise<void> {
  const res = await fetch(`${ADMIN_TEMPLATE_SECTION_API_BASE_URL}/${sectionId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  })

  await parseResponse<{ message: string }>(res, "Failed to delete section")
}

export async function createTemplateField(
  sectionId: number,
  payload: {
    key: string
    label: string
    field_type?: string
    placeholder?: string
    help_text?: string
    default_value?: string
    options_json?: string
    is_required?: boolean
    sort_order?: number
  }
): Promise<TemplateField> {
  const res = await fetch(
    `${ADMIN_TEMPLATE_FIELD_API_BASE_URL}/section/${sectionId}`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  )

  const data = await parseResponse<{ field: TemplateField }>(
    res,
    "Failed to create field"
  )

  return data.field
}

export async function updateTemplateField(
  fieldId: number,
  payload: Partial<{
    key: string
    label: string
    field_type: string
    placeholder: string
    help_text: string
    default_value: string
    options_json: string
    is_required: boolean
    sort_order: number
  }>
): Promise<TemplateField> {
  const res = await fetch(`${ADMIN_TEMPLATE_FIELD_API_BASE_URL}/${fieldId}`, {
    method: "PUT",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  const data = await parseResponse<{ field: TemplateField }>(
    res,
    "Failed to update field"
  )

  return data.field
}

export async function deleteTemplateField(fieldId: number): Promise<void> {
  const res = await fetch(`${ADMIN_TEMPLATE_FIELD_API_BASE_URL}/${fieldId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  })

  await parseResponse<{ message: string }>(res, "Failed to delete field")
}