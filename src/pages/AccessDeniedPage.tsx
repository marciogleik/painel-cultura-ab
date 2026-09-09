import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'

export function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center animate-slide-up">
        <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <ShieldOff className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Acesso Negado</h1>
        <p className="text-sm mb-8 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          Você não tem permissão para acessar esta página. 
          Entre em contato com a administração se precisar de acesso.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/painel" className="btn btn-primary">Ir para o Painel</Link>
          <Link to="/" className="btn btn-secondary">Página Inicial</Link>
        </div>
      </div>
    </div>
  )
}
