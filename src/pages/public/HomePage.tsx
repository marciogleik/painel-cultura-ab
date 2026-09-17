import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { countPublicAgents, getPublicAgents } from '@/services/culturalAgentService'
import { errorMessage } from '@/lib/utils'
import { ErrorState } from '@/components/ui/EmptyState'
import {
  Users, Building2, Calendar, FileText, Search, MapPin, ArrowRight,
  Lock, LogIn, LogOut, Phone, Map
} from 'lucide-react'

// ── 4 Botões Principais no Estilo SMIIC (Cápsulas Azuis com Ícone em Círculo) ──

const SMIIC_MODULES = [
  {
    title: 'Agentes Culturais',
    desc: 'Artistas, músicos, atores e criadores',
    icon: Users,
    href: '/agentes',
  },
  {
    title: 'Projetos Culturais',
    desc: 'Editais, concursos e fomento cultural',
    icon: FileText,
    href: '/editais',
  },
  {
    title: 'Espaços Culturais',
    desc: 'Teatros, museus, bibliotecas e centros',
    icon: Building2,
    href: '/espacos',
  },
  {
    title: 'Eventos Culturais',
    desc: 'Shows, apresentações e agenda da cidade',
    icon: Calendar,
    href: '/eventos',
  },
]

export function HomePage() {
  const { user, profile, signIn, signOut } = useAuth()
  const navigate = useNavigate()

  // Estado da Busca
  const [searchTerm, setSearchTerm] = useState('')

  // Estado do Login Direto na Sidebar
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/agentes?q=${encodeURIComponent(searchTerm.trim())}`)
    } else {
      navigate('/agentes')
    }
  }

  async function handleSidebarLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      setLoginError('Informe seu e-mail e senha.')
      return
    }
    setIsLoggingIn(true)
    setLoginError('')
    try {
      await signIn(loginEmail.trim(), loginPassword)
      navigate('/painel')
    } catch (err) {
      const raw = errorMessage(err, 'Erro ao entrar. Tente novamente.')
      const msg = raw.toLowerCase()
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        setLoginError('E-mail ou senha incorretos.')
      } else {
        setLoginError(raw)
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Textos institucionais editáveis (site_content), com fallback para os textos padrão
  const { data: siteTexts } = useQuery({
    queryKey: ['site_content', 'home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('key, value')
        .in('key', ['home.hero.title', 'home.hero.subtitle', 'home.hero.description', 'home.about.title', 'home.about.text'])
      if (error) throw error
      const map: Record<string, string> = {}
      for (const row of (data ?? []) as { key: string; value: string | null }[]) {
        if (row.value?.trim()) map[row.key] = row.value
      }
      return map
    },
    staleTime: 5 * 60 * 1000,
  })
  const heroTitle = siteTexts?.['home.hero.title'] ?? 'BEM-VINDO AO PORTAL SMIIC'
  const heroSubtitle = siteTexts?.['home.hero.subtitle'] ?? 'Sistema Municipal de Informações e Indicadores Culturais de Água Boa'
  const heroDescription = siteTexts?.['home.hero.description'] ?? null

  // Estatísticas (somente agentes públicos aprovados, via view pública)
  const { data: agentCount } = useQuery({
    queryKey: ['home-stats', 'public-agents'],
    queryFn: countPublicAgents,
    staleTime: 60 * 1000,
  })

  // Agentes Culturais em Destaque (os 6 mais recentes)
  const {
    data: featuredAgents,
    isLoading: isLoadingAgents,
    isError: isAgentsError,
    error: agentsError,
    refetch: refetchAgents,
  } = useQuery({
    queryKey: ['home-featured-agents'],
    queryFn: async () => {
      const res = await getPublicAgents({ pageSize: 6, sort: 'rating' })
      return res.data.map((a) => ({
        id: a.id,
        name: a.display_name || 'Agente Cultural',
        photo_url: a.photo_url,
        neighborhood: a.neighborhood,
        city: a.city || 'Água Boa',
        typology: a.typologies?.[0]?.cultural_typologies?.name || a.areas?.[0]?.categories?.name || 'Cultura',
      }))
    },
  })

  return (
    <div className="animate-fade-in py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── LAYOUT 2 COLUNAS (PADRÃO SMIIC CAMPO GRANDE, DESIGN ELEGANTE) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── COLUNA ESQUERDA: BEM-VINDO + 4 BOTÕES + VITRINE DE AGENTES ── */}
        <div className="lg:col-span-8 space-y-8">

          {/* Título Institucional */}
          <div className="border-b pb-4" style={{ borderColor: 'var(--border)' }}>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ color: '#1c3a6e' }}>
              {heroTitle}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-400 mt-1">
              {heroSubtitle}
            </p>
            {heroDescription && (
              <p className="text-sm mt-2 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>{heroDescription}</p>
            )}
          </div>

          {/* ── 4 GRANDES BOTÕES DE AÇÃO (CÁPSULAS AZUIS COM ÍCONE EM CÍRCULO) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SMIIC_MODULES.map(({ title, desc, icon: Icon, href }) => (
              <Link
                key={title}
                to={href}
                className="group flex items-center gap-4 p-3.5 sm:p-4 rounded-2xl transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #1c3a6e 0%, #17325e 100%)',
                  border: '2px solid #234785',
                }}
              >
                {/* Ícone Redondo Branco com Borda Azul */}
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-md transition-transform group-hover:scale-105 border-2 border-blue-100">
                  <Icon className="h-7 w-7 text-blue-900" aria-hidden="true" />
                </div>

                {/* Texto do Botão */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black text-white leading-snug truncate group-hover:text-amber-300 transition-colors">
                    {title}
                  </h3>
                  <p className="text-xs text-blue-100/80 leading-tight truncate mt-0.5">
                    {desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* ── VITRINE DE AGENTES CULTURAIS (DE CARA LOGO ABAIXO DOS BOTÕES) ── */}
          <div className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block" />
                <h2 className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                  Agentes Culturais em Destaque
                </h2>
              </div>
              <Link
                to="/agentes"
                className="text-xs sm:text-sm font-bold inline-flex items-center gap-1 hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Ver todos os {agentCount ?? ''} agentes <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {/* Barra de Pesquisa Rápida */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-xl mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Buscar agente cultural por nome ou atividade"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar artista por nome ou atividade..."
                  className="input pl-10 pr-3 py-2.5 w-full text-sm rounded-xl shadow-sm border"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                />
              </div>
              <button type="submit" className="btn btn-primary px-5 py-2.5 text-sm font-bold shadow-sm rounded-xl flex-shrink-0">
                Buscar
              </button>
            </form>

            {/* Grid de Cards dos Agentes */}
            {isLoadingAgents ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="card p-3 rounded-2xl animate-pulse">
                    <div className="aspect-square rounded-xl bg-slate-200 dark:bg-slate-700 mb-2" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-1" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : isAgentsError ? (
              <ErrorState error={agentsError} onRetry={() => refetchAgents()} />
            ) : featuredAgents && featuredAgents.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {featuredAgents.map((agent) => (
                  <Link
                    key={agent.id}
                    to={`/agentes/${agent.id}`}
                    className="group flex flex-col rounded-2xl overflow-hidden border transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  >
                    {/* Foto */}
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {agent.photo_url ? (
                        <img
                          src={agent.photo_url}
                          alt={agent.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                          <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl text-white shadow"
                            style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
                          >
                            {(agent.name || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-[11px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>
                            Sem foto
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Informações */}
                    <div className="p-3">
                      <span className="inline-block text-[11px] font-bold text-amber-500 uppercase tracking-wider line-clamp-1">
                        {agent.typology}
                      </span>
                      <h3 className="font-bold text-sm leading-tight mb-1 group-hover:text-amber-500 transition-colors line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                        {agent.name}
                      </h3>
                      <p className="flex items-center gap-1 text-[11px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                        <MapPin className="h-3 w-3 text-amber-500 flex-shrink-0" aria-hidden="true" />
                        <span>{[agent.neighborhood, agent.city].filter(Boolean).join(', ')}</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
                <Users size={36} aria-hidden="true" className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Nenhum agente cultural verificado ainda</p>
              </div>
            )}

            <div className="text-center mt-6">
              <Link
                to="/agentes"
                className="btn btn-secondary px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm inline-flex items-center gap-2 hover:scale-105 transition-all"
              >
                Ver todos os {agentCount ?? ''} agentes culturais cadastrados
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

        </div>

        {/* ── COLUNA DIREITA: CARD ACESSO AO SISTEMA + INFORMAÇÕES DA PREFEITURA ── */}
        <div className="lg:col-span-4 space-y-6">

          {/* ── CARD ACESSO AO SISTEMA (EXATAMENTE COMO NO SMIIC CAMPO GRANDE) ── */}
          <div
            className="rounded-2xl p-5 shadow-lg border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            {/* Cabeçalho do Card com Ícone de Cadeado/SMIIC */}
            <div className="flex items-center gap-2 pb-3 mb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-black">
                <Lock size={18} aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                  SMIIC
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Acesso ao Sistema
                </p>
              </div>
            </div>

            {user ? (
              /* Usuário já conectado */
              <div className="space-y-4 text-center py-2">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center font-black text-xl text-white shadow-md" style={{ background: '#1c3a6e' }}>
                  {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {profile?.full_name || 'Usuário Conectado'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
                <Link
                  to="/painel"
                  className="btn btn-primary w-full justify-center py-2.5 text-sm font-bold shadow-sm"
                >
                  <LogIn size={16} aria-hidden="true" />
                  Acessar Meu Painel
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="btn btn-ghost w-full justify-center text-xs text-slate-500 hover:text-red-500"
                >
                  <LogOut size={14} aria-hidden="true" />
                  Sair da Conta
                </button>
              </div>
            ) : (
              /* Formulário de Login Direto */
              <form onSubmit={handleSidebarLogin} className="space-y-3.5">
                {loginError && (
                  <div role="alert" className="p-2.5 rounded-lg text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
                    {loginError}
                  </div>
                )}

                <div>
                  <label htmlFor="home-login-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    id="home-login-email"
                    autoComplete="email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="input w-full py-2 px-3 text-sm rounded-lg border"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                  />
                </div>

                <div>
                  <label htmlFor="home-login-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Senha
                  </label>
                  <input
                    id="home-login-password"
                    autoComplete="current-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="input w-full py-2 px-3 text-sm rounded-lg border"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                  />
                </div>

                {/* Botão ENTRAR em destaque Amarelo/Dourado (como no exemplo do SMIIC) */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 rounded-lg font-black text-sm uppercase tracking-wide transition-all duration-200 shadow-md hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: '#f5a623',
                    color: '#1e293b',
                  }}
                >
                  {isLoggingIn ? 'Entrando...' : 'ENTRAR'}
                </button>

                {/* Links Esqueci minha senha / Fazer Cadastro */}
                <div className="pt-2 flex flex-col gap-1.5 text-xs text-center border-t" style={{ borderColor: 'var(--border)' }}>
                  <Link
                    to="/recuperar-senha"
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white underline"
                  >
                    Esqueci minha senha
                  </Link>
                  <Link
                    to="/cadastro"
                    className="font-bold text-blue-900 dark:text-amber-400 hover:underline"
                  >
                    Fazer Cadastro
                  </Link>
                </div>
              </form>
            )}
          </div>

          {/* ── CARD MAPA & CONTATO DA SECRETARIA ── */}
          <div
            className="rounded-2xl p-5 shadow border space-y-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-900 dark:text-blue-400 font-black">
                <Map size={18} aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Município de Água Boa
                </h4>
                <p className="text-xs text-slate-500">Mato Grosso · Vale do Araguaia</p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border aspect-[16/9] relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
              <img
                src="/logo-secretaria.jpg"
                alt="Prefeitura de Água Boa"
                loading="lazy"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-blue-950/40 flex items-center justify-center">
                <span className="text-xs font-bold text-white bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  Água Boa · MT
                </span>
              </div>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 font-medium">
              <p className="font-bold text-slate-900 dark:text-white">
                Secretaria de Esporte, Cultura, Lazer e Eventos
              </p>
              <p className="flex items-center gap-1.5">
                <Phone size={13} className="text-amber-500" aria-hidden="true" />
                <span>Atendimento: (66) 3468-6400</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Segunda a Sexta · 07h30 às 17h30
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
