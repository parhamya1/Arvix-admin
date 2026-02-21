import { createFileRoute, redirect } from '@tanstack/react-router'
import { CategoryManagement } from '@/features/settings/category-management'
import { isAdminUser } from '@/lib/role-guards'

export const Route = createFileRoute('/_authenticated/settings/category-management')({
  component: CategoryManagement,
  beforeLoad: () => {
    if (!isAdminUser()) {
      throw redirect({ to: '/' })
    }
  },
})
