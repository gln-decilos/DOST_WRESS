import VisionScopeDetailsPageView from "@/components/projects/vision-scope-details-page-view"

type PageProps = {
  params: Promise<{
    id: string
    documentId: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { id, documentId } = await params

  return (
    <VisionScopeDetailsPageView
      projectId={Number(id)}
      documentId={Number(documentId)}
    />
  )
}