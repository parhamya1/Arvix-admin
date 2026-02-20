import { createFileRoute } from '@tanstack/react-router'
import { TableManagement } from '@/features/settings/table-management'

export const Route = createFileRoute('/_authenticated/settings/table-management')({
  component: TableManagement,
})
