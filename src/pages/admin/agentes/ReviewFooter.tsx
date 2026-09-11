import { CheckCircle, XCircle, Search, Ban, Trash2 } from 'lucide-react'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import type { AgentRegistrationStatus } from '@/types'
import { decisionsFor, type ReviewDecision } from './shared'

interface ReviewFooterProps {
  status: AgentRegistrationStatus
  canWrite: boolean
  loading: boolean
  onClose: () => void
  onDecide: (decision: ReviewDecision) => void
  onDelete?: () => void
}

const BUTTONS: Record<ReviewDecision, { label: string; className: string; icon: typeof CheckCircle }> = {
  em_analise: { label: 'Colocar em análise', className: 'btn btn-secondary', icon: Search },
  rejeitado: { label: 'Devolver para ajustes', className: 'btn btn-danger', icon: XCircle },
  aprovado: { label: 'Homologar e aprovar', className: 'btn btn-primary', icon: CheckCircle },
  suspenso: { label: 'Suspender cadastro', className: 'btn btn-danger', icon: Ban },
}

/** Ações de homologação disponíveis para o status atual; só administradores decidem. */
export function ReviewFooter({ status, canWrite, loading, onClose, onDecide, onDelete }: ReviewFooterProps) {
  const decisions = canWrite ? decisionsFor(status) : []
  return (
    <>
      <button type="button" onClick={onClose} className="btn btn-secondary">Fechar</button>
      {canWrite && onDelete && (
        <button type="button" onClick={onDelete} disabled={loading} className="btn btn-ghost text-red-500" aria-label="Excluir cadastro do agente">
          <Trash2 size={14} /> Excluir
        </button>
      )}
      <span className="flex-1" aria-hidden="true" />
      {decisions.map((d) => {
        const b = BUTTONS[d]
        const Icon = b.icon
        return (
          <LoadingButton key={d} type="button" className={b.className} loading={loading} onClick={() => onDecide(d)}>
            <Icon size={14} /> {b.label}
          </LoadingButton>
        )
      })}
      {!canWrite && (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Somente administradores podem homologar.</span>
      )}
    </>
  )
}
