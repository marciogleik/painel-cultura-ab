import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle, Inbox } from 'lucide-react'
import { errorMessage } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`card p-10 text-center ${className}`}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
        <Icon size={26} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {description && <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

/** Estado de erro de uma query: mostra a mensagem e permite tentar de novo. */
export function ErrorState({ error, onRetry, className = '' }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={`card p-6 flex flex-col sm:flex-row sm:items-center gap-4 ${className}`} style={{ borderColor: 'rgba(220,38,38,0.35)' }}>
      <AlertCircle size={22} className="flex-shrink-0" style={{ color: 'var(--error)' }} />
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Não foi possível carregar</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{errorMessage(error)}</p>
      </div>
      {onRetry && <button type="button" className="btn btn-secondary text-sm" onClick={onRetry}>Tentar novamente</button>}
    </div>
  )
}
