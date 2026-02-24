import { createFileRoute } from '@tanstack/react-router'
import { KpiBuilderPage } from '@/pages/kpi/KpiBuilderPage'

export const Route = createFileRoute('/_authenticated/kpi/builder/')({
  component: KpiBuilderCreateRoute,
})

function KpiBuilderCreateRoute() {
  return <KpiBuilderPage />
}
