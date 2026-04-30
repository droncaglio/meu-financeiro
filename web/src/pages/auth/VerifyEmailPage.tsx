import { useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Loader2, XCircle } from 'lucide-react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { useVerifyEmail } from '@/lib/hooks/use-auth'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const verifyEmail = useVerifyEmail()

  useEffect(() => {
    if (!token) return
    verifyEmail.mutate(token, {
      onSuccess: () => navigate('/'),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!token) {
    return (
      <AuthLayout title="Link inválido">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <XCircle className="size-12 text-destructive" />
          <p className="text-sm text-muted-foreground">
            O link de verificação é inválido ou está incompleto.
          </p>
          <Link to="/login">
            <Button variant="outline">Voltar para o login</Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (verifyEmail.isPending) {
    return (
      <AuthLayout title="Verificando e-mail">
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="size-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aguarde um momento...</p>
        </div>
      </AuthLayout>
    )
  }

  if (verifyEmail.isError) {
    return (
      <AuthLayout title="Erro na verificação">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <XCircle className="size-12 text-destructive" />
          <p className="text-sm text-muted-foreground">
            O link expirou ou já foi utilizado. Solicite um novo cadastro.
          </p>
          <Link to="/login">
            <Button variant="outline">Voltar para o login</Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return null
}
