import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'

export function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <main className="text-center animate-slide-up">
        <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <ShieldOff className="h-10 w-10" style={{ color: 'var(--error)' }} aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Acesso negado</h1>
        <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Você não tem permissão para acessar esta página.
          Entre em contato com a administração se precisar de acesso.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/painel" className="btn btn-primary">Ir para o painel</Link>
          <Link to="/" className="btn btn-secondary">Página inicial</Link>
        </div>
      </main>
    </div>
  )
}
