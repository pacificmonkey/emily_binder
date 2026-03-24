import { useAuthStore } from '@/stores/auth-store'
import { isAdmin } from '@/services/admin'

export async function usePermission(key: string): Promise<boolean> {
  const role = useAuthStore((s) => s.role)

  if (key === 'admin') {
    return role === 'admin' && await isAdmin()
  }

  return role === 'member'
}
