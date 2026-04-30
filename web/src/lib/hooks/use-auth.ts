import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

type TenantRole = 'admin' | 'financial' | 'viewer'

interface AuthUser {
  id: string
  name: string
  email: string
}

export interface AuthTenant {
  id: string
  name: string
  slug: string
  role: TenantRole
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
  tenant: AuthTenant
  tenants: AuthTenant[]
}

function logError(context: string, error: unknown) {
  console.error(`[${context}]`, error)
}

export function useLogin() {
  return useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      api.post<LoginResponse>('/auth/login', payload).then((r) => r.data),
    onError: (error) => {
      logError('useLogin', error)
      toast.error('E-mail ou senha inválidos.')
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: {
      name: string
      email: string
      password: string
      companyName: string
    }) =>
      api
        .post<{ message: string }>('/auth/register', payload)
        .then((r) => r.data),
    onError: (error) => {
      logError('useRegister', error)
      toast.error('Erro ao criar conta. Verifique os dados e tente novamente.')
    },
  })
}

export function useVerifyEmail() {
  const { setAuth } = useAuthStore()

  return useMutation({
    mutationFn: (token: string) =>
      api
        .post<{ accessToken: string; user: AuthUser; tenant: AuthTenant }>(
          '/auth/verify-email',
          { token },
        )
        .then((r) => r.data),
    onSuccess: (data) => {
      setAuth({ ...data.user, isSuperUser: false }, data.tenant, data.accessToken)
    },
    onError: (error) => {
      logError('useVerifyEmail', error)
      toast.error('Link de verificação inválido ou expirado.')
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: { email: string }) =>
      api
        .post<{ message: string }>('/auth/forgot-password', payload)
        .then((r) => r.data),
    onError: (error) => {
      logError('useForgotPassword', error)
      toast.error('Ocorreu um erro. Tente novamente.')
    },
  })
}

export function useResetPassword() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  return useMutation({
    mutationFn: (payload: { token: string; password: string }) =>
      api
        .post<{ message: string }>('/auth/reset-password', payload)
        .then((r) => r.data),
    onSuccess: () => {
      logout()
      toast.success('Senha redefinida com sucesso!')
      navigate('/login')
    },
    onError: (error) => {
      logError('useResetPassword', error)
      toast.error('Link inválido ou expirado. Solicite um novo.')
    },
  })
}

export function useSwitchTenant() {
  const { setAuth } = useAuthStore()

  return useMutation({
    mutationFn: (tenantId: string) =>
      api
        .post<LoginResponse>('/auth/switch-tenant', { tenantId })
        .then((r) => r.data),
    onSuccess: (data) => {
      setAuth(
        { ...data.user, isSuperUser: false },
        data.tenant,
        data.accessToken,
      )
    },
    onError: (error) => {
      logError('useSwitchTenant', error)
      toast.error('Erro ao trocar de empresa. Tente novamente.')
    },
  })
}
