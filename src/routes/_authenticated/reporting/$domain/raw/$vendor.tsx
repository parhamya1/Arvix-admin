import { createFileRoute } from '@tanstack/react-router'
import {
  ReportingRawPage,
  type ReportingDomain,
  type ReportingVendor,
} from '@/features/reporting'

export const Route = createFileRoute('/_authenticated/reporting/$domain/raw/$vendor')({
  component: RouteComponent,
})

function RouteComponent() {
  const { domain, vendor } = Route.useParams()

  return (
    <ReportingRawPage
      domain={domain as ReportingDomain}
      vendor={vendor as ReportingVendor}
    />
  )
}
