import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  /** Título do card (h1). Omita quando o conteúdo já traz o próprio título. */
  title?: string
  /** Texto de apoio abaixo do título */
  subtitle?: ReactNode
  children: ReactNode
}

/**
 * Casca compartilhada das páginas de autenticação: fundo, logotipo da Secretaria,
 * card central e crédito institucional no rodapé.
 */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-1/4 -right-40 h-96 w-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }}
        />
        <div
          className="absolute bottom-1/4 -left-40 h-96 w-96 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }}
        />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <img
              src="/logo-secretaria.jpg"
              alt="Secretaria de Esporte, Cultura, Lazer e Eventos - Prefeitura de Água Boa"
              className="h-20 w-auto object-contain"
            />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
              Plataforma Municipal de Cultura
            </span>
          </Link>
        </div>

        <div className="card p-8">
          {title && (
            <h1 className={`text-xl font-bold text-center ${subtitle ? 'mb-2' : 'mb-6'}`} style={{ color: 'var(--text-primary)' }}>
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
          )}
          {children}
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Sistema seguro — Prefeitura Municipal de Água Boa
        </p>
      </div>
    </div>
  )
}
