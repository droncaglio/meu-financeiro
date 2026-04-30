import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForgotPassword } from '@/lib/hooks/use-auth'

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword()
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function onSubmit(data: FormData) {
    forgotPassword.mutate(data, {
      onSuccess: () => setDone(true),
      onError: () => setDone(true), // não revelar se o e-mail existe
    })
  }

  if (done) {
    return (
      <AuthLayout title="Verifique seu e-mail">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <MailCheck className="size-12 text-green-500" />
          <p className="text-sm text-muted-foreground">
            Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
          </p>
          <Link to="/login" className="text-sm hover:underline">
            Voltar para o login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Esqueci minha senha">
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

        <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
          {forgotPassword.isPending ? 'Enviando...' : 'Enviar link de redefinição'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-center">
        <Link to="/login" className="text-muted-foreground hover:underline">
          Voltar para o login
        </Link>
      </p>
    </AuthLayout>
  )
}
