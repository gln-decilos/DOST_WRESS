"use client"

import { ChevronDown, ChevronRight } from "lucide-react"

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

type SelectOption = {
  value: string
  label: string
}

type Props = {
  template: DocumentTemplate
  values: Record<string, string>
  openSections: Record<number, boolean>
  onToggleSection: (sectionId: number) => void
  onChangeValue: (fieldKey: string, value: string) => void
}

function parseSelectOptions(optionsJson?: string | null): SelectOption[] {
  if (!optionsJson) return []

  try {
    const parsed = JSON.parse(optionsJson)

    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item) => {
        if (typeof item === "string") {
          return {
            value: item,
            label: item,
          }
        }

        if (
          item &&
          typeof item === "object" &&
          "value" in item &&
          "label" in item
        ) {
          return {
            value: String(item.value),
            label: String(item.label),
          }
        }

        return null
      })
      .filter((item): item is SelectOption => item !== null)
  } catch {
    return []
  }
}

function SectionToggleIcon({ isOpen }: { isOpen: boolean }) {
  return isOpen ? (
    <ChevronDown className="h-4 w-4" />
  ) : (
    <ChevronRight className="h-4 w-4" />
  )
}

function renderField(
  field: TemplateField,
  value: string,
  onChangeValue: (fieldKey: string, value: string) => void
) {
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
      const options = parseSelectOptions(field.options_json)

      return (
        <select
          value={value || ""}
          onChange={(e) => onChangeValue(field.key, e.target.value)}
          className={commonClassName}
          required={field.is_required}
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={`${field.key}-${option.value}`} value={option.value}>
              {option.label}
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
            onChange={(e) =>
              onChangeValue(field.key, e.target.checked ? "true" : "false")
            }
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

export default function DynamicTemplateForm({
  template,
  values,
  openSections,
  onToggleSection,
  onChangeValue,
}: Props) {
  return (
    <div className="space-y-4">
      {template.sections.map((section) => (
        <div key={section.id} className="rounded-xl border border-border">
          <button
            type="button"
            onClick={() => onToggleSection(section.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <p className="font-medium text-foreground">{section.title}</p>
              {section.description && (
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              )}
            </div>
            <SectionToggleIcon isOpen={!!openSections[section.id]} />
          </button>

          {openSections[section.id] && (
            <div className="space-y-4 border-t border-border px-4 py-4">
              {section.fields.map((field) => (
                <div key={field.id}>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    {field.label}
                    {field.is_required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </label>

                  {renderField(
                    field,
                    values[field.key] || "",
                    onChangeValue
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
    </div>
  )
}