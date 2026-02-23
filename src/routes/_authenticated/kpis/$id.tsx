import { createFileRoute } from '@tanstack/react-router'
import KpiBuilderPage from '@/pages/kpis/KpiBuilderPage'

export const Route = createFileRoute('/_authenticated/kpis/$id')({
  component: KpiBuilderRoute,
})

function KpiBuilderRoute() {
  const { id } = Route.useParams()
  return <KpiBuilderPage kpiId={id} />
}
