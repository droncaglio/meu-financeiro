import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRegister } from '@/lib/hooks/use-auth'

const schema = z.object({
  name: z.string().min(1, 'Informe seu nome'),
  email: z.string().email('Informe um e-mail válido'),
  password: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .max(100, 'A senha deve ter no máximo 100 caracteres'),
  companyName: z.string().min(1, 'Informe o nome da empresa'),
})

type FormData = z.infer<typeof schema>

function passwordStrength(password: string): { label: string; color: string; width: string } {
  if (password.length < 8) return { label: 'Fraca', color: 'bg-destructive', width: 'w-1/3' }
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[^a-zA-Z0-9]/.test(password)
  if (hasNumber && hasSymbol) return { label: 'Forte', color: 'bg-green-500', width: 'w-full' }
  if (hasNumber || hasSymbol) return { label: 'Média', color: 'bg-yellow-500', width: 'w-2/3' }
  return { label: 'Fraca', color: 'bg-destructive', width: 'w-1/3' }
}

export function RegisterPage() {
  const register_mutation = useRegister()
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' })
  const strength = passwordStrength(passwordValue)

  function onSubmit(data: FormData) {
    register_mutation.mutate(data, {
      onSuccess: () => setDone(true),
    })
  }

  if (done) {
    return (
      <AuthLayout title="Cadastro realizado">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle className="size-12 text-green-500" />
          <p className="text-sm text-muted-foreground">
            Enviamos um e-mail para você. Clique no link para ativar sua conta.
          </p>
          <Link to="/login" className="text-sm hover:underline">
            Voltar para o login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Crie sua conta">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" type="text" autoComplete="name" autoFocus {...register('name')} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          {passwordValue.length > 0 && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">{strength.label}</p>
            </div>
          )}
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="companyName">Nome da empresa</Label>
          <Input id="companyName" type="text" {...register('companyName')} />
          {errors.companyName && (
            <p className="text-sm text-destructive">{errors.companyName.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={register_mutation.isPending}
        >
          {register_mutation.isPending ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-center">
        Já tem conta?{' '}
        <Link to="/login" className="hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
