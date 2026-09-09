import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getMyArtistProfile } from '@/services/artistService'
import { User, Edit, MapPin, Star, ExternalLink } from 'lucide-react'
import type { SocialPlatform } from '@/types'

const platformEmoji: Record<SocialPlatform, string> = {
  INSTAGRAM: '📸',
  FACEBOOK: '📘',
  YOUTUBE: '▶️',
  TIKTOK: '🎵',
  SPOTIFY: '🎧',
  SOUNDCLOUD: '☁️',
  WEBSITE: '🌐',
  LINKEDIN: '💼',
  WHATSAPP: '💬',
  PORTFOLIO: '🎨',
  OUTRO: '🔗',
}

export function MyProfilePage() {
  const { user } = useAuth()

  const { data: artist, isLoading } = useQuery({
    queryKey: ['my-artist', user?.id],
    queryFn: () => getMyArtistProfile(user!.id),
    enabled: !!user,
  })

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="card p-8 space-y-4">
          <div className="skeleton h-20 w-20 rounded-full" />
          <div className="skeleton h-6 w-1/3" />
          <div className="skeleton h-4 w-full" />
        </div>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Meu Perfil</h1>
        <div className="card p-12 text-center">
          <User className="mx-auto h-16 w-16 mb-4 text-amber-500/40" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Você ainda não tem um perfil artístico</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Crie seu perfil para aparecer no banco de talentos municipal e participar de editais.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/painel/agentes/cadastrar" className="btn btn-primary">
              <User className="h-4 w-4" />
              Cadastrar como Agente Cultural (SMIIC)
            </Link>
            <Link to="/painel/editar-perfil" className="btn btn-secondary">
              <Edit className="h-4 w-4" />
              Perfil Artístico Simples
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const profile = (artist as any).profiles
  const category = (artist as any).categories
  const subcategory = (artist as any).subcategories
  const socialLinks = (artist as any).social_links ?? []
  const portfolio = (artist as any).portfolio_items ?? []
  const awards = (artist as any).artist_awards ?? []
  const projects = (artist as any).artist_projects ?? []

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meu Perfil</h1>
        <div className="flex items-center gap-2">
          <Link to={`/artistas/${artist.id}`} className="btn btn-ghost text-sm" target="_blank">
            <ExternalLink className="h-4 w-4" />
            Ver público
          </Link>
          <Link to="/painel/editar-perfil" className="btn btn-primary text-sm">
            <Edit className="h-4 w-4" />
            Editar
          </Link>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {artist.photo_url ? (
            <img
              src={artist.photo_url}
              alt={artist.artistic_name ?? ''}
              className="h-24 w-24 rounded-2xl object-cover ring-4 ring-amber-500/20 flex-shrink-0"
            />
          ) : (
            <div
              className="h-24 w-24 rounded-2xl flex items-center justify-center ring-4 ring-amber-500/20 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
            >
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {(artist.artistic_name ?? profile?.full_name ?? 'A')[0].toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {artist.artistic_name ?? profile?.full_name}
              </h2>
              {artist.is_verified && (
                <span className="badge badge-amber text-xs">
                  <Star className="h-3 w-3 fill-current" />
                  Verificado
                </span>
              )}
              {artist.is_available ? (
                <span className="badge badge-green text-xs">Disponível</span>
              ) : (
                <span className="badge badge-slate text-xs">Indisponível</span>
              )}
            </div>

            {artist.artistic_name && (
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{profile?.full_name}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              {category && (
                <span className="badge badge-amber">{category.icon} {category.name}</span>
              )}
              {subcategory && (
                <span className="badge badge-blue">{subcategory.name}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="h-3.5 w-3.5" />
              {artist.neighborhood ? `${artist.neighborhood}, ` : ''}{artist.city} - {artist.state}
            </div>

            {artist.musical_genre && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                🎵 {artist.musical_genre}
              </p>
            )}
          </div>
        </div>

        {artist.biography && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Biografia
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {artist.biography}
            </p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Portfólio', value: portfolio.length, icon: '🎭' },
          { label: 'Premiações', value: awards.length, icon: '🏆' },
          { label: 'Projetos', value: projects.length, icon: '📋' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xl mb-1">{icon}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {socialLinks.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Redes Sociais</h3>
          <div className="flex flex-wrap gap-2">
            {socialLinks.map((link: any) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="badge badge-slate hover:badge-amber transition-all"
              >
                {platformEmoji[link.platform as SocialPlatform]} {link.username ?? link.platform}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
