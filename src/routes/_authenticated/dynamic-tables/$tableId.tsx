import { createFileRoute } from '@tanstack/react-router'
import { DynamicTableViewer } from '@/features/dynamic-table'

export const Route = createFileRoute('/_authenticated/dynamic-tables/$tableId')({
  component: DynamicTableRouteComponent,
})

function DynamicTableRouteComponent() {
  const { tableId } = Route.useParams()
  return <DynamicTableViewer tableId={tableId} />
}
