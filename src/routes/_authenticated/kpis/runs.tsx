import { createFileRoute } from '@tanstack/react-router'
import KpiRunsPage from '@/pages/kpis/KpiRunsPage'

export const Route = createFileRoute('/_authenticated/kpis/runs')({
  component: KpiRunsPage,
})
