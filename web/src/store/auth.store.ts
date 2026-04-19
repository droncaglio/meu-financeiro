import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  isSuperUser: boolean
}

type TenantRole = 'admin' | 'financial' | 'viewer'

interface Tenant {
  id: string
  name: string
  slug: string
  role: TenantRole
}

interface AuthState {
  user: User | null
  tenant: Tenant | null
  accessToken: string | null
  setAuth: (user: User, tenant: Tenant, accessToken: string) => void
  setAccessToken: (accessToken: string) => void
  setTenant: (tenant: Tenant) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      accessToken: null,
      setAuth: (user, tenant, accessToken) => set({ user, tenant, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setTenant: (tenant) => set({ tenant }),
      logout: () => set({ user: null, tenant: null, accessToken: null }),
    }),
    {
      name: 'mf-auth',
      // Persiste apenas dados não-sensíveis — tokens ficam em memória
      partialize: (state) => ({ user: state.user, tenant: state.tenant }),
    },
  ),
)
