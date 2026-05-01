import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLogin, useSwitchTenant, type AuthTenant, type LoginResponse } from '@/lib/hooks/use-auth'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormData = z.infer<typeof schema>


export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const login = useLogin()
  const switchTenant = useSwitchTenant()

  const [pendingLogin, setPendingLogin] = useState<LoginResponse | null>(null)
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function onSubmit(data: FormData) {
    login.mutate(data, {
      onSuccess: (res) => {
        if (res.tenants.length > 1) {
          setSelectedTenantId(res.tenant.id)
          setPendingLogin(res)
        } else {
          setAuth({ ...res.user, isSuperUser: false }, res.tenant, res.accessToken)
          navigate('/')
        }
      },
    })
  }

  function handleTenantSelect() {
    if (!pendingLogin || !selectedTenantId) return

    if (selectedTenantId === pendingLogin.tenant.id) {
      setAuth(
        { ...pendingLogin.user, isSuperUser: false },
        pendingLogin.tenant,
        pendingLogin.accessToken,
      )
      navigate('/')
      return
    }

    switchTenant.mutate(selectedTenantId, {
      onSuccess: () => navigate('/'),
    })
  }

  return (
    <AuthLayout title="Entrar">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending && <Spinner className="mr-2" />}
          {login.isPending ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-1 text-sm text-center">
        <Link to="/forgot-password" className="text-muted-foreground hover:underline">
          Esqueci minha senha
        </Link>
        <Link to="/register" className="hover:underline">
          Criar conta
        </Link>
      </div>

      <Dialog
        open={!!pendingLogin}
        onOpenChange={(open) => { if (!open) setPendingLogin(null) }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Selecione a empresa</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {pendingLogin?.tenants.map((tenant: AuthTenant) => (
              <label
                key={tenant.id}
                className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary"
              >
                <input
                  type="radio"
                  name="tenant"
                  value={tenant.id}
                  checked={selectedTenantId === tenant.id}
                  onChange={() => setSelectedTenantId(tenant.id)}
                  className="accent-primary"
                />
                <span className="flex-1 font-medium">{tenant.name}</span>
                <span className="text-xs text-muted-foreground">
                  {tenant.roleName}
                </span>
              </label>
            ))}
          </div>

          <Button
            className="w-full"
            disabled={!selectedTenantId || switchTenant.isPending}
            onClick={handleTenantSelect}
          >
            {switchTenant.isPending && <Spinner className="mr-2" />}
            {switchTenant.isPending ? 'Aguarde...' : 'Continuar'}
          </Button>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  )
}
