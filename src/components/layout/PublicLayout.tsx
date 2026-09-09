import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Menu, X, Search, FileText, LogIn, User, ChevronRight } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, profile } = useAuth()
  const location = useLocation()

  const navLinks = [
    { href: '/', label: 'Início' },
    { href: '/pesquisa', label: 'Artistas', icon: Search },
    { href: '/editais', label: 'Editais', icon: FileText },
  ]

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Barra do Governo (gov.br style) ── */}
      <div className="w-full" style={{ background: '#1c3a6e', borderBottom: '2px solid #f5a623' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold tracking-wide" style={{ color: '#a8c4e8' }}>
                GOVERNO MUNICIPAL
              </span>
              <span style={{ color: '#3a5a8a' }}>|</span>
              <span className="text-xs" style={{ color: '#7facd4' }}>
                Prefeitura Municipal de Água Boa · Mato Grosso
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <a
                href="https://aguaboa.mt.gov.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 transition-colors hover:text-slate-900 dark:text-white"
                style={{ color: '#7facd4' }}
              >
                Portal da Prefeitura
                <ChevronRight size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Header Institucional ── */}
      <header style={{ background: 'var(--bg-inst-header)', borderBottom: '1px solid var(--border-inst-header)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">

            {/* Logo da Secretaria */}
            <Link to="/" className="flex items-center gap-4 group">
              <img
                src="/logo-secretaria.jpg"
                alt="Secretaria de Esporte, Cultura, Lazer e Eventos - Prefeitura de Água Boa MT"
                className="h-16 w-auto object-contain transition-opacity group-hover:opacity-90 rounded"
              />
              <div className="hidden md:block border-l pl-4" style={{ borderColor: 'var(--border-inst-header)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                  Plataforma
                </p>
                <p className="text-base font-bold leading-tight" style={{ color: 'var(--text-inst-title)' }}>
                  Municipal de Cultura
                </p>
                <p className="text-xs" style={{ color: 'var(--text-inst-subtitle)' }}>
                  Banco Oficial de Talentos
                </p>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              <nav className="flex items-center gap-1 mr-4">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    to={href}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      isActive(href)
                        ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              {user ? (
                <Link to="/painel" className="btn btn-primary text-sm">
                  <User className="h-4 w-4" />
                  {profile?.full_name?.split(' ')[0] ?? 'Painel'}
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="btn btn-ghost text-sm" style={{ color: 'var(--text-inst-title)' }}>
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </Link>
                  <Link to="/cadastro" className="btn btn-primary text-sm">
                    Cadastre-se
                  </Link>
                </div>
              )}
              
              <div className="ml-2 pl-2 border-l" style={{ borderColor: 'var(--border-inst-header)' }}>
                <ThemeToggle />
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white/5 transition-all"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t px-4 py-3 space-y-1" style={{ borderColor: 'var(--border-inst-header)', background: 'var(--bg-inst-header)' }}>
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm transition-all"
                style={{ color: 'var(--text-inst-title)' }}
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
                <Link to="/painel" onClick={() => setMenuOpen(false)} className="btn btn-primary w-full justify-center">
                  Meu Painel
                </Link>
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
          </div>
        )}

        {/* ── Breadcrumb / nav secondary (gov style) ── */}
        <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 h-8 text-xs overflow-x-auto" style={{ color: 'var(--text-secondary)' }}>
              <span>Prefeitura de Água Boa</span>
              <ChevronRight size={12} />
              <span>Secretaria de Cultura</span>
              {location.pathname !== '/' && (
                <>
                  <ChevronRight size={12} />
                  <span style={{ color: 'var(--accent)' }}>
                    {location.pathname === '/pesquisa' && 'Artistas Culturais'}
                    {location.pathname === '/editais' && 'Editais Culturais'}
                    {location.pathname.startsWith('/artistas') && 'Perfil do Artista'}
                    {location.pathname.startsWith('/editais/') && 'Detalhe do Edital'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer Institucional ── */}
      <footer style={{ background: 'var(--bg-inst-header)', borderTop: '3px solid var(--accent)' }}>
        {/* Main footer */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            {/* Logo + info principal */}
            <div>
              <img
                src="/logo-secretaria.jpg"
                alt="Secretaria de Esporte, Cultura, Lazer e Eventos"
                className="h-20 w-auto object-contain mb-4 rounded"
              />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-inst-subtitle)' }}>
                A Plataforma Municipal de Cultura é uma iniciativa da Secretaria de
                Esporte, Cultura, Lazer e Eventos da Prefeitura Municipal de Água Boa - MT,
                destinada ao cadastro, gestão e mapeamento dos talentos culturais do município.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>
                Navegação
              </h4>
              <ul className="space-y-2">
                {[
                  { to: '/', label: 'Página Inicial' },
                  { to: '/pesquisa', label: 'Buscar Artistas' },
                  { to: '/editais', label: 'Editais Culturais' },
                  { to: '/cadastro', label: 'Cadastre-se' },
                  { to: '/login', label: 'Área Restrita' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-xs flex items-center gap-1 transition-colors hover:text-amber-500"
                      style={{ color: 'var(--text-inst-subtitle)' }}
                    >
                      <ChevronRight size={12} />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contato */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>
                Secretaria de Cultura
              </h4>
              <address className="not-italic space-y-1">
                {[
                  'Prefeitura Municipal de Água Boa',
                  'Secretaria de Esporte, Cultura, Lazer e Eventos',
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
                  className="text-xs text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
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
                />
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    Desenvolvido pelo{' '}
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
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
