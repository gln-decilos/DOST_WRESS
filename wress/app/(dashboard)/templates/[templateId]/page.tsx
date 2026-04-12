import TemplateEditorPageView from "@/components/templates/template-editor-page-view"

type PageProps = {
  params: {
    templateId: string
  }
}

export default function Page({ params }: PageProps) {
  return <TemplateEditorPageView templateId={Number(params.templateId)} />
}