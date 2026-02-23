import { createFileRoute } from '@tanstack/react-router'
import KpiLibraryPage from '@/pages/kpis/KpiLibraryPage'

export const Route = createFileRoute('/_authenticated/kpis/')({
  component: KpiLibraryPage,
})
