import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children?: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/acesso-negado" replace />
  }

  // Support both children and Outlet patterns
  return children ? <>{children}</> : <Outlet />
}
