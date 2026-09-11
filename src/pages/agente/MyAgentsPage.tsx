import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, User, MapPin, ChevronRight, Tag, Star, Pencil, Eye } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useMyAgents } from '@/hooks/useMyAgent'
import { useToast } from '@/components/ui/Toast'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { calculateCompletion, setPrimaryAgent } from '@/services/culturalAgentService'
import { errorMessage } from '@/lib/utils'
import type { CulturalAgentWithRelations } from '@/types'
import { AGENT_STATUS, ROLE_LABELS, SUBMITTABLE_STATUSES } from './agentStatus'

export function MyAgentsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const { agents, isLoading, isError, error, refetch } = useMyAgents()

  const primaryMutation = useMutation({
    mutationFn: (agentId: string) => setPrimaryAgent(user!.id, agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-agents'] })
      toast.success('Perfil principal atualizado.')
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Não foi possível definir o perfil principal.')),
  })

  const individualAgents = agents.filter((a) => a.collective_type === 'individual')
  const companyAgents = agents.filter((a) => a.collective_type === 'coletivo')

  const renderAgentCard = (agent: CulturalAgentWithRelations) => (
    <AgentCard
      key={agent.id}
      agent={agent}
      onSetPrimary={() => primaryMutation.mutate(agent.id)}
      settingPrimary={primaryMutation.isPending && primaryMutation.variables === agent.id}
    />
  )

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Meus Perfis Culturais
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Gerencie seu perfil de artista e suas companhias de teatro, dança e coletivos
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/painel/agentes/cadastrar" className="btn btn-secondary text-xs sm:text-sm">
            <User size={14} aria-hidden="true" />
            <span>Artista Individual</span>
          </Link>
          <Link to="/painel/agentes/cadastrar?type=coletivo" className="btn btn-primary text-xs sm:text-sm shadow">
            <Plus size={14} aria-hidden="true" />
            <span>Nova Companhia / Grupo</span>
          </Link>
        </div>
      </div>

      {isLoading && <SkeletonList rows={2} />}

      {isError && <ErrorState error={error} onRetry={() => refetch()} />}

      {!isLoading && !isError && agents.length === 0 && (
        <div className="card p-10 text-center" style={{ borderStyle: 'dashed', borderColor: 'var(--border-light)' }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-secondary)' }}
            aria-hidden="true"
          >
            <User size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h2 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Nenhum perfil cadastrado
          </h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            Cadastre seu perfil como artista individual ou crie uma companhia de teatro, grupo de dança ou coletivo cultural.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/painel/agentes/cadastrar" className="btn btn-secondary">
              <User size={16} aria-hidden="true" />
              Perfil Individual
            </Link>
            <Link to="/painel/agentes/cadastrar?type=coletivo" className="btn btn-primary">
              <Plus size={16} aria-hidden="true" />
              Criar Companhia / Grupo
            </Link>
          </div>
        </div>
      )}

      {!isLoading && !isError && agents.length > 0 && (
        <>
          {/* 1. Perfil individual */}
          <section className="space-y-3" aria-labelledby="sec-individual">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={16} className="text-amber-500" aria-hidden="true" />
                <h2 id="sec-individual" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Meu Perfil Artístico Individual
                </h2>
              </div>
            </div>

            {individualAgents.length === 0 ? (
              <div
                className="p-5 rounded-xl text-center border border-dashed"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Você ainda não tem um perfil individual como artista ou produtor.
                </p>
                <Link
                  to="/painel/agentes/cadastrar"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-400"
                >
                  <Plus size={12} aria-hidden="true" />
                  Criar meu perfil de artista
                </Link>
              </div>
            ) : (
              <div className="space-y-3">{individualAgents.map(renderAgentCard)}</div>
            )}
          </section>

          {/* 2. Companhias e grupos */}
          <section className="space-y-3 pt-2" aria-labelledby="sec-grupos">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base" aria-hidden="true">🎪</span>
                <h2 id="sec-grupos" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Minhas Companhias & Grupos
                </h2>
              </div>
              <Link
                to="/painel/agentes/cadastrar?type=coletivo"
                className="text-xs text-amber-500 hover:text-amber-400 font-medium"
              >
                + Nova Companhia / Grupo
              </Link>
            </div>

            {companyAgents.length === 0 ? (
              <div
                className="p-6 rounded-xl text-center border border-dashed"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
              >
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Você ainda não gerencia nenhuma companhia ou grupo
                </p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  Cadastre sua companhia de teatro, grupo de dança ou banda para convidar e gerenciar artistas do elenco.
                </p>
                <Link
                  to="/painel/agentes/cadastrar?type=coletivo"
                  className="btn btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shadow"
                >
                  <Plus size={14} aria-hidden="true" />
                  Cadastrar Companhia / Grupo
                </Link>
              </div>
            ) : (
              <div className="space-y-3">{companyAgents.map(renderAgentCard)}</div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function AgentCard({
  agent,
  onSetPrimary,
  settingPrimary,
}: {
  agent: CulturalAgentWithRelations
  onSetPrimary: () => void
  settingPrimary: boolean
}) {
  const completion = calculateCompletion(agent)
  const status = AGENT_STATUS[agent.registration_status]
  const canContinue = SUBMITTABLE_STATUSES.includes(agent.registration_status)
  const role = agent.membership_role ? ROLE_LABELS[agent.membership_role] : null
  const typologyCount = agent.typologies?.length ?? 0
  const name = agent.display_name || 'Sem nome'

  return (
    <article className="card card-glow p-4" aria-label={name}>
      <div className="flex items-start gap-4">
        {/* Foto */}
        <Link
          to={`/painel/agentes/${agent.id}`}
          className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--bg-secondary)' }}
          aria-label={`Ver ${name}`}
        >
          {agent.photo_url ? (
            <img src={agent.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={22} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          )}
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <Link to={`/painel/agentes/${agent.id}`} className="font-semibold truncate hover:underline" style={{ color: 'var(--text-primary)' }}>
              {name}
            </Link>
            <span className={`badge ${status.color}`}>{status.label}</span>
            {agent.is_primary && (
              <span className="badge badge-amber text-[10px] inline-flex items-center gap-1">
                <Star size={10} aria-hidden="true" /> Principal
              </span>
            )}
            {agent.collective_type === 'coletivo' && (
              <span className="badge badge-slate text-[10px]">Companhia / Grupo</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
            {agent.address?.city && (
              <span className="flex items-center gap-1">
                <MapPin size={10} aria-hidden="true" />
                {agent.address.city}{agent.address.state ? `/${agent.address.state}` : ''}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Tag size={10} aria-hidden="true" />
              {typologyCount === 0 ? 'Sem tipologia' : `${typologyCount} tipologia${typologyCount > 1 ? 's' : ''}`}
            </span>
            <span>{agent.person_type === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}</span>
            {role && <span>Seu papel: {role}</span>}
          </div>

          {/* Completude */}
          <div className="mt-2 flex items-center gap-2">
            <div
              className="flex-1 h-1 rounded-full overflow-hidden"
              style={{ background: 'var(--border)' }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion.percentage}
              aria-label="Completude do perfil"
            >
              <div
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: `${completion.percentage}%`,
                  background: completion.percentage === 100
                    ? 'var(--success)'
                    : 'linear-gradient(90deg, var(--accent-dark), var(--accent-light))',
                }}
              />
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
              {completion.percentage}% completo
            </span>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap" style={{ borderTop: '1px solid var(--border)' }}>
        {canContinue && (
          <Link to={`/painel/agentes/${agent.id}/editar`} className="btn btn-primary text-xs py-1.5 px-3">
            <Pencil size={13} aria-hidden="true" />
            {agent.registration_status === 'rejeitado' ? 'Corrigir e reenviar' : 'Continuar cadastro'}
          </Link>
        )}
        <Link to={`/painel/agentes/${agent.id}`} className="btn btn-secondary text-xs py-1.5 px-3">
          <Eye size={13} aria-hidden="true" />
          Ver
        </Link>
        {!agent.is_primary && (
          <LoadingButton
            type="button"
            onClick={onSetPrimary}
            loading={settingPrimary}
            className="btn btn-secondary text-xs py-1.5 px-3 ml-auto"
          >
            <Star size={13} aria-hidden="true" />
            Definir como principal
          </LoadingButton>
        )}
        <Link
          to={`/painel/agentes/${agent.id}`}
          className={`p-1 ${agent.is_primary ? 'ml-auto' : ''}`}
          aria-hidden="true"
          tabIndex={-1}
        >
          <ChevronRight size={16} style={{ color: 'var(--accent)' }} />
        </Link>
      </div>
    </article>
  )
}
