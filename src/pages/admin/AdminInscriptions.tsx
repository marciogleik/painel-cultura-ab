import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileCheck, CheckCircle, XCircle, Clock, Eye, Flag } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getAllInscriptions, updateInscriptionStatus } from '@/services/editalService'
import { errorMessage, formatDate, formatDateTime } from '@/lib/utils'
import type { Inscription, InscriptionStatus } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { AdminTable, IconButton, type AdminColumn } from '@/components/admin/AdminTable'

type Filter = InscriptionStatus | 'ALL'

const STATUS_LABELS: Record<InscriptionStatus, string> = {
  ABERTO: 'Enviada',
  EM_ANALISE: 'Em análise',
  APROVADO: 'Aprovada',
  REPROVADO: 'Reprovada',
  FINALIZADO: 'Finalizada',
}

const STATUS_BADGE: Record<InscriptionStatus, string> = {
  ABERTO: 'badge-blue',
  EM_ANALISE: 'badge-amber',
  APROVADO: 'badge-green',
  REPROVADO: 'badge-red',
  FINALIZADO: 'badge-slate',
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'EM_ANALISE', label: 'Em análise' },
  { value: 'ABERTO', label: 'Enviadas' },
  { value: 'APROVADO', label: 'Aprovadas' },
  { value: 'REPROVADO', label: 'Reprovadas' },
  { value: 'FINALIZADO', label: 'Finalizadas' },
  { value: 'ALL', label: 'Todas' },
]

/** Nome do agente: cadastro novo (cultural_agents) ou, para inscrições antigas, o artista legado. */
function applicantName(ins: Inscription): string {
  return ins.cultural_agents?.display_name ?? ins.artists?.artistic_name ?? ins.artists?.profiles?.full_name ?? 'Agente cultural'
}

export function AdminInscriptions() {
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('EM_ANALISE')
  const [selected, setSelected] = useState<Inscription | null>(null)
  const [notes, setNotes] = useState('')
  const [notesError, setNotesError] = useState<string | null>(null)

  const query = useQuery({ queryKey: ['all-inscriptions'], queryFn: getAllInscriptions })
  const inscriptions = useMemo(() => query.data ?? [], [query.data])

  const filtered = useMemo(() => (filter === 'ALL' ? inscriptions : inscriptions.filter((i) => i.status === filter)), [inscriptions, filter])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: inscriptions.length, ABERTO: 0, EM_ANALISE: 0, APROVADO: 0, REPROVADO: 0, FINALIZADO: 0 }
    inscriptions.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1 })
    return c
  }, [inscriptions])

  const mutation = useMutation({
    mutationFn: ({ id, status, reviewerNotes }: { id: string; status: InscriptionStatus; reviewerNotes?: string }) => updateInscriptionStatus(id, status, reviewerNotes),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['all-inscriptions'] })
      qc.invalidateQueries({ queryKey: ['my-inscriptions'] })
      qc.invalidateQueries({ queryKey: ['inscription-for-edital'] })
      toast.success(`Inscrição marcada como "${STATUS_LABELS[vars.status]}".`)
      setSelected(null)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function openReview(ins: Inscription) {
    setSelected(ins)
    setNotes(ins.reviewer_notes ?? '')
    setNotesError(null)
  }

  function decide(status: InscriptionStatus) {
    if (!selected) return
    if (status === 'REPROVADO' && !notes.trim()) {
      setNotesError('Informe o parecer com o motivo da reprovação.')
      return
    }
    setNotesError(null)
    mutation.mutate({ id: selected.id, status, reviewerNotes: notes.trim() || undefined })
  }

  const columns: AdminColumn<Inscription>[] = [
    {
      key: 'applicant', header: 'Agente cultural',
      render: (i) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }} aria-hidden="true">
            {i.cultural_agents?.photo_url ? <img src={i.cultural_agents.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{applicantName(i).charAt(0).toUpperCase()}</span>}
          </div>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{applicantName(i)}</span>
        </div>
      ),
    },
    { key: 'edital', header: 'Edital', render: (i) => i.editais?.title ?? '—' },
    { key: 'date', header: 'Enviada em', render: (i) => formatDate(i.submitted_at) },
    { key: 'status', header: 'Status', render: (i) => <span className={`badge text-xs ${STATUS_BADGE[i.status] ?? 'badge-slate'}`}>{STATUS_LABELS[i.status] ?? i.status}</span> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, align: 'right', render: (i) => <IconButton label={`${isAdmin ? 'Avaliar' : 'Ver'} inscrição de ${applicantName(i)}`} tone="primary" onClick={() => openReview(i)}><Eye size={15} /></IconButton> },
  ]

  const canDecide = isAdmin && selected && (selected.status === 'ABERTO' || selected.status === 'EM_ANALISE')

  return (
    <div className="animate-fade-in">
      <PageHeader icon={FileCheck} title="Inscrições em Editais" description="Avalie as inscrições enviadas pelos agentes culturais." />

      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filtrar por status">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`badge cursor-pointer transition-all ${filter === value ? 'badge-amber' : 'badge-slate'}`}
          >
            {label} ({counts[value] ?? 0})
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <SkeletonList rows={4} />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileCheck} title="Nenhuma inscrição encontrada" description={filter === 'ALL' ? 'As inscrições enviadas pelos agentes aparecerão aqui.' : 'Nenhuma inscrição com este status.'} />
      ) : (
        <AdminTable columns={columns} rows={filtered} caption="Inscrições em editais" onRowClick={openReview} />
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Inscrição de ${applicantName(selected)}` : ''}
        description={selected?.editais?.title}
        locked={mutation.isPending}
        footer={selected && (
          <>
            <button type="button" className="btn btn-secondary mr-auto" onClick={() => setSelected(null)}>Fechar</button>
            {canDecide && (
              <>
                {selected.status === 'ABERTO' && (
                  <LoadingButton type="button" className="btn btn-secondary" loading={mutation.isPending} onClick={() => decide('EM_ANALISE')}><Clock size={14} /> Em análise</LoadingButton>
                )}
                <LoadingButton type="button" className="btn btn-danger" loading={mutation.isPending} onClick={() => decide('REPROVADO')}><XCircle size={14} /> Reprovar</LoadingButton>
                <LoadingButton type="button" className="btn btn-primary" loading={mutation.isPending} onClick={() => decide('APROVADO')}><CheckCircle size={14} /> Aprovar</LoadingButton>
              </>
            )}
            {isAdmin && selected.status === 'APROVADO' && (
              <LoadingButton type="button" className="btn btn-secondary" loading={mutation.isPending} onClick={() => decide('FINALIZADO')}><Flag size={14} /> Finalizar</LoadingButton>
            )}
          </>
        )}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${STATUS_BADGE[selected.status] ?? 'badge-slate'}`}>{STATUS_LABELS[selected.status] ?? selected.status}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Enviada em {formatDateTime(selected.submitted_at)}</span>
              {selected.reviewed_at && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· Avaliada em {formatDateTime(selected.reviewed_at)}</span>}
            </div>

            <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Mensagem do agente</p>
              <p className="whitespace-pre-line" style={{ color: selected.notes ? 'var(--text-primary)' : 'var(--text-muted)' }}>{selected.notes || 'Nenhuma mensagem enviada.'}</p>
            </div>

            <div>
              <label htmlFor="inscription-notes" className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                Parecer da comissão {canDecide && <span className="normal-case font-normal" style={{ color: 'var(--text-muted)' }}>(obrigatório para reprovar)</span>}
              </label>
              <textarea
                id="inscription-notes"
                value={notes}
                onChange={(e) => { setNotes(e.target.value); if (notesError) setNotesError(null) }}
                rows={3}
                className="input w-full"
                placeholder="Observações que o agente cultural verá junto do resultado"
                readOnly={!isAdmin}
                aria-invalid={notesError ? true : undefined}
                aria-describedby={notesError ? 'inscription-notes-error' : undefined}
              />
              {notesError && <p id="inscription-notes-error" role="alert" className="text-xs mt-1" style={{ color: 'var(--error)' }}>{notesError}</p>}
              {!isAdmin && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Somente administradores podem avaliar inscrições.</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
