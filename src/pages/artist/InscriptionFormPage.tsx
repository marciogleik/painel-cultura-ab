import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock, CheckCircle2, FileText, Send, ShieldAlert } from 'lucide-react'
import { createInscription, getEditalById, getInscriptionForEdital, isEditalOpen } from '@/services/editalService'
import { useMyAgents } from '@/hooks/useMyAgent'
import { useToast } from '@/components/ui/Toast'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { daysUntil, errorMessage, formatDate } from '@/lib/utils'
import { inscriptionStatusInfo } from './inscriptionStatus'

export function InscriptionFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [notes, setNotes] = useState('')
  const [agentId, setAgentId] = useState('')
  const [success, setSuccess] = useState(false)

  const editalQuery = useQuery({
    queryKey: ['edital', id],
    queryFn: () => getEditalById(id!),
    enabled: !!id,
  })
  const edital = editalQuery.data ?? null

  const { approvedAgents, agents, isLoading: agentsLoading, error: agentsError, refetch: refetchAgents } = useMyAgents()

  // Agente selecionado: o principal aprovado por padrão
  useEffect(() => {
    if (!agentId && approvedAgents.length > 0) setAgentId(approvedAgents[0].id)
  }, [approvedAgents, agentId])

  const selectedAgent = approvedAgents.find((a) => a.id === agentId) ?? null

  const existingQuery = useQuery({
    queryKey: ['inscription-for-edital', id, agentId],
    queryFn: () => getInscriptionForEdital(id!, agentId),
    enabled: !!id && !!agentId,
  })
  const existing = existingQuery.data ?? null

  const mutation = useMutation({
    mutationFn: () => createInscription(edital!.id, agentId, notes.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-inscriptions'] })
      qc.invalidateQueries({ queryKey: ['inscription-for-edital', id] })
      toast.success('Inscrição enviada com sucesso.')
      setSuccess(true)
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Não foi possível enviar a inscrição.'))
    },
  })

  const backLink = (
    <Link
      to={`/editais/${id}`}
      className="inline-flex items-center gap-2 text-sm mb-6 hover:text-amber-400 transition-colors"
      style={{ color: 'var(--text-muted)' }}
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar ao edital
    </Link>
  )

  if (success) {
    return (
      <div className="animate-fade-in max-w-lg mx-auto text-center py-16">
        <div className="card p-10" role="status">
          <div className="mx-auto mb-4 h-16 w-16 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Inscrição realizada!</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Sua inscrição para <strong style={{ color: 'var(--text-primary)' }}>{edital?.title}</strong> foi enviada.
            Você pode acompanhar o status no painel.
          </p>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => navigate('/painel/inscricoes')} className="btn btn-primary w-full justify-center">
              Ver minhas inscrições
            </button>
            <Link to="/editais" className="btn btn-secondary w-full justify-center">
              Ver outros editais
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isLoading = editalQuery.isLoading || agentsLoading || (!!agentId && existingQuery.isLoading)

  let content: React.ReactNode
  if (isLoading) {
    content = <SkeletonList rows={3} />
  } else if (editalQuery.isError) {
    content = <ErrorState error={editalQuery.error} onRetry={() => editalQuery.refetch()} />
  } else if (agentsError) {
    content = <ErrorState error={agentsError} onRetry={() => refetchAgents()} />
  } else if (!edital) {
    content = (
      <EmptyState
        icon={FileText}
        title="Edital não encontrado"
        description="Este edital não existe ou não está mais disponível."
        action={<Link to="/editais" className="btn btn-primary">Ver editais</Link>}
      />
    )
  } else if (approvedAgents.length === 0) {
    content = (
      <EmptyState
        icon={ShieldAlert}
        title={agents.length === 0 ? 'Cadastre seu Agente Cultural' : 'Seu cadastro ainda não foi aprovado'}
        description={
          agents.length === 0
            ? 'Para se inscrever em editais é preciso cadastrar seu Agente Cultural no SMIIC e aguardar a aprovação da Secretaria de Cultura.'
            : 'Somente agentes culturais com cadastro aprovado pela Secretaria de Cultura podem se inscrever em editais. Acompanhe a situação do seu cadastro.'
        }
        action={
          <Link to={agents.length === 0 ? '/painel/agentes/cadastrar' : '/painel/agentes'} className="btn btn-primary">
            {agents.length === 0 ? 'Cadastrar Agente Cultural' : 'Ver meus agentes'}
          </Link>
        }
      />
    )
  } else if (!isEditalOpen(edital)) {
    const untilStart = daysUntil(edital.start_date)
    const notStarted = edital.status === 'PUBLICADO' && untilStart !== null && untilStart > 0
    content = (
      <EmptyState
        icon={CalendarClock}
        title={notStarted ? 'Inscrições ainda não abertas' : 'Inscrições encerradas'}
        description={
          notStarted
            ? `As inscrições para este edital abrem em ${formatDate(edital.start_date)}.`
            : `O prazo de inscrição deste edital terminou em ${formatDate(edital.end_date)} ou o edital não está mais publicado.`
        }
        action={<Link to="/editais" className="btn btn-primary">Ver outros editais</Link>}
      />
    )
  } else if (existingQuery.isError) {
    content = <ErrorState error={existingQuery.error} onRetry={() => existingQuery.refetch()} />
  } else {
    const status = existing ? inscriptionStatusInfo(existing.status) : null
    content = (
      <div className="space-y-5">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-amber-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{edital.title}</h2>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Inscrições até {formatDate(edital.end_date)}
            {(() => {
              const d = daysUntil(edital.end_date)
              return d === 0 ? ' (último dia)' : d === 1 ? ' (falta 1 dia)' : d && d > 1 ? ` (faltam ${d} dias)` : ''
            })()}
          </p>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Você está se inscrevendo como:</h3>
          {approvedAgents.length > 1 && (
            <div className="mb-4">
              <label htmlFor="inscription-agent" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Agente cultural
              </label>
              <select id="inscription-agent" className="input" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                {approvedAgents.map((a) => (
                  <option key={a.id} value={a.id}>{a.display_name ?? 'Agente sem nome'}</option>
                ))}
              </select>
            </div>
          )}
          {selectedAgent && (
            <div className="flex items-center gap-3">
              {selectedAgent.photo_url ? (
                <img src={selectedAgent.photo_url} alt="" className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
                  aria-hidden="true"
                >
                  <span className="font-bold text-white text-sm">
                    {(selectedAgent.display_name ?? '?').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selectedAgent.display_name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {[selectedAgent.address?.city, selectedAgent.address?.state].filter(Boolean).join(' - ') || 'Cadastro aprovado'}
                </p>
              </div>
            </div>
          )}
        </div>

        {existing && status ? (
          <div className="card p-5" role="status" style={{ borderColor: 'rgba(16,185,129,0.35)' }}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Você já está inscrito neste edital</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Enviada em {formatDate(existing.submitted_at)} · Situação:{' '}
                  <span className={`badge ${status.badge} text-xs`}>{status.label}</span>
                </p>
                <Link to="/painel/inscricoes" className="btn btn-secondary text-sm mt-3">Ver minhas inscrições</Link>
              </div>
            </div>
          </div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (!mutation.isPending) mutation.mutate()
            }}
          >
            <div className="card p-5">
              <label htmlFor="inscription-notes" className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Carta de apresentação / Observações
                <span className="font-normal ml-2" style={{ color: 'var(--text-muted)' }}>(opcional)</span>
              </label>
              <textarea
                id="inscription-notes"
                className="input"
                rows={5}
                maxLength={3000}
                placeholder="Conte por que você quer participar deste edital, projetos relevantes, expectativas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{notes.length}/3000</p>
            </div>

            {mutation.isError && (
              <div role="alert" className="p-3 rounded-lg text-sm text-red-400 border border-red-500/20 bg-red-500/5">
                {errorMessage(mutation.error, 'Não foi possível enviar a inscrição.')}
              </div>
            )}

            <LoadingButton type="submit" loading={mutation.isPending} className="btn btn-primary w-full justify-center py-3" disabled={!agentId}>
              {!mutation.isPending && <Send className="h-4 w-4" />}
              {mutation.isPending ? 'Enviando...' : 'Confirmar inscrição'}
            </LoadingButton>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-lg">
      {backLink}
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Nova inscrição</h1>
      {content}
    </div>
  )
}
