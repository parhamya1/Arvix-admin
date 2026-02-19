import { createFileRoute } from '@tanstack/react-router'
import { ReportingHistoryPage, type ReportingDomain } from '@/features/reporting'

export const Route = createFileRoute('/_authenticated/reporting/$domain/history')({
  component: RouteComponent,
})

function RouteComponent() {
  const { domain } = Route.useParams()
  return <ReportingHistoryPage domain={domain as ReportingDomain} />
}
