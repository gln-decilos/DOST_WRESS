import RequirementsEditPageView from "@/components/projects/requirements-edit-page-view"

type PageProps = {
  params: Promise<{
    id: string
    documentId: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { id, documentId } = await params

  return (
    <RequirementsEditPageView
      projectId={Number(id)}
      documentId={Number(documentId)}
    />
  )
}