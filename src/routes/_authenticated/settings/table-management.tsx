import { createFileRoute, redirect } from '@tanstack/react-router'
import { TableManagement } from '@/features/settings/table-management'
import { isAdminUser } from '@/lib/role-guards'

export const Route = createFileRoute('/_authenticated/settings/table-management')({
  component: TableManagement,
  beforeLoad: () => {
    if (!isAdminUser()) {
      throw redirect({ to: '/' })
    }
  },
})
