import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'
import { FullPageSpinner } from '@/components/ui/Spinner'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({ allowedRoles, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, profile, role, isLoading, profileError, signOut } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner label="Carregando sua conta..." />

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Sessão válida, mas sem perfil utilizável: não deixa passar para nenhuma área restrita.
  if (!profile || !role || profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
        <div className="card max-w-md w-full p-8 text-center">
          <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Não foi possível acessar sua conta
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {profileError ?? 'Seu perfil ainda não foi criado. Tente entrar novamente em alguns instantes.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => signOut()}>
            Sair
          </button>
        </div>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/acesso-negado" replace />
  }

  return <Outlet />
}
