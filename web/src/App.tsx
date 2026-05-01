import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/store/auth.store'
import { useInitializeAuth } from '@/lib/hooks/use-initialize-auth'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-64">
      <p className="text-sm text-muted-foreground">{title} — em breve</p>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, isInitialized } = useAuthStore()
  if (!isInitialized) return null
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  useInitializeAuth()

  useEffect(() => {
    function onSessionExpired() {
      toast.error('Sua sessão expirou. Por favor, faça login novamente.')
    }
    window.addEventListener('auth:session-expired', onSessionExpired)
    return () => window.removeEventListener('auth:session-expired', onSessionExpired)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="entries" element={<ComingSoon title="Lançamentos" />} />
              <Route path="commitments" element={<ComingSoon title="Compromissos" />} />
              <Route path="accounts" element={<ComingSoon title="Plano de Contas" />} />
              <Route path="bank-accounts" element={<ComingSoon title="Contas Bancárias" />} />
              <Route path="settings" element={<ComingSoon title="Configurações" />} />
              <Route path="reports">
                <Route path="balance-sheet" element={<ComingSoon title="Balanço Patrimonial" />} />
                <Route path="income-statement" element={<ComingSoon title="Demonstração de Resultado" />} />
                <Route path="trial-balance" element={<ComingSoon title="Balancete de Verificação" />} />
                <Route path="indicators" element={<ComingSoon title="Indicadores" />} />
                <Route path="breakeven" element={<ComingSoon title="Ponto de Equilíbrio" />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
