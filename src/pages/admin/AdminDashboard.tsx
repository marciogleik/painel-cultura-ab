import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Users, FileText, TrendingUp, BarChart3, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [artists, editais, inscriptions, users, pendingInscriptions, agents, pendingAgents] = await Promise.all([
        supabase.from('artists').select('*', { count: 'exact', head: true }),
        supabase.from('editais').select('*', { count: 'exact', head: true }),
        supabase.from('inscriptions').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('status', 'EM_ANALISE'),
        supabase.from('cultural_agents').select('*', { count: 'exact', head: true }),
        supabase.from('cultural_agents').select('*', { count: 'exact', head: true }).in('registration_status', ['enviado', 'em_analise']),
      ])
      return {
        artists: artists.count ?? 0,
        editais: editais.count ?? 0,
        inscriptions: inscriptions.count ?? 0,
        users: users.count ?? 0,
        pendingInscriptions: pendingInscriptions.count ?? 0,
        agents: agents.count ?? 0,
        pendingAgents: pendingAgents.count ?? 0,
      }
    },
  })

  const { data: recentInscriptions } = useQuery({
    queryKey: ['recent-inscriptions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inscriptions')
        .select('id, status, submitted_at, editais(title), artists(artistic_name, profiles(full_name))')
        .order('submitted_at', { ascending: false })
        .limit(5)
      return data ?? []
    },
  })

  const { data: categoryStats } = useQuery({
    queryKey: ['category-stats'],
    queryFn: async () => {
      const [artistsRes, agentAreasRes] = await Promise.all([
        supabase.from('artists').select('category_id, categories(name, icon)').eq('is_public', true),
        supabase.from('agent_areas').select('category_id, categories(name, icon)'),
      ])

      const combined = [...(artistsRes.data ?? []), ...(agentAreasRes.data ?? [])]
      if (combined.length === 0) return []

      const counts: Record<string, { name: string; icon: string; count: number }> = {}
      combined.forEach((a: any) => {
        if (a.categories) {
          const key = a.category_id
          if (!counts[key]) counts[key] = { name: a.categories.name, icon: a.categories.icon, count: 0 }
          counts[key].count++
        }
      })
      return Object.values(counts).sort((a, b) => b.count - a.count)
    },
  })

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Administrativo</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Visão geral da Plataforma Municipal de Cultura
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
      {[
          { label: 'Agentes (SMIIC)', value: stats?.agents ?? 0, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10', href: '/admin/agentes' },
          { label: 'Agentes p/ Aprovação', value: stats?.pendingAgents ?? 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', href: '/admin/agentes' },
          { label: 'Editais', value: stats?.editais ?? 0, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10', href: '/admin/editais' },
          { label: 'Inscrições', value: stats?.inscriptions ?? 0, icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-500/10', href: '/admin/inscricoes' },
          { label: 'Inscrições Pendentes', value: stats?.pendingInscriptions ?? 0, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10', href: '/admin/inscricoes' },
          { label: 'Usuários', value: stats?.users ?? 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/admin/usuarios' },
        ].map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} to={href} className="card card-glow p-5 group">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-3`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            Artistas por Categoria
          </h2>
          {categoryStats && categoryStats.length > 0 ? (
            <div className="space-y-3">
              {categoryStats.slice(0, 8).map(({ name, icon, count }) => {
                const max = categoryStats[0].count
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-base w-6">{icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                        <span className="text-slate-900 dark:text-white font-medium">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(count / max) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #ea580c)' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum dado disponível</p>
          )}
        </div>

        {/* Recent inscriptions */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            Inscrições Recentes
          </h2>
          {recentInscriptions && recentInscriptions.length > 0 ? (
            <div className="space-y-3">
              {recentInscriptions.map((ins: any) => (
                <div key={ins.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {ins.artists?.artistic_name ?? ins.artists?.profiles?.full_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {ins.editais?.title}
                    </p>
                  </div>
                  <span className={`badge text-xs flex-shrink-0 ml-2 ${
                    ins.status === 'APROVADO' ? 'badge-green' :
                    ins.status === 'REPROVADO' ? 'badge-red' :
                    ins.status === 'EM_ANALISE' ? 'badge-amber' : 'badge-slate'
                  }`}>
                    {ins.status}
                  </span>
                </div>
              ))}
              <Link to="/admin/inscricoes" className="block text-xs text-amber-400 hover:text-amber-300 mt-2">
                Ver todas →
              </Link>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma inscrição ainda</p>
          )}
        </div>
      </div>
    </div>
  )
}
