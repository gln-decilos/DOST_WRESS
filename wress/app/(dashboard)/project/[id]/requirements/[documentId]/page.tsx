import RequirementDetailsPageView from "@/components/projects/requirements-details-page-view"

type PageProps = {
  params: Promise<{
    id: string
    documentId: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { id, documentId } = await params

  return (
    <RequirementDetailsPageView
      projectId={Number(id)}
      documentId={Number(documentId)}
    />
  )
}