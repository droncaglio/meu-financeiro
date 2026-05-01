import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface AuthLayoutProps {
  title: string
  children: React.ReactNode
}

export function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-center">
            Meu Financeiro
          </h1>
          <p className="text-lg font-semibold text-center">{title}</p>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  )
}
