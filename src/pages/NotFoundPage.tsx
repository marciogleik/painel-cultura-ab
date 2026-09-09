import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center animate-slide-up">
        <p className="text-8xl font-bold gradient-text mb-4">404</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Página não encontrada</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          A página que você procura não existe ou foi movida.
        </p>
        <Link to="/" className="btn btn-primary">Voltar ao início</Link>
      </div>
    </div>
  )
}
