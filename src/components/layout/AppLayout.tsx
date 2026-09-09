import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, User, FileText, Shield, Users, BarChart3,
  LogOut, Menu, Settings, ExternalLink, ShoppingBag, Settings2,
  Building2, Calendar, GraduationCap, Wrench, BookOpen, Flag, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NotificationBell } from '@/components/NotificationBell'

interface AppLayoutProps {
  isAdmin?: boolean
}

export function AppLayout({ isAdmin = false }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const artistLinks = [
    { href: '/painel', label: 'Painel', icon: LayoutDashboard, exact: true },
    { href: '/painel/agentes', label: 'Meu Agente Cultural', icon: User },
    { href: '/painel/produtos', label: 'Produtos Culturais', icon: ShoppingBag },
    { href: '/painel/inscricoes', label: 'Inscrições em Editais', icon: FileText },
    { href: '/painel/privacidade', label: 'Privacidade (LGPD)', icon: Shield },
  ]

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/site', label: 'Editor do Site', icon: Settings2, section: 'CMS' },
    { href: '/admin/agentes', label: 'Agentes Culturais (SMIIC)', icon: Users, section: 'Módulos' },
    { href: '/admin/editais', label: 'Concursos/Editais', icon: FileText, section: 'Módulos' },
    { href: '/admin/espacos', label: 'Espaços Culturais', icon: Building2, section: 'Módulos' },
    { href: '/admin/eventos', label: 'Eventos Culturais', icon: Calendar, section: 'Módulos' },
    { href: '/admin/projetos', label: 'Projetos Culturais', icon: GraduationCap, section: 'Módulos' },
    { href: '/admin/oficinas', label: 'Oficinas Culturais', icon: Wrench, section: 'Módulos' },
    { href: '/admin/biblioteca', label: 'Biblioteca', icon: BookOpen, section: 'Módulos' },
    { href: '/admin/simbolos', label: 'Símbolos Municipais', icon: Flag, section: 'Módulos' },
    { href: '/admin/produtos', label: 'Produtos Culturais', icon: ShoppingBag, section: 'Módulos' },
    { href: '/admin/inscricoes', label: 'Inscrições', icon: FileText, section: 'Gestão' },
    { href: '/admin/matriculas', label: 'Matrículas', icon: ClipboardList, section: 'Gestão' },
    { href: '/admin/usuarios', label: 'Usuários', icon: Users, section: 'Gestão' },
    { href: '/admin/indicadores', label: 'Indicadores', icon: BarChart3, section: 'Gestão' },
  ]

  

  const isActive = (href: string, exact = false) =>
    exact ? location.pathname === href : location.pathname.startsWith(href)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const sidebar = (
    <div
      className="flex h-full flex-col"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="flex h-auto items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-inst-header)' }}>
        <img
          src="/logo-secretaria.jpg"
          alt="Secretaria de Cultura"
          className="h-12 w-auto object-contain rounded"
        />
        <div className="border-l pl-3" style={{ borderColor: 'var(--border-inst-header)' }}>
          <p className="text-xs font-bold uppercase tracking-wider leading-tight" style={{ color: 'var(--accent)' }}>
            SMIIC
          </p>
          <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-inst-title)' }}>
            {isAdmin ? 'Administração' : 'Painel do Artista'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {isAdmin ? (
          // Admin: group by section
          (() => {
            const sections: Record<string, typeof adminLinks> = {}
            adminLinks.forEach(link => {
              const s = (link as any).section ?? 'Geral'
              if (!sections[s]) sections[s] = []
              sections[s].push(link)
            })
            return Object.entries(sections).map(([section, sectionLinks]) => (
              <div key={section} className="mb-4">
                {section !== 'Geral' && (
                  <p className="text-xs font-bold uppercase tracking-wider px-3 mb-1" style={{ color: 'var(--text-muted)' }}>{section}</p>
                )}
                <div className="space-y-1">
                  {sectionLinks.map(({ href, label, icon: Icon, exact }: any) => (
                    <Link
                      key={href}
                      to={href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        isActive(href, exact)
                          ? 'text-amber-600 bg-amber-500/10 border border-amber-500/20'
                          : 'hover:bg-slate-100 dark:hover:bg-white/5'
                      )}
                      style={isActive(href, exact) ? {} : { color: 'var(--text-secondary)' }}
                    >
                      <Icon className="flex-shrink-0" size={16} />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))
          })()
        ) : (
          // Artist: flat list
          <div className="space-y-1">
            {artistLinks.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={href}
                to={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive(href, exact)
                    ? 'text-amber-600 bg-amber-500/10 border border-amber-500/20'
                    : 'hover:bg-slate-100 dark:hover:bg-white/5'
                )}
                style={isActive(href, exact) ? {} : { color: 'var(--text-secondary)' }}
              >
                <Icon className="flex-shrink-0" size={18} />
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Switch to public */}
        <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white/5 transition-all"
          >
            <ExternalLink size={18} />
            Ver site público
          </Link>
          {!isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white/5 transition-all"
            >
              <Settings size={18} />
              Administração
            </Link>
          )}
        </div>
      </nav>

      {/* Hub credit and Theme */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          <div className="flex items-center gap-2">
            <img src="/logo-hub.png" alt="Hub de Inovação" className="h-5 w-auto object-contain opacity-70" />
            <p className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
              Hub de Inovação
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex-shrink-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{profile?.full_name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {profile?.role?.replace('_', ' ')}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 flex flex-col">
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header
          className="lg:hidden flex h-14 items-center justify-between px-4 border-b glass"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-900 dark:text-white"
          >
            <Menu size={20} />
          </button>
          <img
              src="/logo-secretaria.jpg"
              alt="Secretaria de Cultura"
              className="h-8 w-auto object-contain"
            />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
