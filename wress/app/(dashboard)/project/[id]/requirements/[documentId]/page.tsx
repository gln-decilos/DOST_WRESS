import RequirementsDocumentPageView from "@/components/projects/requirements-document-page-view"

type PageProps = {
  params: Promise<{
    id: string
    documentId: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { id, documentId } = await params

  return (
    <RequirementsDocumentPageView
      projectId={Number(id)}
      documentId={Number(documentId)}
    />
  )
}