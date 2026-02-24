import { createFileRoute } from '@tanstack/react-router'
import { KpiBuilderPage } from '@/pages/kpi/KpiBuilderPage'

export const Route = createFileRoute('/_authenticated/kpi/builder/$id')({
  component: KpiBuilderEditRoute,
})

function KpiBuilderEditRoute() {
  const { id } = Route.useParams()
  return <KpiBuilderPage id={id} />
}
