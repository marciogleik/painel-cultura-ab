import { useQuery } from '@tanstack/react-query'
import { BarChart3, MapPin, Users, Tag, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTypologyTree, flattenTypologyTree } from '@/services/culturalAgentService'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'

interface Bar { name: string; count: number; icon?: string | null }

interface IndicatorsData {
  totalAgents: number
  approvedAgents: number
  personType: { fisica: number; juridica: number; individual: number; coletivo: number }
  typologyGroups: { group: string; total: number; items: Bar[] }[]
  areas: Bar[]
  cities: Bar[]
}

async function loadIndicators(): Promise<IndicatorsData> {
  const [agentsRes, typologyRes, areasRes, addressRes, tree] = await Promise.all([
    supabase.from('cultural_agents').select('person_type, collective_type, registration_status'),
    supabase.from('agent_typologies').select('typology_id'),
    supabase.from('agent_areas').select('category_id, categories(name, icon)'),
    supabase.from('agent_addresses').select('city'),
    getTypologyTree('agent'),
  ])
  for (const r of [agentsRes, typologyRes, areasRes, addressRes]) if (r.error) throw r.error

  const agents = (agentsRes.data ?? []) as { person_type: string; collective_type: string; registration_status: string }[]
  const personType = { fisica: 0, juridica: 0, individual: 0, coletivo: 0 }
  let approvedAgents = 0
  for (const a of agents) {
    if (a.person_type === 'fisica') personType.fisica++
    else if (a.person_type === 'juridica') personType.juridica++
    if (a.collective_type === 'individual') personType.individual++
    else if (a.collective_type === 'coletivo') personType.coletivo++
    if (a.registration_status === 'aprovado') approvedAgents++
  }

  // Tipologias agrupadas pelo nível 1 (path[0]) com o nome completo do caminho em cada item.
  const flat = flattenTypologyTree(tree)
  const groups = new Map<string, Map<string, Bar>>()
  for (const row of (typologyRes.data ?? []) as { typology_id: string }[]) {
    const entry = flat.get(row.typology_id)
    if (!entry) continue
    const group = entry.path[0]
    const label = entry.path.length > 1 ? entry.path.slice(1).join(' › ') : entry.node.name
    const g = groups.get(group) ?? new Map<string, Bar>()
    const bar = g.get(row.typology_id) ?? { name: label, count: 0 }
    bar.count++
    g.set(row.typology_id, bar)
    groups.set(group, g)
  }
  const typologyGroups = Array.from(groups.entries())
    .map(([group, items]) => {
      const list = Array.from(items.values()).sort((a, b) => b.count - a.count)
      return { group, total: list.reduce((s, b) => s + b.count, 0), items: list }
    })
    .sort((a, b) => b.total - a.total)

  const areaMap = new Map<string, Bar>()
  for (const row of (areasRes.data ?? []) as unknown as { category_id: string; categories: { name: string; icon: string | null } | null }[]) {
    if (!row.categories) continue
    const bar = areaMap.get(row.category_id) ?? { name: row.categories.name, icon: row.categories.icon, count: 0 }
    bar.count++
    areaMap.set(row.category_id, bar)
  }

  const cityMap = new Map<string, number>()
  for (const row of (addressRes.data ?? []) as { city: string | null }[]) {
    const city = row.city?.trim()
    if (city) cityMap.set(city, (cityMap.get(city) ?? 0) + 1)
  }

  return {
    totalAgents: agents.length,
    approvedAgents,
    personType,
    typologyGroups,
    areas: Array.from(areaMap.values()).sort((a, b) => b.count - a.count),
    cities: Array.from(cityMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
  }
}

function BarList({ items, max, color }: { items: Bar[]; max: number; color: string }) {
  return (
    <ul className="space-y-3">
      {items.map((b) => (
        <li key={b.name} className="flex items-center gap-3">
          {b.icon != null && <span className="w-5 text-base" aria-hidden="true">{b.icon}</span>}
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-secondary)' }}>{b.name}</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{b.count}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full" style={{ width: `${(b.count / Math.max(max, 1)) * 100}%`, background: color }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function AdminIndicators() {
  const query = useQuery({ queryKey: ['indicators'], queryFn: loadIndicators })
  const data = query.data

  return (
    <div className="animate-fade-in">
      <PageHeader icon={BarChart3} title="Indicadores Culturais" description="Dados de apoio à gestão pública da cultura: distribuição dos agentes por tipologia, área e território." />

      {query.isLoading ? (
        <SkeletonList rows={5} />
      ) : query.error || !data ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Agentes cadastrados', value: data.totalAgents, color: 'text-violet-500', bg: 'bg-violet-500/10' },
              { label: 'Agentes homologados', value: data.approvedAgents, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Pessoas físicas', value: data.personType.fisica, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Pessoas jurídicas', value: data.personType.juridica, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="card p-5 text-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-2 mx-auto`}>
                  <Users className={`h-5 w-5 ${color}`} aria-hidden="true" />
                </div>
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="card p-6 lg:col-span-2" aria-labelledby="typ-title">
              <h2 id="typ-title" className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Tag className="h-4 w-4 text-violet-500" aria-hidden="true" /> Distribuição por tipologia (SMIIC)
              </h2>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Agrupado pela tipologia de nível 1; cada barra é uma subtipologia escolhida pelos agentes.</p>
              {data.typologyGroups.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Nenhum agente com tipologia cadastrada ainda.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.typologyGroups.map((g) => (
                    <div key={g.group} className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{g.group}</h3>
                        <span className="badge badge-amber text-xs">{g.total}</span>
                      </div>
                      <BarList items={g.items} max={g.items[0]?.count ?? 1} color="linear-gradient(90deg,#8b5cf6,#6d28d9)" />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card p-6" aria-labelledby="areas-title">
              <h2 id="areas-title" className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Layers className="h-4 w-4 text-amber-500" aria-hidden="true" /> Agentes por área cultural
              </h2>
              {data.areas.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum agente informou área cultural ainda.</p>
              ) : (
                <BarList items={data.areas} max={data.areas[0].count} color="linear-gradient(90deg, #f59e0b, #ea580c)" />
              )}
            </section>

            <section className="card p-6" aria-labelledby="cities-title">
              <h2 id="cities-title" className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <MapPin className="h-4 w-4 text-emerald-500" aria-hidden="true" /> Agentes por cidade
              </h2>
              {data.cities.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum endereço cadastrado ainda.</p>
              ) : (
                <BarList items={data.cities} max={data.cities[0].count} color="#10b981" />
              )}
            </section>

            <section className="card p-6 lg:col-span-2" aria-labelledby="collective-title">
              <h2 id="collective-title" className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <BarChart3 className="h-4 w-4 text-blue-500" aria-hidden="true" /> Individual × coletivo
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Individual', value: data.personType.individual, color: '#3b82f6' },
                  { label: 'Coletivo', value: data.personType.coletivo, color: '#8b5cf6' },
                ].map(({ label, value, color }) => {
                  const total = data.personType.individual + data.personType.coletivo
                  const pct = total > 0 ? Math.round((value / total) * 100) : 0
                  return (
                    <div key={label} className="text-center p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{pct}% do total</p>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
