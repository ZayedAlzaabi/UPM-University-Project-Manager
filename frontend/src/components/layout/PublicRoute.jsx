import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function PublicRoute() {
  const { token } = useAuth()
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />
}
