import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, type ChangeEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, User, FileText, Shield, Users, BarChart3,
  LogOut, Menu, Settings, ExternalLink, ShoppingBag, Settings2,
  Building2, Calendar, GraduationCap, Wrench, BookOpen, Flag, ClipboardList,
  Camera, Loader2, type LucideIcon,
} from 'lucide-react'
import { cn, errorMessage } from '@/lib/utils'

import { NotificationBell } from '@/components/NotificationBell'
import { useToast } from '@/components/ui/Toast'
import { uploadUserAvatar } from '@/services/culturalAgentService'
import type { UserRole } from '@/types'

interface AppLayoutProps {
  isAdmin?: boolean
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Ativo somente quando o caminho é exatamente igual */
  exact?: boolean
  /** Agrupamento da navegação administrativa */
  section?: string
}

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super administrador',
  ADMIN_CULTURA: 'Administrador da Cultura',
  GESTOR: 'Gestor',
  SERVIDOR: 'Servidor',
  ARTISTA: 'Agente cultural',
  USUARIO_PUBLICO: 'Usuário',
}

const ARTIST_LINKS: NavItem[] = [
  { href: '/painel', label: 'Painel', icon: LayoutDashboard, exact: true },
  { href: '/painel/agentes', label: 'Meu Agente Cultural', icon: User },
  { href: '/painel/produtos', label: 'Produtos Culturais', icon: ShoppingBag },
  { href: '/painel/inscricoes', label: 'Inscrições em Editais', icon: FileText },
  { href: '/painel/privacidade', label: 'Privacidade (LGPD)', icon: Shield },
]

const ADMIN_LINKS: NavItem[] = [
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

/** Agrupa os links administrativos por seção, preservando a ordem de aparição. */
function groupBySection(links: NavItem[]): [string, NavItem[]][] {
  const sections = new Map<string, NavItem[]>()
  for (const link of links) {
    const key = link.section ?? 'Geral'
    const list = sections.get(key)
    if (list) list.push(link)
    else sections.set(key, [link])
  }
  return Array.from(sections.entries())
}

const SECONDARY_LINK_CLASS =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all'

export function AppLayout({ isAdmin = false }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, isStaff, signOut, refreshProfile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  async function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return
    if (!file.type.startsWith('image/')) {
      toast.error('Arquivo inválido. Selecione uma imagem (JPG, PNG ou WebP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A foto deve ter no máximo 5 MB.')
      return
    }
    setAvatarUploading(true)
    try {
      await uploadUserAvatar(profile.id, file, profile.avatar_url)
      await refreshProfile()
      toast.success('Foto de perfil atualizada!')
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao enviar foto.'))
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const isActive = (href: string, exact = false) =>
    exact ? location.pathname === href : location.pathname.startsWith(href)

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível sair. Tente novamente.'))
    }
  }

  const initial = profile?.full_name?.trim().charAt(0).toUpperCase() || 'U'
  const roleLabel = profile?.role ? ROLE_LABEL[profile.role] ?? profile.role : ''

  function renderLink({ href, label, icon: Icon, exact }: NavItem, size: number, padding: string) {
    const active = isActive(href, exact)
    return (
      <Link
        key={href}
        to={href}
        onClick={() => setSidebarOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-all',
          padding,
          active
            ? 'text-amber-600 bg-amber-500/10 border border-amber-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-white/5'
        )}
        style={active ? {} : { color: 'var(--text-secondary)' }}
      >
        <Icon className="flex-shrink-0" size={size} aria-hidden="true" />
        {label}
      </Link>
    )
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
        <div className="border-l pl-3 flex-1 min-w-0" style={{ borderColor: 'var(--border-inst-header)' }}>
          <p className="text-xs font-bold uppercase tracking-wider leading-tight" style={{ color: 'var(--accent)' }}>
            SMIIC
          </p>
          <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-inst-title)' }}>
            {isAdmin ? 'Administração' : 'Painel do Agente'}
          </p>
        </div>
        <div className="hidden lg:block flex-shrink-0">
          <NotificationBell />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto" aria-label={isAdmin ? 'Menu administrativo' : 'Menu do painel'}>
        {isAdmin ? (
          groupBySection(ADMIN_LINKS).map(([section, sectionLinks]) => (
            <div key={section} className="mb-4">
              {section !== 'Geral' && (
                <p className="text-xs font-bold uppercase tracking-wider px-3 mb-1" style={{ color: 'var(--text-muted)' }}>{section}</p>
              )}
              <div className="space-y-1">
                {sectionLinks.map((link) => renderLink(link, 16, 'py-2'))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-1">
            {ARTIST_LINKS.map((link) => renderLink(link, 18, 'py-2.5'))}
          </div>
        )}

        {/* Switch to public / admin */}
        <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link to="/" className={SECONDARY_LINK_CLASS} onClick={() => setSidebarOpen(false)}>
            <ExternalLink size={18} aria-hidden="true" />
            Ver site público
          </Link>
          {!isAdmin && isStaff && (
            <Link to="/admin" className={SECONDARY_LINK_CLASS} onClick={() => setSidebarOpen(false)}>
              <Settings size={18} aria-hidden="true" />
              Administração
            </Link>
          )}
          {isAdmin && (
            <Link to="/painel" className={SECONDARY_LINK_CLASS} onClick={() => setSidebarOpen(false)}>
              <User size={18} aria-hidden="true" />
              Painel do Agente
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

        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <div className="relative group flex-shrink-0">
            {avatarUploading ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500" role="status" aria-label="Enviando foto">
                <Loader2 size={16} className="animate-spin text-amber-500" aria-hidden="true" />
              </div>
            ) : profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-9 w-9 rounded-full object-cover border border-amber-500/40"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600" aria-hidden="true">
                <span className="text-xs font-bold text-white">{initial}</span>
              </div>
            )}
            {!avatarUploading && (
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                aria-label="Alterar foto de perfil"
                title="Alterar foto de perfil"
              >
                <Camera size={13} aria-hidden="true" />
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              aria-label="Selecionar foto de perfil"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{profile?.full_name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
            aria-label="Sair da conta"
            title="Sair"
          >
            <LogOut size={16} aria-hidden="true" />
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
            aria-hidden="true"
          />
          <div className="relative w-64 flex flex-col" role="dialog" aria-modal="true" aria-label="Menu">
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
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <img
            src="/logo-secretaria.jpg"
            alt="Secretaria de Cultura"
            className="h-8 w-auto object-contain"
          />
          <div className="flex items-center gap-2">
            <NotificationBell />
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-7 w-7 rounded-full object-cover border border-amber-500/40"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600" aria-hidden="true">
                <span className="text-[10px] font-bold text-white">{initial}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 cursor-pointer"
              aria-label="Sair da conta"
              title="Sair"
            >
              <LogOut size={17} aria-hidden="true" />
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
