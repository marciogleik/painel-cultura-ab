import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, ArrowRight, UserRound } from 'lucide-react'
import { useMyAgents } from '@/hooks/useMyAgent'
import { getMyInscriptions } from '@/services/editalService'
import { formatDate, formatDateTime } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { inscriptionStatusInfo } from './inscriptionStatus'

export function MyInscriptionsPage() {
  const { agents, isLoading: agentsLoading, error: agentsError, refetch: refetchAgents } = useMyAgents()
  const agentIds = agents.map((a) => a.id)

  const inscriptionsQuery = useQuery({
    queryKey: ['my-inscriptions', agentIds],
    queryFn: () => getMyInscriptions(agentIds),
    enabled: !agentsLoading && agentIds.length > 0,
  })

  const isLoading = agentsLoading || (agentIds.length > 0 && inscriptionsQuery.isLoading)
  const inscriptions = inscriptionsQuery.data ?? []
  const showAgentName = agents.length > 1

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={FileText}
        title="Minhas inscrições"
        description="Acompanhe o andamento das suas inscrições em editais e concursos."
        actions={
          <Link to="/editais" className="btn btn-primary text-sm">
            <FileText className="h-4 w-4" />
            Ver editais abertos
          </Link>
        }
      />

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : agentsError ? (
        <ErrorState error={agentsError} onRetry={() => refetchAgents()} />
      ) : inscriptionsQuery.isError ? (
        <ErrorState error={inscriptionsQuery.error} onRetry={() => inscriptionsQuery.refetch()} />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Cadastre seu Agente Cultural"
          description="Você precisa cadastrar seu Agente Cultural no SMIIC e ter o cadastro aprovado para se inscrever em editais."
          action={<Link to="/painel/agentes/cadastrar" className="btn btn-primary">Cadastrar Agente Cultural</Link>}
        />
      ) : inscriptions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma inscrição ainda"
          description="Encontre editais culturais abertos e faça sua inscrição."
          action={<Link to="/editais" className="btn btn-primary">Ver editais disponíveis</Link>}
        />
      ) : (
        <ul className="space-y-4">
          {inscriptions.map((inscription) => {
            const edital = inscription.editais
            const status = inscriptionStatusInfo(inscription.status)
            return (
              <li key={inscription.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`badge ${status.badge} text-xs`} title={status.description}>{status.label}</span>
                      {edital?.categories && (
                        <span className="badge badge-slate text-xs">
                          {edital.categories.icon} {edital.categories.name}
                        </span>
                      )}
                      {showAgentName && inscription.cultural_agents?.display_name && (
                        <span className="badge badge-slate text-xs inline-flex items-center gap-1">
                          <UserRound size={11} aria-hidden="true" />
                          {inscription.cultural_agents.display_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {edital?.title ?? 'Edital'}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Inscrição enviada em {formatDateTime(inscription.submitted_at)}
                      {inscription.reviewed_at && ` · Analisada em ${formatDateTime(inscription.reviewed_at)}`}
                      {edital?.end_date && ` · Prazo do edital: ${formatDate(edital.end_date)}`}
                    </p>
                    {inscription.reviewer_notes && (
                      <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        <p className="font-medium text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          Observações da comissão:
                        </p>
                        {inscription.reviewer_notes}
                      </div>
                    )}
                  </div>
                  <Link to={`/editais/${inscription.edital_id}`} className="btn btn-ghost text-xs flex-shrink-0">
                    Ver edital
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
