import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Bell, CheckCircle, Clock, FileText, Music2, Shield, ShoppingBag, Star, UserRound, Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useMyAgents } from '@/hooks/useMyAgent'
import { calculateCompletion, getMyNotifications } from '@/services/culturalAgentService'
import { getMyInscriptions } from '@/services/editalService'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/utils'
import { ErrorState } from '@/components/ui/EmptyState'
import type { AgentRegistrationStatus, InscriptionStatus } from '@/types'

const AGENT_STATUS: Record<AgentRegistrationStatus, { label: string; badge: string }> = {
  rascunho: { label: 'Rascunho', badge: 'badge-slate' },
  enviado: { label: 'Enviado', badge: 'badge-blue' },
  em_analise: { label: 'Em análise', badge: 'badge-amber' },
  aprovado: { label: 'Aprovado', badge: 'badge-green' },
  rejeitado: { label: 'Devolvido', badge: 'badge-red' },
  suspenso: { label: 'Suspenso', badge: 'badge-red' },
}

async function countOpenEditais(): Promise<number> {
  const { count, error } = await supabase
    .from('editais')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'PUBLICADO')
    .gte('end_date', todayISO())
  if (error) throw error
  return count ?? 0
}

export function ArtistDashboard() {
  const { user, profile } = useAuth()
  const { agents, isLoading: agentsLoading, error: agentsError, refetch: refetchAgents } = useMyAgents()
  const agentIds = agents.map((a) => a.id)

  const inscriptionsQuery = useQuery({
    queryKey: ['my-inscriptions', agentIds],
    queryFn: () => getMyInscriptions(agentIds),
    enabled: !agentsLoading && agentIds.length > 0,
  })

  const openEditaisQuery = useQuery({
    queryKey: ['open-editais-count'],
    queryFn: countOpenEditais,
    staleTime: 60_000,
  })

  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getMyNotifications(user!.id),
    enabled: !!user?.id,
  })

  const inscriptions = inscriptionsQuery.data ?? []
  const byStatus = inscriptions.reduce<Partial<Record<InscriptionStatus, number>>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1
    return acc
  }, {})

  const notifications = notificationsQuery.data ?? []
  const unread = notifications.filter((n) => !n.is_read).length
  const pendingInvites = notifications.filter((n) => n.type === 'membership_invite' && !n.is_read).length

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = profile?.full_name?.trim().split(/\s+/)[0]

  const stats = [
    { label: 'Minhas inscrições', value: inscriptions.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/painel/inscricoes' },
    { label: 'Aprovadas', value: byStatus.APROVADO ?? 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', href: '/painel/inscricoes' },
    { label: 'Em análise', value: (byStatus.EM_ANALISE ?? 0) + (byStatus.ABERTO ?? 0), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', href: '/painel/inscricoes' },
    { label: 'Editais abertos', value: openEditaisQuery.data ?? 0, icon: Music2, color: 'text-purple-400', bg: 'bg-purple-500/10', href: '/editais' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {firstName ? `${greeting}, ${firstName}!` : `${greeting}!`}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Bem-vindo(a) ao seu painel cultural
        </p>
      </div>

      {agentsError && <ErrorState error={agentsError} onRetry={() => refetchAgents()} className="mb-6" />}

      {(pendingInvites > 0 || unread > 0) && (
        <div className="card p-4 mb-6 flex items-center gap-3" style={{ borderColor: 'rgba(139,92,246,0.35)' }} role="status">
          <Bell className="h-5 w-5 text-violet-400 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>
            {pendingInvites > 0
              ? `Você tem ${pendingInvites === 1 ? '1 convite pendente' : `${pendingInvites} convites pendentes`} para participar de um agente coletivo.`
              : `Você tem ${unread === 1 ? '1 notificação nova' : `${unread} notificações novas`}.`}
            {' '}Use o sino no menu para responder.
          </p>
        </div>
      )}

      {/* Agentes culturais */}
      <section className="mb-8" aria-labelledby="dash-agents">
        <div className="flex items-center justify-between mb-3">
          <h2 id="dash-agents" className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Meus agentes culturais
          </h2>
          {agents.length > 0 && (
            <Link to="/painel/agentes" className="text-xs font-medium text-amber-500 hover:text-amber-400">Gerenciar</Link>
          )}
        </div>

        {agentsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true">
            <div className="skeleton h-28 rounded-2xl" />
            <div className="skeleton h-28 rounded-2xl" />
          </div>
        ) : agents.length === 0 ? (
          <div className="card p-6 border-amber-500/30" style={{ background: 'rgba(245,158,11,0.05)' }}>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 flex-shrink-0">
                <Star className="h-5 w-5 text-amber-400" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Cadastre seu Agente Cultural no SMIIC</h3>
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Faça o cadastro oficial com as tipologias culturais para participar de editais e aparecer no Mapa Cultural.
                </p>
                <Link to="/painel/agentes/cadastrar" className="btn btn-primary text-sm">
                  Fazer cadastro oficial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => {
              const completion = calculateCompletion(agent)
              const status = AGENT_STATUS[agent.registration_status] ?? { label: agent.registration_status, badge: 'badge-slate' }
              return (
                <Link key={agent.id} to={`/painel/agentes/${agent.id}`} className="card card-glow p-5 block">
                  <div className="flex items-start gap-3">
                    {agent.photo_url ? (
                      <img src={agent.photo_url} alt="" className="h-11 w-11 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-500/10" aria-hidden="true">
                        {agent.collective_type === 'coletivo' ? <Users className="h-5 w-5 text-amber-400" /> : <UserRound className="h-5 w-5 text-amber-400" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {agent.display_name ?? 'Agente sem nome'}
                        </h3>
                        <span className={`badge ${status.badge} text-xs`}>{status.label}</span>
                        {agent.is_primary && agents.length > 1 && <span className="badge badge-amber text-xs">Principal</span>}
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {agent.collective_type === 'coletivo' ? 'Coletivo' : 'Individual'} · {agent.person_type === 'juridica' ? 'Pessoa jurídica' : 'Pessoa física'}
                      </p>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          <span>Cadastro completo</span>
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{completion.percentage}%</span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'var(--bg-secondary)' }}
                          role="progressbar"
                          aria-valuenow={completion.percentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Cadastro ${completion.percentage}% completo`}
                        >
                          <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${completion.percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} to={href} className="card card-glow p-5 block">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-3`}>
              <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {(label === 'Editais abertos' ? openEditaisQuery.isLoading : inscriptionsQuery.isLoading) ? '…' : value}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </Link>
        ))}
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link to="/painel/agentes" className="card card-glow p-5 group">
          <UserRound className="h-6 w-6 text-amber-400 mb-3" aria-hidden="true" />
          <h3 className="text-sm font-semibold mb-1 group-hover:text-amber-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
            Meu Agente Cultural
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Dados cadastrais, tipologias e documentação oficial</p>
        </Link>
        <Link to="/editais" className="card card-glow p-5 group">
          <FileText className="h-6 w-6 text-blue-400 mb-3" aria-hidden="true" />
          <h3 className="text-sm font-semibold mb-1 group-hover:text-amber-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
            Editais abertos
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Encontrar e se inscrever em editais culturais</p>
        </Link>
        <Link to="/painel/produtos" className="card card-glow p-5 group">
          <ShoppingBag className="h-6 w-6 text-emerald-400 mb-3" aria-hidden="true" />
          <h3 className="text-sm font-semibold mb-1 group-hover:text-amber-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
            Produtos culturais
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Divulgar shows, peças, livros e exposições</p>
        </Link>
        <Link to="/painel/privacidade" className="card card-glow p-5 group">
          <Shield className="h-6 w-6 text-purple-400 mb-3" aria-hidden="true" />
          <h3 className="text-sm font-semibold mb-1 group-hover:text-amber-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
            Privacidade (LGPD)
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Controlar quais informações são públicas</p>
        </Link>
      </div>
    </div>
  )
}
