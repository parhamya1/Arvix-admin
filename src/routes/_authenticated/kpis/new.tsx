import { createFileRoute } from '@tanstack/react-router'
import KpiBuilderPage from '@/pages/kpis/KpiBuilderPage'

export const Route = createFileRoute('/_authenticated/kpis/new')({
  component: () => <KpiBuilderPage />,
})
