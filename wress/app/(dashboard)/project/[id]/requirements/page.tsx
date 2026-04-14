import RequirementsPageView from "@/components/projects/requirements-page-view"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  return <RequirementsPageView projectId={Number(id)} />
}