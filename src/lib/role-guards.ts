import { useAuthStore } from '@/stores/auth-store'

export const isAdminUser = () => {
  const roles = useAuthStore.getState().auth.user?.role ?? []
  return roles.includes('admin')
}

