import { cn } from '@/lib/utils'

export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={cn('inline-block animate-spin rounded-full border-2 border-amber-500 border-t-transparent', className)}
      style={{ width: size, height: size }}
    />
  )
}

export function FullPageSpinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex flex-col items-center gap-3">
        <Spinner size={40} className="border-4" />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      </div>
    </div>
  )
}

/** Placeholder de conteúdo em carregamento (grade de cards ou linhas). */
export function SkeletonList({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-16 rounded-xl" />
      ))}
    </div>
  )
}

export function SkeletonGrid({ items = 6, className = '' }: { items?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)} aria-busy="true">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="skeleton h-56 rounded-2xl" />
      ))}
    </div>
  )
}
