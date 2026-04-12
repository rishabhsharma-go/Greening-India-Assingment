import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export function ProtectedRoute() {
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated())
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])

  if (!hydrated) return null
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
