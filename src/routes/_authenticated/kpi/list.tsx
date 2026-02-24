import { createFileRoute } from '@tanstack/react-router'
import { KpiListPage } from '@/pages/kpi/KpiListPage'

export const Route = createFileRoute('/_authenticated/kpi/list')({
  component: KpiListPage,
})
