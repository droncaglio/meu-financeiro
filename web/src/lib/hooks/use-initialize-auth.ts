import { useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'

// Flag de módulo para prevenir múltiplas chamadas simultâneas de refresh
// (cobre o caso do StrictMode que monta/desmonta/remonta no desenvolvimento)
let isRefreshing = false

export function useInitializeAuth() {
  useEffect(() => {
    const { user, accessToken, setAccessToken, logout, setInitialized } =
      useAuthStore.getState()

    if (accessToken) {
      setInitialized()
      return
    }
    if (!user) {
      setInitialized()
      return
    }
    if (isRefreshing) {
      // Outra instância já está renovando; o finally dela chamará setInitialized
      return
    }

    isRefreshing = true
    axios
      .post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => setAccessToken(data.accessToken))
      .catch(() => logout())
      .finally(() => {
        isRefreshing = false
        setInitialized()
      })
  }, [])
}
