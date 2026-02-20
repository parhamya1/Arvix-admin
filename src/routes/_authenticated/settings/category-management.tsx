import { createFileRoute } from '@tanstack/react-router'
import { CategoryManagement } from '@/features/settings/category-management'

export const Route = createFileRoute('/_authenticated/settings/category-management')({
  component: CategoryManagement,
})
