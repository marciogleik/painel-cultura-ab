import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getMyAgents } from '@/services/culturalAgentService'
import { getMyInscriptions } from '@/services/editalService'
import { supabase } from '@/lib/supabase'
import {
  User, FileText, Music2, ArrowRight, CheckCircle, Clock, XCircle, Star
} from 'lucide-react'

export function ArtistDashboard() {
  const { user, profile } = useAuth()

  const { data: agents } = useQuery({
    queryKey: ['my-agents', user?.id],
    queryFn: () => getMyAgents(user!.id),
    enabled: !!user,
  })

  const primaryAgent = agents?.[0]

  const { data: inscriptions } = useQuery({
    queryKey: ['my-inscriptions', primaryAgent?.id],
    queryFn: () => getMyInscriptions(primaryAgent!.id),
    enabled: !!primaryAgent,
  })

  const { data: openEditais } = useQuery({
    queryKey: ['open-editais-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('editais')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PUBLICADO')
      return count ?? 0
    },
  })

  const inscriptionsByStatus = inscriptions?.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = profile?.full_name?.split(' ')[0]

  return (
    <div className="animate-fade-in">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Bem-vindo(a) ao seu painel cultural
        </p>
      </div>

      {/* Profile completeness */}
      {!primaryAgent && (
        <div className="card p-6 mb-6 border-amber-500/30 animate-slide-up" style={{ background: 'rgba(245,158,11,0.05)' }}>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 flex-shrink-0">
              <Star className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Cadastre seu Agente Cultural no SMIIC</h3>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Faça o cadastro oficial do SMIIC com as Tipologias culturais para participar de editais e aparecer no Mapa Cultural.
              </p>
              <Link to="/painel/agentes/cadastrar" className="btn btn-primary text-sm">
                Fazer Cadastro Oficial SMIIC
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Minhas Inscrições',
            value: inscriptions?.length ?? 0,
            icon: FileText,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            href: '/painel/inscricoes',
          },
          {
            label: 'Aprovadas',
            value: inscriptionsByStatus['APROVADO'] ?? 0,
            icon: CheckCircle,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
          {
            label: 'Em análise',
            value: inscriptionsByStatus['EM_ANALISE'] ?? 0,
            icon: Clock,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
          },
          {
            label: 'Editais abertos',
            value: openEditais ?? 0,
            icon: Music2,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            href: '/editais',
          },
        ].map(({ label, value, icon: Icon, color, bg, href }) => (
          <div key={label} className={`card p-5 ${href ? 'card-glow cursor-pointer' : ''}`}>
            {href ? (
              <Link to={href} className="block">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-3`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </Link>
            ) : (
              <>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-3`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/painel/agentes" className="card card-glow p-5 group">
          <User className="h-6 w-6 text-amber-400 mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-amber-400 transition-colors">
            Meu Agente Cultural (SMIIC)
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Gerenciar dados cadastrais, tipologia e documentação oficial
          </p>
        </Link>

        <Link to="/editais" className="card card-glow p-5 group">
          <FileText className="h-6 w-6 text-blue-400 mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-amber-400 transition-colors">
            Editais Abertos
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Encontrar e se inscrever em editais culturais
          </p>
        </Link>

        <Link to="/painel/privacidade" className="card card-glow p-5 group">
          <XCircle className="h-6 w-6 text-purple-400 mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-amber-400 transition-colors">
            Privacidade (LGPD)
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Controlar quais informações são públicas
          </p>
        </Link>
      </div>
    </div>
  )
}
