import { useAuthStore } from '@/store/auth.store'

export function DashboardPage() {
  const { user, tenant } = useAuthStore()
  const firstName = user?.name?.split(' ')[0]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Olá, {firstName}</h1>
      <p className="text-muted-foreground mt-1">{tenant?.name}</p>
      <p className="mt-8 text-sm text-muted-foreground">
        Configure o plano de contas para começar a lançar.
      </p>
    </div>
  )
}
