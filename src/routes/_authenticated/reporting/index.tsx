import { createFileRoute } from '@tanstack/react-router'
import { ReportingLandingPage } from '@/features/reporting'

export const Route = createFileRoute('/_authenticated/reporting/')({
  component: ReportingLandingPage,
})
