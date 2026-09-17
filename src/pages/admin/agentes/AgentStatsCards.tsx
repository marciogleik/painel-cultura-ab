import { Layers, Clock, Search, CheckCircle, AlertCircle, Ban } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AgentRegistrationStatus } from '@/types'

type Counts = Record<AgentRegistrationStatus, number>

interface AgentStatsCardsProps {
  counts?: Counts
  isLoading?: boolean
  active: AgentRegistrationStatus | ''
  onSelect: (status: AgentRegistrationStatus | '') => void
}

const CARDS: { status: AgentRegistrationStatus | ''; label: string; icon: LucideIcon; color: string; bg: string }[] = [
  { status: '', label: 'Total cadastrados', icon: Layers, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { status: 'enviado', label: 'Aguardando homologação', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { status: 'em_analise', label: 'Em análise', icon: Search, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { status: 'aprovado', label: 'Aprovados', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { status: 'rejeitado', label: 'Devolvidos p/ ajuste', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  { status: 'suspenso', label: 'Suspensos', icon: Ban, color: 'text-slate-500', bg: 'bg-slate-500/10' },
]

/** Contadores por status (base inteira, não só a página atual). Cada card filtra a lista. */
export function AgentStatsCards({ counts, isLoading, active, onSelect }: AgentStatsCardsProps) {
  const total = counts ? Object.values(counts).reduce((s, n) => s + n, 0) : 0
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6" role="group" aria-label="Agentes por status">
      {CARDS.map(({ status, label, icon: Icon, color, bg }) => {
        const value = status === '' ? total : counts?.[status] ?? 0
        const selected = active === status
        return (
          <button
            key={status || 'all'}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(status)}
            className={`card p-4 flex items-center gap-3 text-left transition-all ${selected ? 'ring-2 ring-amber-500/50' : ''}`}
            aria-busy={isLoading}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
              <Icon size={24} className={color} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <div className="skeleton h-8 w-12 rounded mb-1" />
              ) : (
                <p className="text-3xl font-bold leading-tight tracking-tight mb-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
              )}
              <p className="text-sm font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--text-muted)' }} title={label}>{label}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
