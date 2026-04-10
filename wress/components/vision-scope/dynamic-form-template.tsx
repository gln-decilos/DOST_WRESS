"use client"

import type { DocumentTemplate } from "@/features/templates/types"

type DynamicTemplateFormProps = {
  template: DocumentTemplate
  values: Record<string, string>
  openSections: Record<number, boolean>
  onToggleSection: (sectionId: number) => void
  onChangeValue: (fieldKey: string, value: string) => void
}

export default function DynamicTemplateForm({
  template,
  values,
  openSections,
  onToggleSection,
  onChangeValue,
}: DynamicTemplateFormProps) {
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
                <p className="text-sm text-muted-foreground">{section.description}</p>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {openSections[section.id] ? "-" : "+"}
            </span>
          </button>

          {openSections[section.id] && (
            <div className="space-y-4 border-t border-border px-4 py-4">
              {section.fields.map((field) => (
                <div key={field.id}>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    {field.label}
                  </label>

                  {field.field_type === "textarea" ? (
                    <textarea
                      value={values[field.key] || ""}
                      onChange={(e) => onChangeValue(field.key, e.target.value)}
                      rows={4}
                      placeholder={field.placeholder || ""}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[field.key] || ""}
                      onChange={(e) => onChangeValue(field.key, e.target.value)}
                      placeholder={field.placeholder || ""}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                    />
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