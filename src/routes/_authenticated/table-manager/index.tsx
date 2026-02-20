import { createFileRoute } from '@tanstack/react-router'
import { TableManagerPage } from '@/features/table-manager'

export const Route = createFileRoute('/_authenticated/table-manager/')({
  component: TableManagerPage,
})
