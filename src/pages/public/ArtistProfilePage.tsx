import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getArtistById } from '@/services/artistService'
import { getAgentById } from '@/services/culturalAgentService'
import {
  ArrowLeft, MapPin, Star, CheckCircle, Music, Globe, ExternalLink,
  Calendar, Award, Briefcase, Play, FileText
} from 'lucide-react'
import type { SocialPlatform } from '@/types'

const platformIcons: Record<SocialPlatform, React.ReactNode> = {
  INSTAGRAM: <span className="text-sm">📸</span>,
  FACEBOOK: <span className="text-sm">📘</span>,
  YOUTUBE: <span className="text-sm">▶️</span>,
  TIKTOK: <Music size={16} />,
  SPOTIFY: <Music size={16} />,
  SOUNDCLOUD: <Music size={16} />,
  WEBSITE: <Globe size={16} />,
  LINKEDIN: <ExternalLink size={16} />,
  WHATSAPP: <ExternalLink size={16} />,
  PORTFOLIO: <Globe size={16} />,
  OUTRO: <ExternalLink size={16} />,
}

export function ArtistProfilePage() {
  const { id } = useParams<{ id: string }>()

  const { data: artist, isLoading } = useQuery({
    queryKey: ['artist-or-agent', id],
    queryFn: async () => {
      // 1. Tenta buscar da tabela cultural_agents (SMIIC oficial)
      try {
        const agent = await getAgentById(id!)
        if (agent) {
          const addr = Array.isArray((agent as any).agent_addresses)
            ? (agent as any).agent_addresses[0]
            : (agent as any).agent_addresses
          const firstTypology = (agent as any).agent_typologies?.[0]?.cultural_typologies?.name
          const firstArea = (agent as any).agent_areas?.[0]?.categories
          return {
            id: agent.id,
            artistic_name: agent.display_name || agent.legal_name,
            biography: agent.biography,
            photo_url: agent.photo_url,
            city: addr?.city || 'Água Boa',
            neighborhood: addr?.neighborhood,
            state: addr?.state || 'MT',
            is_verified: agent.registration_status === 'aprovado',
            categories: firstArea ? { name: firstArea.name, icon: firstArea.icon } : (firstTypology ? { name: firstTypology, icon: '🏛️' } : null),
            social_links: (agent as any).agent_social_links?.map((s: any) => ({
              platform: s.platform.toUpperCase(),
              url: s.url,
            })) ?? [],
            privacy_settings: (agent as any).agent_privacy ?? { show_phone: false, show_email: false, show_social: true },
            curriculum_url: agent.curriculum_url,
            is_smiic_agent: true,
            person_type: agent.person_type,
            collective_type: agent.collective_type,
          } as any
        }
      } catch (err) {
        console.warn('Erro ao buscar agente cultural:', err)
      }

      // 2. Fallback para tabela legado de artistas
      return getArtistById(id!)
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="skeleton h-8 w-32 mb-8" />
        <div className="card p-8">
          <div className="flex gap-6 mb-6">
            <div className="skeleton h-24 w-24 rounded-full flex-shrink-0" />
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

  if (!artist) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Artista não encontrado</h1>
        <Link to="/pesquisa" className="btn btn-primary">Voltar à pesquisa</Link>
      </div>
    )
  }

  const privacy = (artist as any).privacy_settings
  const profile = (artist as any).profiles
  const socialLinks = (artist as any).social_links ?? []
  const portfolio = (artist as any).portfolio_items ?? []
  const awards = (artist as any).artist_awards ?? []
  const projects = (artist as any).artist_projects ?? []

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      {/* Back */}
      <Link to="/pesquisa" className="inline-flex items-center gap-2 text-sm mb-8 hover:text-amber-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="h-4 w-4" />
        Voltar à pesquisa
      </Link>

      {/* Header card */}
      <div className="card p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Photo */}
          <div className="relative flex-shrink-0">
            {artist.photo_url ? (
              <img
                src={artist.photo_url}
                alt={artist.artistic_name ?? ''}
                className="h-28 w-28 rounded-2xl object-cover ring-4 ring-amber-500/20"
              />
            ) : (
              <div
                className="h-28 w-28 rounded-2xl flex items-center justify-center ring-4 ring-amber-500/20"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
              >
                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                  {(artist.artistic_name ?? 'A')[0].toUpperCase()}
                </span>
              </div>
            )}
            {artist.is_verified && (
              <div className="absolute -bottom-2 -right-2 flex items-center gap-1 badge badge-amber">
                <Star className="h-3 w-3 fill-current" />
                Verificado
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {artist.artistic_name ?? profile?.full_name}
            </h1>
            {artist.artistic_name && profile?.full_name && (
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                {profile.full_name}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {(artist as any).categories && (
                <span className="badge badge-amber">
                  {(artist as any).categories.icon} {(artist as any).categories.name}
                </span>
              )}
              {(artist as any).subcategories && (
                <span className="badge badge-blue">{(artist as any).subcategories.name}</span>
              )}
              {artist.is_available && (
                <span className="badge badge-green">
                  <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
                  Disponível para eventos
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="h-3.5 w-3.5" />
              {privacy?.show_location !== false && artist.neighborhood
                ? `${artist.neighborhood}, `
                : ''}
              {artist.city} - {artist.state}
            </div>

            {artist.musical_genre && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                🎵 {artist.musical_genre}
              </p>
            )}

            {/* Social links */}
            {privacy?.show_social !== false && socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {socialLinks.map((link: any) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 badge badge-slate hover:badge-amber transition-all"
                  >
                    {platformIcons[link.platform as SocialPlatform]}
                    {link.username ?? link.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Biography */}
        {artist.biography && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Biografia</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {artist.biography}
            </p>
          </div>
        )}
      </div>

      {/* Currículo / Portfólio em PDF do SMIIC */}
      {artist.curriculum_url && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            Currículo / Portfólio Artístico (PDF)
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Documento comprobatório e trajetória artística oficial disponibilizada pelo agente cultural.
          </p>
          <a
            href={artist.curriculum_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary inline-flex items-center gap-2 text-xs"
          >
            <ExternalLink size={14} />
            Visualizar Currículo Completo (PDF) ↗
          </a>
        </div>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Play className="h-5 w-5 text-amber-400" />
            Portfólio
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {portfolio.map((item: any) => (
              <a
                key={item.id}
                href={item.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg transition-all"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 bg-amber-500/10">
                  {item.type === 'VIDEO' && <Play className="h-5 w-5 text-amber-400" />}
                  {item.type === 'AUDIO' && <Music className="h-5 w-5 text-amber-400" />}
                  {item.type === 'IMAGEM' && <span className="text-lg">🖼️</span>}
                  {item.type === 'PDF' && <span className="text-lg">📄</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.title}</p>
                  {item.description && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Awards & Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {awards.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              Premiações e Reconhecimentos
            </h2>
            <div className="space-y-3">
              {awards.map((award: any) => (
                <div key={award.id} className="flex gap-3">
                  <div className="h-6 w-6 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
                    🏆
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{award.title}</p>
                    {award.institution && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {award.institution} {award.year && `· ${award.year}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-amber-400" />
              Projetos
            </h2>
            <div className="space-y-3">
              {projects.map((project: any) => (
                <div key={project.id}>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {project.title}
                        {project.is_ongoing && (
                          <span className="ml-2 badge badge-green text-xs">Em andamento</span>
                        )}
                      </p>
                      {project.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Experience */}
      {artist.experience_years && (
        <div className="card p-5 mt-6 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-amber-400" />
          <p className="text-sm text-slate-900 dark:text-white">
            <span className="font-semibold">{artist.experience_years} anos</span>
            <span style={{ color: 'var(--text-muted)' }}> de experiência na área cultural</span>
          </p>
        </div>
      )}
    </div>
  )
}
