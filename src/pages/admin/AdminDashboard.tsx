import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, FileText, TrendingUp, BarChart3, Clock, LayoutDashboard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { InscriptionStatus } from '@/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState } from '@/components/ui/EmptyState'

const INSCRIPTION_LABELS: Record<InscriptionStatus, { label: string; badge: string }> = {
  ABERTO: { label: 'Enviada', badge: 'badge-blue' },
  EM_ANALISE: { label: 'Em análise', badge: 'badge-amber' },
  APROVADO: { label: 'Aprovada', badge: 'badge-green' },
  REPROVADO: { label: 'Reprovada', badge: 'badge-red' },
  FINALIZADO: { label: 'Finalizada', badge: 'badge-slate' },
}

interface RecentInscription {
  id: string
  status: InscriptionStatus
  submitted_at: string
  editais: { title: string } | null
  cultural_agents: { display_name: string | null } | null
  artists: { artistic_name: string | null; profiles: { full_name: string } | null } | null
}

interface AreaRow {
  category_id: string
  categories: { name: string; icon: string | null } | null
}

async function countRows(build: () => PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await build()
  if (error) throw error
  return count ?? 0
}

const head = { count: 'exact' as const, head: true }

export function AdminDashboard() {
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [agents, pendingAgents, editais, openEditais, inscriptions, pendingInscriptions, users] = await Promise.all([
        countRows(() => supabase.from('cultural_agents').select('id', head)),
        countRows(() => supabase.from('cultural_agents').select('id', head).in('registration_status', ['enviado', 'em_analise'])),
        countRows(() => supabase.from('editais').select('id', head)),
        countRows(() => supabase.from('editais').select('id', head).eq('status', 'PUBLICADO')),
        countRows(() => supabase.from('inscriptions').select('id', head)),
        countRows(() => supabase.from('inscriptions').select('id', head).in('status', ['ABERTO', 'EM_ANALISE'])),
        countRows(() => supabase.from('profiles').select('id', head)),
      ])
      return { agents, pendingAgents, editais, openEditais, inscriptions, pendingInscriptions, users }
    },
  })

  const recent = useQuery({
    queryKey: ['recent-inscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscriptions')
        .select('id, status, submitted_at, editais(title), cultural_agents(display_name), artists(artistic_name, profiles(full_name))')
        .order('submitted_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return (data ?? []) as unknown as RecentInscription[]
    },
  })

  const areas = useQuery({
    queryKey: ['agent-area-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agent_areas').select('category_id, categories(name, icon)')
      if (error) throw error
      const counts = new Map<string, { name: string; icon: string | null; count: number }>()
      for (const row of (data ?? []) as unknown as AreaRow[]) {
        if (!row.categories) continue
        const cur = counts.get(row.category_id) ?? { name: row.categories.name, icon: row.categories.icon, count: 0 }
        cur.count++
        counts.set(row.category_id, cur)
      }
      return Array.from(counts.values()).sort((a, b) => b.count - a.count)
    },
  })

  const cards = [
    { label: 'Agentes culturais', value: stats.data?.agents, icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10', href: '/admin/agentes' },
    { label: 'Aguardando homologação', value: stats.data?.pendingAgents, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', href: '/admin/agentes' },
    { label: 'Editais', value: stats.data?.editais, icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10', href: '/admin/editais', hint: stats.data ? `${stats.data.openEditais} publicado(s)` : undefined },
    { label: 'Inscrições', value: stats.data?.inscriptions, icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-500/10', href: '/admin/inscricoes' },
    { label: 'Inscrições pendentes', value: stats.data?.pendingInscriptions, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10', href: '/admin/inscricoes' },
    { label: 'Usuários', value: stats.data?.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', href: '/admin/usuarios' },
  ]

  const maxArea = areas.data?.[0]?.count ?? 1

  return (
    <div className="animate-fade-in">
      <PageHeader icon={LayoutDashboard} title="Painel administrativo" description="Visão geral da Plataforma Municipal de Cultura de Água Boa." />

      {stats.error && <ErrorState error={stats.error} onRetry={() => stats.refetch()} className="mb-6" />}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color, bg, href, hint }) => (
          <Link key={label} to={href} className="card card-glow p-5 group" aria-busy={stats.isLoading}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-3`}>
              <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
            </div>
            {stats.isLoading ? (
              <div className="skeleton h-8 w-12 rounded mb-1" />
            ) : (
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value ?? 0}</p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            {hint && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card p-6" aria-labelledby="areas-title">
          <h2 id="areas-title" className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Agentes por área cultural
          </h2>
          {areas.isLoading ? (
            <div className="space-y-3" aria-busy="true">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-6 rounded" />)}</div>
          ) : areas.error ? (
            <ErrorState error={areas.error} onRetry={() => areas.refetch()} />
          ) : areas.data && areas.data.length > 0 ? (
            <ul className="space-y-3">
              {areas.data.slice(0, 8).map(({ name, icon, count: n }) => (
                <li key={name} className="flex items-center gap-3">
                  <span className="text-base w-6" aria-hidden="true">{icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{n}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(n / maxArea) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #ea580c)' }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum agente informou área cultural ainda.</p>
          )}
        </section>

        <section className="card p-6" aria-labelledby="recent-title">
          <h2 id="recent-title" className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FileText className="h-4 w-4 text-blue-500" aria-hidden="true" />
            Inscrições recentes
          </h2>
          {recent.isLoading ? (
            <div className="space-y-3" aria-busy="true">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-8 rounded" />)}</div>
          ) : recent.error ? (
            <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
          ) : recent.data && recent.data.length > 0 ? (
            <ul className="space-y-3">
              {recent.data.map((ins) => {
                const name = ins.cultural_agents?.display_name ?? ins.artists?.artistic_name ?? ins.artists?.profiles?.full_name ?? 'Agente cultural'
                const meta = INSCRIPTION_LABELS[ins.status] ?? { label: ins.status, badge: 'badge-slate' }
                return (
                  <li key={ins.id} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{ins.editais?.title ?? '—'} · {formatDate(ins.submitted_at)}</p>
                    </div>
                    <span className={`badge text-xs flex-shrink-0 ${meta.badge}`}>{meta.label}</span>
                  </li>
                )
              })}
              <li>
                <Link to="/admin/inscricoes" className="block text-xs font-medium hover:underline mt-2" style={{ color: 'var(--accent)' }}>Ver todas as inscrições →</Link>
              </li>
            </ul>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma inscrição ainda.</p>
          )}
        </section>
      </div>
    </div>
  )
}
