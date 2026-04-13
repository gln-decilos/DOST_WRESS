import RequirementsCreatePageView from "@/components/projects/requirements-create-page-view"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  return <RequirementsCreatePageView projectId={Number(id)} />
}