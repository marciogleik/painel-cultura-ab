import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getMyAgents } from '@/services/culturalAgentService'
import {
  Users, User, ArrowRight, Star, Sparkles, Mic2,
  ChevronLeft, ChevronRight, Building2, Calendar, BookOpen,
  Trophy, Wrench, Flag, ShoppingBag, GraduationCap
} from 'lucide-react'

// ── Carousel ──────────────────────────────────────────────────────────────────

// Slides padrão usados como fallback quando não há dados no banco
const FALLBACK_SLIDES = [
  {
    image_url: '/carousel-ballet.jpg',
    title: 'Balé e Dança',
    subtitle: 'Arte em movimento — espetáculos que encantam',
    link_url: '/artistas',
    link_label: 'Ver Artistas',
  },
  {
    image_url: '/carousel-teatro.jpg',
    title: 'Teatro',
    subtitle: 'O palco da cultura e da expressão popular',
    link_url: '/espacos',
    link_label: 'Espaços Culturais',
  },
  {
    image_url: '/carousel-musicos.jpg',
    title: 'Música',
    subtitle: 'Violeiros, cantores, bandas e muito mais',
    link_url: '/artistas',
    link_label: 'Descobrir Artistas',
  },
  {
    image_url: '/carousel-capoeira.jpg',
    title: 'Capoeira',
    subtitle: 'Cultura viva, raízes brasileiras em movimento',
    link_url: '/artistas',
    link_label: 'Ver Artistas',
  },
]

function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Busca slides dinâmicos do banco de dados
  const { data: dbSlides } = useQuery({
    queryKey: ['hero-carousel'],
    queryFn: async () => {
      const { data } = await supabase
        .from('carousel_images')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      return data ?? []
    },
  })

  // Usa slides do banco se disponíveis, senão usa fallback
  const slides = (dbSlides && dbSlides.length > 0) ? dbSlides : FALLBACK_SLIDES

  const go = useCallback((idx: number) => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrent(idx)
    setTimeout(() => setIsAnimating(false), 600)
  }, [isAnimating])

  const prev = () => go((current - 1 + slides.length) % slides.length)
  const next = useCallback(() => go((current + 1) % slides.length), [current, go, slides.length])

  useEffect(() => {
    // Reset para o primeiro slide se o número de slides mudar
    setCurrent(0)
  }, [slides.length])

  useEffect(() => {
    const interval = setInterval(next, 5000)
    return () => clearInterval(interval)
  }, [next])

  const slide = slides[current] ?? slides[0]
  if (!slide) return null

  return (
    <div className="relative overflow-hidden" style={{ height: '520px' }}>
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${slide.image_url})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 text-amber-300 border border-amber-500/40 bg-amber-500/10">
            <Sparkles className="h-3.5 w-3.5" />
            SMIIC · Água Boa - MT
          </div>
          <h2
            className="text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
          >
            {slide.title}
          </h2>
          <p className="text-lg text-white/80 mb-6">{slide.subtitle}</p>
          {slide.link_url && (
            <Link
              to={slide.link_url}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all"
              style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(217,119,6,0.4)' }}
            >
              {slide.link_label || 'Saiba mais'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all"
        aria-label="Anterior"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all"
        aria-label="Próximo"
      >
        <ChevronRight size={22} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`rounded-full transition-all ${i === current ? 'w-8 h-2.5 bg-amber-400' : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'}`}
          />
        ))}
      </div>
    </div>
  )
}

// ── 8 Módulos Culturais ────────────────────────────────────────────────────────

const MODULES = [
  {
    icon: Users,
    label: 'Agentes Culturais',
    desc: 'Artistas, músicos, atores e criadores',
    link: '/artistas',
    color: '#1d4ed8',
    bg: '#eff6ff',
  },
  {
    icon: Building2,
    label: 'Espaços Culturais',
    desc: 'Teatros, museus e centros culturais',
    link: '/espacos',
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    icon: Calendar,
    label: 'Eventos Culturais',
    desc: 'Shows, peças e festivais',
    link: '/eventos',
    color: '#059669',
    bg: '#f0fdf4',
  },
  {
    icon: GraduationCap,
    label: 'Projetos Culturais',
    desc: 'Iniciativas e programas culturais',
    link: '/projetos',
    color: '#d97706',
    bg: '#fffbeb',
  },
  {
    icon: BookOpen,
    label: 'Biblioteca Pública',
    desc: 'Acervo, horários e informações',
    link: '/biblioteca',
    color: '#0891b2',
    bg: '#ecfeff',
  },
  {
    icon: Trophy,
    label: 'Concursos Culturais',
    desc: 'Editais e oportunidades abertas',
    link: '/concursos',
    color: '#dc2626',
    bg: '#fef2f2',
  },
  {
    icon: Wrench,
    label: 'Oficinas Culturais',
    desc: 'Cursos, workshops e capacitações',
    link: '/oficinas',
    color: '#9333ea',
    bg: '#faf5ff',
  },
  {
    icon: Flag,
    label: 'Símbolos Municipais',
    desc: 'Bandeira, brasão, hino e patrimônio',
    link: '/simbolos',
    color: '#0f766e',
    bg: '#f0fdfa',
  },
]

export function HomePage() {
  const { user } = useAuth()

  const { data: myAgents } = useQuery({
    queryKey: ['my-agents', user?.id],
    queryFn: () => getMyAgents(user!.id),
    enabled: !!user,
  })
  const hasAgent = (myAgents?.length ?? 0) > 0

  const { data: stats } = useQuery({
    queryKey: ['home-stats'],
    queryFn: async () => {
      const [agents, artists, editais, categories] = await Promise.all([
        supabase.from('cultural_agents').select('*', { count: 'exact', head: true }).eq('is_public', true).eq('registration_status', 'aprovado'),
        supabase.from('artists').select('*', { count: 'exact', head: true }).eq('is_public', true),
        supabase.from('editais').select('*', { count: 'exact', head: true }).eq('status', 'PUBLICADO'),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
      ])
      return {
        artists: (agents.count ?? 0) + (artists.count ?? 0),
        editais: editais.count ?? 0,
        categories: categories.count ?? 0,
      }
    },
  })

  const { data: featuredArtists } = useQuery({
    queryKey: ['featured-artists'],
    queryFn: async () => {
      // Prioriza agentes culturais oficiais do SMIIC
      const { data: agents } = await supabase
        .from('cultural_agents')
        .select('id, display_name, legal_name, photo_url, agent_addresses(city), agent_typologies(cultural_typologies(name))')
        .eq('is_public', true)
        .eq('registration_status', 'aprovado')
        .limit(6)

      if (agents && agents.length > 0) {
        return agents.map((a: any) => ({
          id: a.id,
          artistic_name: a.display_name || a.legal_name,
          photo_url: a.photo_url,
          city: a.agent_addresses?.[0]?.city ?? a.agent_addresses?.city ?? 'Água Boa',
          category_label: a.agent_typologies?.[0]?.cultural_typologies?.name ?? 'Agente Cultural (SMIIC)',
        }))
      }

      // Fallback legado se não houver agentes SMIIC cadastrados
      const { data: legacy } = await supabase
        .from('artists')
        .select('id, artistic_name, photo_url, city, categories(name, icon), profiles(full_name)')
        .eq('is_public', true)
        .eq('status', 'ATIVO')
        .limit(6)

      return (legacy ?? []).map((art: any) => ({
        id: art.id,
        artistic_name: art.artistic_name || art.profiles?.full_name,
        photo_url: art.photo_url,
        city: art.city || 'Água Boa',
        category_label: art.categories?.name ?? 'Artista',
      }))
    },
  })

  const { data: featuredProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cultural_products')
        .select('id, title, type, cover_url, description, artists(artistic_name, photo_url)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .limit(4)
      return data ?? []
    },
  })

  const { data: upcomingEvents } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cultural_events')
        .select('id, title, type, start_date, location, cover_url, is_free')
        .eq('is_active', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date')
        .limit(3)
      return data ?? []
    },
  })

  const PRODUCT_TYPE_LABELS: Record<string, string> = {
    peca_teatro: 'Peça de Teatro',
    show: 'Show',
    album: 'Álbum',
    livro: 'Livro',
    exposicao: 'Exposição',
    filme: 'Filme',
    danca: 'Dança',
    artesanato: 'Artesanato',
    grafite: 'Grafite',
    outro: 'Produto Cultural',
  }

  return (
    <div className="animate-fade-in">

      {/* ── Carrossel Hero ── */}
      <HeroCarousel />

      {/* ── Stats bar ── */}
      <div style={{ background: 'var(--bg-inst-header)', borderBottom: '1px solid var(--border-inst-header)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
            {[
              { value: stats?.artists ?? 0, label: 'Agentes Culturais' },
              { value: stats?.editais ?? 0, label: 'Editais Abertos' },
              { value: stats?.categories ?? 0, label: 'Categorias' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{value}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-inst-subtitle)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 8 Módulos Culturais ── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 border" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--bg-secondary)' }}>
            <Sparkles className="h-3 w-3" />
            SMIIC · Sistema Municipal de Informações e Indicadores Culturais
          </div>
          <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Módulos Culturais
          </h2>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Acesse todos os serviços da plataforma municipal de cultura
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MODULES.map(({ icon: Icon, label, desc, link, color, bg }) => (
            <Link
              key={link}
              to={link}
              className="group flex flex-col items-center text-center p-5 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-1"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl mb-3 transition-transform group-hover:scale-110"
                style={{ background: bg, border: `2px solid ${color}20` }}
              >
                <Icon size={26} style={{ color }} />
              </div>
              <p className="text-sm font-bold leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                {label}
              </p>
              <p className="text-xs leading-snug hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
                {desc}
              </p>
            </Link>
          ))}
        </div>

        {/* CTA Cadastro de Agente Cultural */}
        <div className="mt-10 relative overflow-hidden rounded-3xl" style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #f59e0b 100%)',
        }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)' }}
          />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 p-8">
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
                <Mic2 className="h-3 w-3" />
                Você é artista, músico, ator, dançarino, artesão?
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-1">
                Cadastre-se como<br />Agente Cultural
              </h3>
              <p className="text-sm text-white/80 max-w-sm">
                Apareça no Mapa Cultural da cidade, acesse editais e conecte-se com a Secretaria de Cultura.
              </p>
            </div>
            <Link
              to="/painel/agentes/novo"
              id="btn-cadastro-agente-cultural"
              className="flex-shrink-0 inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-extrabold transition-all hover:scale-105 active:scale-95 shadow-xl"
              style={{ background: '#ffffff', color: '#7c3aed' }}
            >
              <Users className="h-5 w-5" />
              Fazer meu Cadastro
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Produtos Culturais em Destaque ── */}
      <section className="py-14" style={{ background: 'var(--bg-secondary)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                <ShoppingBag className="inline-block mr-2 text-amber-500" size={22} />
                Produtos Culturais
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Peças, shows, álbuns e obras dos nossos artistas
              </p>
            </div>
            <Link
              to="/produtos"
              className="hidden sm:flex items-center gap-1 text-sm font-semibold transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              Ver todos
              <ArrowRight size={16} />
            </Link>
          </div>

          {featuredProducts && featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProducts.map((product: any) => (
                <div
                  key={product.id}
                  className="group rounded-2xl overflow-hidden border transition-all hover:shadow-lg hover:-translate-y-1"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 overflow-hidden">
                    {product.cover_url ? (
                      <img src={product.cover_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={40} className="text-amber-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                      {PRODUCT_TYPE_LABELS[product.type] ?? product.type}
                    </span>
                    <h3 className="font-bold text-sm leading-snug mb-1" style={{ color: 'var(--text-primary)' }}>{product.title}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {(product.artists as any)?.artistic_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
              <ShoppingBag size={40} className="mx-auto mb-3 text-amber-300" />
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Produtos culturais em breve</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Os artistas poderão cadastrar suas obras aqui</p>
            </div>
          )}

          <div className="text-center mt-8 sm:hidden">
            <Link to="/produtos" className="btn btn-secondary">
              Ver todos os produtos
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Artistas em Destaque ── */}
      <section className="py-14 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              <Star className="inline-block mr-2 text-amber-500 fill-current" size={22} />
              Agentes Culturais
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Talentos cadastrados no município de Água Boa
            </p>
          </div>
          <Link
            to="/artistas"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            Ver todos
            <ArrowRight size={16} />
          </Link>
        </div>

        {featuredArtists && featuredArtists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredArtists.map((artist: any) => (
              <Link
                key={artist.id}
                to={`/artistas/${artist.id}`}
                className="group text-center p-4 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-1"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <div className="mx-auto w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-amber-200 to-orange-300 mb-3 ring-2 ring-offset-2 group-hover:ring-amber-400 transition-all" style={{ '--tw-ring-offset-color': 'var(--bg-card)' } as React.CSSProperties}>
                  {artist.photo_url ? (
                    <img src={artist.photo_url} alt={artist.artistic_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xl font-bold text-white">
                        {(artist.artistic_name || (artist.profiles as any)?.full_name || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-bold leading-tight mb-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
                  {artist.artistic_name || (artist.profiles as any)?.full_name}
                </p>
                <p className="text-xs truncate font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {artist.category_label || (artist.categories as any)?.name || 'Agente Cultural'}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <Users size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhum artista verificado ainda</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Seja o primeiro a{' '}
              <Link
                to={user ? (hasAgent ? '/painel' : '/painel/agentes/cadastrar') : '/cadastro'}
                className="font-semibold"
                style={{ color: 'var(--accent)' }}
              >
                cadastrar seu perfil
              </Link>
            </p>
          </div>
        )}
      </section>

      {/* ── Próximos Eventos ── */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <section className="py-14" style={{ background: 'var(--bg-secondary)' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  <Calendar className="inline-block mr-2 text-emerald-500" size={22} />
                  Próximos Eventos
                </h2>
              </div>
              <Link to="/eventos" className="hidden sm:flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                Agenda completa <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {upcomingEvents.map((event: any) => (
                <Link
                  key={event.id}
                  to="/eventos"
                  className="group flex gap-4 p-4 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-1"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center">
                    {event.cover_url ? (
                      <img src={event.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Calendar size={22} className="text-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(event.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      {event.location && ` · ${event.location}`}
                    </p>
                    {event.is_free && (
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Gratuito
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Final ── */}
      <section className="py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-10 text-center" style={{ background: 'linear-gradient(135deg, var(--bg-inst-header), #1e3a6e)' }}>
          <Mic2 className="mx-auto mb-4 text-amber-400" size={40} />
          <h2 className="text-3xl font-bold text-white mb-3">
            Faça parte da cultura de Água Boa
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Cadastre seu perfil artístico, divulgue seus produtos culturais, participe de editais e conecte-se com a gestão cultural municipal.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              hasAgent ? (
                <Link to="/painel" className="btn btn-primary text-base px-8 py-3">
                  <User className="h-5 w-5" />
                  Acessar Meu Painel
                </Link>
              ) : (
                <Link to="/painel/agentes/cadastrar" className="btn btn-primary text-base px-8 py-3">
                  <Mic2 className="h-5 w-5" />
                  Cadastrar meu Perfil Cultural (SMIIC)
                </Link>
              )
            ) : (
              <Link to="/cadastro" className="btn btn-primary text-base px-8 py-3">
                <Mic2 className="h-5 w-5" />
                Cadastrar meu Perfil
              </Link>
            )}
            <Link to="/artistas" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-white/30 text-white font-semibold hover:border-white/60 hover:bg-white/5 transition-all text-base">
              <Users className="h-5 w-5" />
              Explorar Artistas
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
