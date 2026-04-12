import VisionScopeDetailsPageView from "@/components/projects/vision-scope-details-page-view"

type PageProps = {
  params: {
    id: string
    documentId: string
  }
}

export default function Page({ params }: PageProps) {
  return (
    <VisionScopeDetailsPageView
      projectId={Number(params.id)}
      documentId={Number(params.documentId)}
    />
  )
}