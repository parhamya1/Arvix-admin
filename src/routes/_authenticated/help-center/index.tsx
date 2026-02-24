import { createFileRoute } from '@tanstack/react-router'
import KpiBuilderPage from '@/features/kpi-builder/KpiBuilderPage'

export const Route = createFileRoute('/_authenticated/help-center/')({
  component: KpiBuilderPage,
})
