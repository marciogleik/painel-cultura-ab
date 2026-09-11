import { Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Menu, X, LogIn, User, ChevronRight, ShieldCheck } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

const SECRETARIA = 'Secretaria de Esporte, Cultura, Lazer e Eventos'

interface NavItem {
  href: string
  label: string
}

/** Módulos principais visíveis no menu superior - foco no essencial para máxima clareza. */
const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'Início' },
  { href: '/agentes', label: 'Agentes Culturais' },
  { href: '/editais', label: 'Editais' },
]

/** Módulos agrupados em "Mais Serviços" no menu suspenso. */
const MORE_NAV: NavItem[] = [
  { href: '/eventos', label: 'Eventos Culturais' },
  { href: '/oficinas', label: 'Oficinas Gratuitas' },
  { href: '/espacos', label: 'Espaços Culturais' },
  { href: '/projetos', label: 'Projetos' },
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/produtos', label: 'Produtos' },
  { href: '/simbolos', label: 'Símbolos' },
]

const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...MORE_NAV]

/** Rótulos do breadcrumb por rota exata. */
const ROUTE_LABELS: Record<string, string> = {
  '/agentes': 'Agentes Culturais',
  '/editais': 'Editais Culturais',
  '/eventos': 'Eventos Culturais',
  '/oficinas': 'Oficinas Culturais',
  '/espacos': 'Espaços Culturais',
  '/projetos': 'Projetos Culturais',
  '/biblioteca': 'Biblioteca Pública',
  '/produtos': 'Produtos Culturais',
  '/simbolos': 'Símbolos Municipais',
  '/oficinas/matricula': 'Ficha de Matrícula',
}

/** Rótulos para rotas de detalhe (/modulo/:id). */
const DETAIL_LABELS: Record<string, string> = {
  '/agentes': 'Perfil do Agente',
  '/artistas': 'Perfil do Agente',
  '/editais': 'Detalhe do Edital',
  '/oficinas': 'Ficha de Matrícula',
}

interface Crumb {
  label: string
  to?: string
}

function breadcrumbFor(pathname: string): Crumb[] {
  if (pathname === '/') return []
  const exact = ROUTE_LABELS[pathname]
  if (exact) {
    // /oficinas/matricula -> Oficinas Culturais > Ficha de Matrícula
    const base = `/${pathname.split('/')[1]}`
    if (base !== pathname && ROUTE_LABELS[base]) {
      return [{ label: ROUTE_LABELS[base], to: base }, { label: exact }]
    }
    return [{ label: exact }]
  }
  const base = `/${pathname.split('/')[1]}`
  const detail = DETAIL_LABELS[base]
  const baseLabel = ROUTE_LABELS[base] ?? (base === '/artistas' ? ROUTE_LABELS['/agentes'] : undefined)
  const baseTo = base === '/artistas' ? '/agentes' : base
  if (detail) {
    return baseLabel ? [{ label: baseLabel, to: baseTo }, { label: detail }] : [{ label: detail }]
  }
  return baseLabel ? [{ label: baseLabel }] : []
}

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const { user, isStaff } = useAuth()
  const location = useLocation()

  // Fecha menus ao navegar
  useEffect(() => {
    setMenuOpen(false)
    setMoreOpen(false)
  }, [location.pathname])

  // Fecha o dropdown "Mais" ao clicar fora ou apertar Escape
  useEffect(() => {
    if (!moreOpen) return
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  const crumbs = breadcrumbFor(location.pathname)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Barra do Governo (gov.br style) ── */}
      <div className="w-full" style={{ background: '#1c3a6e', borderBottom: '2px solid #f5a623' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-semibold tracking-wide whitespace-nowrap" style={{ color: '#a8c4e8' }}>
                GOVERNO MUNICIPAL
              </span>
              <span aria-hidden="true" style={{ color: '#3a5a8a' }}>|</span>
              <span className="text-xs truncate" style={{ color: '#7facd4' }}>
                Prefeitura Municipal de Água Boa · Mato Grosso
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <a
                href="https://aguaboa.mt.gov.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 transition-colors hover:text-white"
                style={{ color: '#7facd4' }}
              >
                Portal da Prefeitura
                <ChevronRight size={12} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Header Institucional SMIIC ── */}
      <header style={{ background: 'var(--bg-inst-header)', borderBottom: '1px solid var(--border-inst-header)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:py-4 gap-4">

            {/* Logo da Secretaria + Identidade SMIIC */}
            <Link to="/" className="flex items-center gap-3 sm:gap-4 group min-w-0">
              <img
                src="/logo-secretaria.jpg"
                alt={`${SECRETARIA} - Prefeitura de Água Boa MT`}
                className="h-12 sm:h-16 w-auto object-contain rounded flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-base sm:text-2xl font-black tracking-tight leading-none truncate" style={{ color: '#1c3a6e' }}>
                  SMIIC <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs sm:text-base">· Sistema Municipal de Informações e Indicadores Culturais</span>
                </p>
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                  Prefeitura Municipal de Água Boa
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  Secretaria Municipal de Esporte, Cultura, Lazer e Eventos
                </p>
              </div>
            </Link>

            {/* Desktop User Actions */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              {user ? (
                <div className="flex items-center gap-2">
                  {isStaff && (
                    <Link to="/admin" className="btn btn-ghost text-xs font-semibold px-2.5 py-1.5" style={{ color: 'var(--text-inst-title)' }}>
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Administração
                    </Link>
                  )}
                  <Link to="/painel" className="btn btn-primary text-sm font-bold shadow-sm px-4 py-2">
                    <User className="h-4 w-4" aria-hidden="true" />
                    Meu Painel
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="btn btn-ghost text-sm font-semibold px-3 py-1.5" style={{ color: 'var(--text-inst-title)' }}>
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    Entrar
                  </Link>
                  <Link to="/cadastro" className="btn btn-primary text-sm font-bold shadow-sm px-4 py-1.5">
                    Fazer Cadastro
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="md:hidden p-2 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* ── Barra Horizontal de Navegação Oficial (Estilo SMIIC) ── */}
        <div className="hidden md:block border-t border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav aria-label="Navegação principal" className="flex items-center gap-1 py-1.5 overflow-x-auto text-xs font-bold uppercase tracking-wider">
              {[
                { href: '/', label: 'Início' },
                { href: '/agentes', label: 'Agentes Culturais' },
                { href: '/editais', label: 'Editais' },
                { href: '/espacos', label: 'Espaços' },
                { href: '/eventos', label: 'Eventos' },
                { href: '/oficinas', label: 'Oficinas' },
                { href: '/projetos', label: 'Projetos' },
                { href: '/biblioteca', label: 'Biblioteca' },
                { href: '/produtos', label: 'Produtos' },
                { href: '/simbolos', label: 'Símbolos' },
              ].map(({ href, label }) => {
                const active = href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    to={href}
                    aria-current={active ? 'page' : undefined}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                      active
                        ? 'text-blue-900 dark:text-amber-400 bg-blue-100/80 dark:bg-amber-500/10 font-black'
                        : 'text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav
            id="mobile-menu"
            aria-label="Navegação principal"
            className="md:hidden border-t px-4 py-3 space-y-1"
            style={{ borderColor: 'var(--border-inst-header)', background: 'var(--bg-inst-header)' }}
          >
            {ALL_NAV.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${isActive(href) ? 'bg-amber-500/10 font-semibold' : ''}`}
                style={{ color: isActive(href) ? 'var(--accent)' : 'var(--text-inst-title)' }}
                aria-current={isActive(href) ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 mt-2 flex items-center justify-between border-t" style={{ borderColor: 'var(--border-inst-header)' }}>
              <span className="text-sm" style={{ color: 'var(--text-inst-subtitle)' }}>Tema</span>
              <ThemeToggle />
            </div>
            <div className="pt-2 border-t flex flex-col gap-2 mt-2" style={{ borderColor: 'var(--border-inst-header)' }}>
              {user ? (
                <>
                  {isStaff && (
                    <Link to="/admin" onClick={() => setMenuOpen(false)} className="btn btn-secondary w-full justify-center">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Administração
                    </Link>
                  )}
                  <Link to="/painel" onClick={() => setMenuOpen(false)} className="btn btn-primary w-full justify-center">
                    Meu Painel
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="btn btn-secondary w-full justify-center">
                    Entrar
                  </Link>
                  <Link to="/cadastro" onClick={() => setMenuOpen(false)} className="btn btn-primary w-full justify-center">
                    Cadastre-se
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}

        {/* ── Breadcrumb (apenas em páginas internas, não na Home) ── */}
        {crumbs.length > 0 && (
          <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <nav aria-label="Trilha de navegação" className="flex items-center gap-1 h-8 text-xs overflow-x-auto whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                <Link to="/" className="hover:underline">Início</Link>
                {crumbs.map((c, i) => {
                  const last = i === crumbs.length - 1
                  return (
                    <span key={`${c.label}-${i}`} className="flex items-center gap-1">
                      <ChevronRight size={12} aria-hidden="true" className="flex-shrink-0" />
                      {c.to && !last ? (
                        <Link to={c.to} className="hover:underline">{c.label}</Link>
                      ) : (
                        <span style={{ color: 'var(--accent)' }} aria-current={last ? 'page' : undefined}>{c.label}</span>
                      )}
                    </span>
                  )
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer Institucional ── */}
      <footer style={{ background: 'var(--bg-inst-header)', borderTop: '3px solid var(--accent)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            {/* Logo + info principal */}
            <div>
              <img
                src="/logo-secretaria.jpg"
                alt={SECRETARIA}
                className="h-20 w-auto object-contain mb-4 rounded"
                loading="lazy"
              />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-inst-subtitle)' }}>
                A Plataforma Municipal de Cultura é uma iniciativa da {SECRETARIA} da
                Prefeitura Municipal de Água Boa - MT, destinada ao cadastro, gestão e
                mapeamento dos talentos culturais do município.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>
                Navegação
              </h4>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  ...ALL_NAV.map((n) => ({ to: n.href, label: n.href === '/' ? 'Página Inicial' : n.label })),
                  { to: '/cadastro', label: 'Cadastre-se' },
                  { to: '/login', label: 'Área Restrita' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-xs flex items-center gap-1 transition-colors hover:text-amber-600 dark:hover:text-amber-400"
                      style={{ color: 'var(--text-inst-subtitle)' }}
                    >
                      <ChevronRight size={12} aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contato */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>
                {SECRETARIA}
              </h4>
              <address className="not-italic space-y-1">
                {[
                  'Prefeitura Municipal de Água Boa',
                  SECRETARIA,
                  'Água Boa – Mato Grosso',
                  'CEP: 78.635-000',
                ].map((line) => (
                  <p key={line} className="text-xs" style={{ color: 'var(--text-inst-subtitle)' }}>{line}</p>
                ))}
              </address>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-inst-header)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-inst-subtitle)' }}>Transparência pública:</p>
                <a
                  href="https://aguaboa.mt.gov.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                >
                  aguaboa.mt.gov.br →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Barra de créditos do Hub ── */}
        <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-hub.png"
                  alt="Hub de Inovação Água Boa MT"
                  className="h-8 w-auto object-contain"
                  loading="lazy"
                />
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    Desenvolvido pelo{' '}
                    <span className="font-semibold text-teal-700 dark:text-teal-400">
                      Hub de Inovação de Água Boa
                    </span>
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Tecnologia e inovação a serviço da gestão pública
                  </p>
                </div>
              </div>
              <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                © {new Date().getFullYear()} Prefeitura Municipal de Água Boa · MT
                <br />
                Todos os direitos reservados · LGPD aplicável
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
