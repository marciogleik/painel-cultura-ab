import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <main className="text-center animate-slide-up">
        <p className="text-8xl font-bold gradient-text mb-4" aria-hidden="true">404</p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Página não encontrada</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          A página que você procura não existe ou foi movida.
        </p>
        <Link to="/" className="btn btn-primary">Voltar ao início</Link>
      </main>
    </div>
  )
}
