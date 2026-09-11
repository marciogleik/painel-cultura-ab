import { useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, MapPin, Star, Music, Globe, ExternalLink, FileText, Users, UserPlus,
  Check, X, Loader2, Clock, User, Phone, MessageCircle, Building2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import {
  getPublicAgentById, getAgentMembers, requestAgentMembership, respondToInvite,
  getCurriculumUrl, getTypologyTree, flattenTypologyTree,
} from '@/services/culturalAgentService'
import { safeUrl, whatsappLink, formatPhone, errorMessage } from '@/lib/utils'
import type { SocialPlatform, PublicCulturalAgent } from '@/types'

const platformIcons: Record<SocialPlatform, React.ReactNode> = {
  INSTAGRAM: <span className="text-sm" aria-hidden="true">📸</span>,
  FACEBOOK: <span className="text-sm" aria-hidden="true">📘</span>,
  YOUTUBE: <span className="text-sm" aria-hidden="true">▶️</span>,
  TIKTOK: <Music size={16} aria-hidden="true" />,
  SPOTIFY: <Music size={16} aria-hidden="true" />,
  SOUNDCLOUD: <Music size={16} aria-hidden="true" />,
  WEBSITE: <Globe size={16} aria-hidden="true" />,
  LINKEDIN: <ExternalLink size={16} aria-hidden="true" />,
  WHATSAPP: <MessageCircle size={16} aria-hidden="true" />,
  PORTFOLIO: <Globe size={16} aria-hidden="true" />,
  OUTRO: <ExternalLink size={16} aria-hidden="true" />,
}

const platformLabels: Record<SocialPlatform, string> = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  YOUTUBE: 'YouTube',
  TIKTOK: 'TikTok',
  SPOTIFY: 'Spotify',
  SOUNDCLOUD: 'SoundCloud',
  WEBSITE: 'Site',
  LINKEDIN: 'LinkedIn',
  WHATSAPP: 'WhatsApp',
  PORTFOLIO: 'Portfólio',
  OUTRO: 'Link',
}

function agentKind(agent: PublicCulturalAgent): string {
  if (agent.collective_type === 'coletivo') return 'Coletivo / Grupo cultural'
  return agent.person_type === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'
}

export function ArtistProfilePage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { user } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestedRole, setRequestedRole] = useState('')
  const [requestMessage, setRequestMessage] = useState('')

  const { data: agent, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['public-agent', id],
    queryFn: () => getPublicAgentById(id!),
    enabled: !!id,
  })

  const { data: typologyMap } = useQuery({
    queryKey: ['typology-tree', 'agent'],
    queryFn: async () => flattenTypologyTree(await getTypologyTree('agent')),
    staleTime: 5 * 60 * 1000,
  })

  const { data: curriculumUrl } = useQuery({
    queryKey: ['agent-curriculum-url', id, agent?.curriculum_url],
    queryFn: () => getCurriculumUrl(agent?.curriculum_url),
    enabled: !!agent?.curriculum_url,
  })

  const isCollective = agent?.collective_type === 'coletivo'

  const { data: members = [] } = useQuery({
    queryKey: ['agent-public-members', id],
    queryFn: () => getAgentMembers(id!),
    enabled: !!id && !!agent,
    retry: false,
  })

  const myMembership = user ? members.find((m) => m.user_id === user.id) : null
  const acceptedMembers = members.filter((m) => m.invite_status === 'accepted')

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Faça login para solicitar entrada')
      return await requestAgentMembership(id!, requestedRole, requestMessage)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-public-members', id] })
      toast.success('Solicitação enviada com sucesso! O responsável pelo grupo receberá sua solicitação.')
      setRequestModalOpen(false)
      setRequestedRole('')
      setRequestMessage('')
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err, 'Erro ao enviar solicitação.'))
    },
  })

  const respondInviteMutation = useMutation({
    mutationFn: async ({ membershipId, accept }: { membershipId: string; accept: boolean }) => {
      await respondToInvite(membershipId, accept)
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['agent-public-members', id] })
      qc.invalidateQueries({ queryKey: ['my-agents'] })
      if (variables.accept) toast.success('Você aceitou o convite e agora faz parte do grupo!')
      else toast.info('Convite recusado.')
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err, 'Erro ao responder ao convite.'))
    },
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12" aria-busy="true">
        <div className="skeleton h-8 w-32 mb-8" />
        <div className="card p-8">
          <div className="flex gap-6 mb-6">
            <div className="skeleton h-28 w-28 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-6 w-1/2" />
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-4 w-1/4" />
            </div>
          </div>
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <EmptyState
          icon={Users}
          title="Agente cultural não encontrado"
          description="Este perfil não existe, não é público ou ainda não foi aprovado pela Secretaria."
          action={<Link to="/agentes" className="btn btn-primary">Voltar aos agentes culturais</Link>}
        />
      </div>
    )
  }

  const name = agent.display_name ?? 'Agente Cultural'
  const typologyPaths = (agent.typologies ?? [])
    .map((t) => ({ id: t.id, label: typologyMap?.get(t.typology_id)?.path.join(' › ') ?? t.cultural_typologies?.name ?? null }))
    .filter((t): t is { id: string; label: string } => !!t.label)
  const areas = (agent.areas ?? []).filter((a) => a.categories)
  const socialLinks = agent.show_social
    ? (agent.social_links ?? [])
        .map((l) => ({ ...l, href: safeUrl(l.url) }))
        .filter((l): l is typeof l & { href: string } => !!l.href)
    : []
  const wa = agent.phone ? whatsappLink(agent.phone, `Olá, ${name}! Encontrei seu perfil no SMIIC Água Boa.`) : null
  const place = [agent.neighborhood, agent.city ?? 'Água Boa'].filter(Boolean).join(', ')

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <Link
        to="/agentes"
        className="inline-flex items-center gap-2 text-sm mb-8 hover:text-amber-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar aos agentes culturais
      </Link>

      {/* Cabeçalho */}
      <div className="card p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="relative flex-shrink-0">
            {agent.photo_url ? (
              <img
                src={agent.photo_url}
                alt={`Foto de ${name}`}
                loading="lazy"
                className="h-28 w-28 rounded-2xl object-cover ring-4 ring-amber-500/20"
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-28 w-28 rounded-2xl flex items-center justify-center ring-4 ring-amber-500/20"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
              >
                <span className="text-4xl font-bold text-white">{name[0]?.toUpperCase() ?? 'A'}</span>
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 flex items-center gap-1 badge badge-amber">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              Verificado
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{name}</h1>
            <p className="text-sm mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              {isCollective ? <Users className="h-3.5 w-3.5" aria-hidden="true" /> : agent.person_type === 'juridica' ? <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> : <User className="h-3.5 w-3.5" aria-hidden="true" />}
              {agentKind(agent)}
            </p>

            {(areas.length > 0 || typologyPaths.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {areas.map((a) => (
                  <span key={a.id} className="badge badge-amber">
                    {a.categories?.icon ? `${a.categories.icon} ` : ''}{a.categories?.name}
                  </span>
                ))}
                {typologyPaths.map((t) => (
                  <span key={t.id} className="badge badge-slate">{t.label}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span>{place}{agent.state ? ` - ${agent.state}` : ''}</span>
            </div>

            {agent.phone && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <a href={`tel:${agent.phone}`} className="badge badge-slate gap-1.5 hover:opacity-80">
                  <Phone size={14} aria-hidden="true" />
                  {formatPhone(agent.phone)}
                </a>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="badge badge-green gap-1.5 hover:opacity-80"
                  >
                    <MessageCircle size={14} aria-hidden="true" />
                    WhatsApp
                  </a>
                )}
              </div>
            )}

            {socialLinks.length > 0 && (
              <ul className="flex flex-wrap gap-2 mt-4 list-none p-0 m-0" aria-label="Redes sociais">
                {socialLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 badge badge-slate hover:opacity-80 transition-all"
                    >
                      {platformIcons[link.platform] ?? platformIcons.OUTRO}
                      {link.username ?? platformLabels[link.platform] ?? link.platform}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {agent.biography && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Biografia</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
              {agent.biography}
            </p>
          </div>
        )}
      </div>

      {/* Currículo */}
      {agent.curriculum_url && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FileText className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Currículo / Portfólio Artístico
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Trajetória artística disponibilizada pelo agente cultural.
          </p>
          {curriculumUrl ? (
            <a
              href={curriculumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary inline-flex items-center gap-2 text-xs"
            >
              <ExternalLink size={14} aria-hidden="true" />
              Visualizar currículo (PDF)
            </a>
          ) : (
            <span className="text-xs inline-flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Preparando o documento...
            </span>
          )}
        </div>
      )}

      {/* Elenco & Integrantes */}
      {(isCollective || acceptedMembers.length > 0) && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" aria-hidden="true" />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Elenco & Integrantes ({acceptedMembers.length})
              </h2>
            </div>

            {isCollective && (
              <div>
                {!user ? (
                  <Link
                    to="/login"
                    state={{ from: location }}
                    className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <UserPlus size={14} aria-hidden="true" />
                    <span>Entrar para pedir participação</span>
                  </Link>
                ) : myMembership?.invite_status === 'accepted' ? (
                  <span className="badge badge-green text-xs py-1 px-2.5 flex items-center gap-1">
                    <Check size={12} aria-hidden="true" />
                    Você é integrante deste grupo
                  </span>
                ) : myMembership?.invite_status === 'requested' ? (
                  <span className="badge badge-amber text-xs py-1 px-2.5 flex items-center gap-1">
                    <Clock size={12} aria-hidden="true" />
                    Solicitação enviada (aguardando aprovação)
                  </span>
                ) : myMembership?.invite_status === 'pending' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-500 font-medium">Você foi convidado!</span>
                    <button
                      type="button"
                      onClick={() => respondInviteMutation.mutate({ membershipId: myMembership.id, accept: true })}
                      disabled={respondInviteMutation.isPending}
                      className="btn btn-primary text-xs py-1 px-2.5"
                    >
                      <Check size={12} aria-hidden="true" /> Aceitar
                    </button>
                    <button
                      type="button"
                      onClick={() => respondInviteMutation.mutate({ membershipId: myMembership.id, accept: false })}
                      disabled={respondInviteMutation.isPending}
                      className="btn btn-secondary text-xs py-1 px-2.5 text-red-500"
                    >
                      <X size={12} aria-hidden="true" /> Recusar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRequestModalOpen(true)}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow"
                  >
                    <UserPlus size={14} aria-hidden="true" />
                    <span>Pedir para participar</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {acceptedMembers.length === 0 ? (
            <p className="text-xs py-3 text-center border border-dashed rounded-xl" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
              Nenhum integrante público listado no momento.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 list-none p-0 m-0">
              {acceptedMembers.map((m) => (
                <li
                  key={m.id}
                  className="p-3 rounded-xl flex items-center gap-3 border transition-all"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 relative shadow-sm border"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  >
                    {m.profiles?.avatar_url ? (
                      <img src={m.profiles.avatar_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {m.profiles?.full_name || 'Artista'}
                    </p>
                    <p className="text-[11px] text-amber-500 truncate mt-0.5">
                      {m.artist_role || (m.role === 'owner' ? 'Diretor / Responsável' : 'Integrante')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Diálogo: solicitar entrada */}
      {requestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setRequestModalOpen(false) }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-membership-title"
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl border relative animate-scale-up"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent)' }}
                >
                  <UserPlus size={16} aria-hidden="true" />
                </div>
                <h3 id="request-membership-title" className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Solicitar entrada no grupo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                aria-label="Fechar"
                className="p-1 rounded-lg hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Envie uma solicitação para participar de <strong>{name}</strong>. Os responsáveis receberão sua notificação na plataforma para aprovação.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                requestMutation.mutate()
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="request-role" className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Sua função artística / papel no grupo *
                </label>
                <input
                  id="request-role"
                  type="text"
                  required
                  placeholder="Ex.: Ator, Bailarino, Músico, Cenógrafo, Produtor"
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value)}
                  className="input text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="request-message" className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Mensagem para os responsáveis (opcional)
                </label>
                <textarea
                  id="request-message"
                  rows={3}
                  placeholder="Apresente-se brevemente ou mencione seu interesse em participar do grupo..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="input text-sm resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setRequestModalOpen(false)} className="btn btn-secondary text-xs px-4">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={requestMutation.isPending || !requestedRole.trim()}
                  className="btn btn-primary text-xs px-4 flex items-center gap-1.5"
                >
                  {requestMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} aria-hidden="true" />
                      <span>Enviar solicitação</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
