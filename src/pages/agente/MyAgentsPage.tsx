import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getMyAgents, calculateCompletion } from '@/services/culturalAgentService'
import {
  Plus, User, MapPin, CheckCircle, Clock, XCircle,
  AlertCircle, ChevronRight, Tag
} from 'lucide-react'
import type { AgentRegistrationStatus } from '@/types'

const STATUS_CONFIG: Record<AgentRegistrationStatus, {
  label: string
  className: string
  icon: React.ReactNode
}> = {
  rascunho: {
    label: 'Rascunho',
    className: 'badge-slate',
    icon: <AlertCircle size={11} />,
  },
  enviado: {
    label: 'Enviado',
    className: 'badge-blue',
    icon: <Clock size={11} />,
  },
  em_analise: {
    label: 'Em análise',
    className: 'badge-amber',
    icon: <Clock size={11} />,
  },
  aprovado: {
    label: 'Aprovado',
    className: 'badge-green',
    icon: <CheckCircle size={11} />,
  },
  rejeitado: {
    label: 'Rejeitado',
    className: 'badge-red',
    icon: <XCircle size={11} />,
  },
  suspenso: {
    label: 'Suspenso',
    className: 'badge-red',
    icon: <XCircle size={11} />,
  },
}

export function MyAgentsPage() {
  const { user } = useAuth()

  const { data: agents, isLoading } = useQuery({
    queryKey: ['my-agents', user?.id],
    queryFn: () => getMyAgents(user!.id),
    enabled: !!user,
  })

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Meus Agentes Culturais
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Gerencie seus cadastros na plataforma
          </p>
        </div>
        <Link to="/painel/agentes/cadastrar" className="btn btn-primary">
          <Plus size={16} />
          <span className="hidden sm:inline">Novo agente</span>
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && (!agents || agents.length === 0) && (
        <div
          className="card p-10 text-center"
          style={{ borderStyle: 'dashed', borderColor: 'var(--border-light)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <User size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Nenhum agente cadastrado
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Cadastre seu perfil como agente cultural para aparecer no Mapa Cultural de Água Boa.
          </p>
          <Link to="/painel/agentes/cadastrar" className="btn btn-primary">
            <Plus size={16} />
            Cadastrar agente
          </Link>
        </div>
      )}

      {/* List */}
      {!isLoading && agents && agents.length > 0 && (
        <div className="space-y-3">
          {agents.map((agent) => {
            const completion = calculateCompletion(agent)
            const status = STATUS_CONFIG[agent.registration_status]

            return (
              <Link
                key={agent.id}
                to={`/painel/agentes/${agent.id}`}
                className="card card-glow p-4 flex items-center gap-4 group"
              >
                {/* Foto */}
                <div
                  className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  {agent.photo_url ? (
                    <img src={agent.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={22} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {agent.display_name || 'Sem nome'}
                    </p>
                    <span className={`badge ${status.className}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {(agent as any).address?.city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />
                        {(agent as any).address.city}
                      </span>
                    )}
                    {agent.typologies && agent.typologies.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag size={10} />
                        {agent.typologies.length} tipologia{agent.typologies.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      {agent.person_type === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </span>
                  </div>

                  {/* Completude */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
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

                <ChevronRight
                  size={16}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--accent)' }}
                />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
