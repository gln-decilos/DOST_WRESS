import TemplateEditorPageView from "@/components/templates/template-editor-page-view"

type PageProps = {
  params: Promise<{
    templateId: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { templateId } = await params

  return <TemplateEditorPageView templateId={Number(templateId)} />
}