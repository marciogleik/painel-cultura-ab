import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  icon?: LucideIcon
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** Faixa institucional larga (páginas públicas) ou cabeçalho compacto (painéis) */
  variant?: 'public' | 'panel'
}

export function PageHeader({ icon: Icon, eyebrow, title, description, actions, variant = 'panel' }: PageHeaderProps) {
  if (variant === 'public') {
    return (
      <section style={{ background: 'var(--bg-inst-header)', borderBottom: '1px solid var(--border-inst-header)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex items-start gap-4">
            {Icon && (
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <Icon size={24} style={{ color: 'var(--accent)' }} />
              </div>
            )}
            <div>
              {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>{eyebrow}</p>}
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-inst-title)' }}>{title}</h1>
              {description && <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: 'var(--text-inst-subtitle)' }}>{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </section>
    )
  }
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <Icon size={20} style={{ color: 'var(--accent)' }} />
          </div>
        )}
        <div>
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{eyebrow}</p>}
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          {description && <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
