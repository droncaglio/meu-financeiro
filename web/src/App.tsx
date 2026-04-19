import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/store/auth.store'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/register" element={<div>Register Page</div>} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div>App Pages</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
