import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BarChart3, TrendingUp, MapPin, Users, FileText, Tag } from 'lucide-react'

export function AdminIndicators() {
  const { data } = useQuery({
    queryKey: ['indicators'],
    queryFn: async () => {
      const [agents, artists, byCategory, byTypology, byCity, byPersonType] = await Promise.all([
        // Total agentes culturais
        supabase.from('cultural_agents').select('*', { count: 'exact', head: true }),
        // Total artistas (legado)
        supabase.from('artists').select('*', { count: 'exact', head: true }),
        // Artistas por categoria (legado)
        supabase.from('artists').select('category_id, categories(name, icon)').eq('is_public', true),
        // Agentes culturais por tipologia
        supabase
          .from('agent_typologies')
          .select('typology_id, cultural_typologies(name, level)'),
        // Agentes culturais por cidade
        supabase
          .from('agent_addresses')
          .select('city'),
        // Agentes por tipo (física/jurídica)
        supabase
          .from('cultural_agents')
          .select('person_type, collective_type'),
      ])

      // Artistas por categoria (legado)
      const catCounts: Record<string, { name: string; icon: string; count: number }> = {}
      byCategory.data?.forEach((a: any) => {
        if (a.categories) {
          if (!catCounts[a.category_id]) catCounts[a.category_id] = { name: a.categories.name, icon: a.categories.icon, count: 0 }
          catCounts[a.category_id].count++
        }
      })

      // Agentes por tipologia (SMIIC)
      const typologyCounts: Record<string, { name: string; level: number; count: number }> = {}
      byTypology.data?.forEach((t: any) => {
        if (t.cultural_typologies) {
          const key = t.typology_id
          if (!typologyCounts[key]) typologyCounts[key] = {
            name: t.cultural_typologies.name,
            level: t.cultural_typologies.level ?? 0,
            count: 0,
          }
          typologyCounts[key].count++
        }
      })

      // Agentes por cidade
      const cityCounts: Record<string, number> = {}
      byCity.data?.forEach((a: any) => {
        if (a.city) cityCounts[a.city] = (cityCounts[a.city] ?? 0) + 1
      })

      // Tipo de agente
      const personTypeCounts = { fisica: 0, juridica: 0, individual: 0, coletivo: 0 }
      byPersonType.data?.forEach((a: any) => {
        if (a.person_type === 'fisica') personTypeCounts.fisica++
        else if (a.person_type === 'juridica') personTypeCounts.juridica++
        if (a.collective_type === 'individual') personTypeCounts.individual++
        else if (a.collective_type === 'coletivo') personTypeCounts.coletivo++
      })

      return {
        totalAgents: agents.count ?? 0,
        totalArtists: artists.count ?? 0,
        categories: Object.values(catCounts).sort((a, b) => b.count - a.count),
        typologies: Object.values(typologyCounts).sort((a, b) => b.count - a.count),
        cities: Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
        personType: personTypeCounts,
      }
    },
  })

  const maxTypology = data?.typologies[0]?.count ?? 1
  const maxCat = data?.categories[0]?.count ?? 1
  const maxCity = data?.cities[0]?.[1] ?? 1

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Indicadores Culturais</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Dados para apoio à gestão pública da cultura — distribuição para audiências e editais
        </p>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Agentes Culturais (SMIIC)', value: data?.totalAgents ?? 0, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Artistas Cadastrados', value: data?.totalArtists ?? 0, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Pessoa Física', value: data?.personType.fisica ?? 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Pessoas Jurídica', value: data?.personType.juridica ?? 0, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5 text-center">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-2 mx-auto`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 📊 Agentes por tipologia SMIIC (principal) */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Tag className="h-4 w-4 text-violet-400" />
            Distribuição por Tipologia (SMIIC)
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Quantos agentes por área de atuação — do maior pro menor
          </p>
          {data?.typologies && data.typologies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.typologies.map(({ name, level, count }) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {level === 3 ? '↳ ' : level === 2 ? '· ' : ''}{name}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">{count}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / maxTypology) * 100}%`,
                          background: level === 1
                            ? 'linear-gradient(90deg,#8b5cf6,#6d28d9)'
                            : level === 2
                              ? 'linear-gradient(90deg,#f59e0b,#ea580c)'
                              : 'linear-gradient(90deg,#10b981,#059669)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
              Nenhum agente com tipologia cadastrada ainda
            </p>
          )}
        </div>

        {/* Artistas por categoria (legado) */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            Artistas por Categoria (legado)
          </h2>
          {data?.categories && data.categories.length > 0 ? (
            <div className="space-y-3">
              {data.categories.map(({ name, icon, count }) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-5 text-base">{icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                      <span className="text-slate-900 dark:text-white font-semibold">{count}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(count / maxCat) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #ea580c)' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum dado disponível</p>
          )}
        </div>

        {/* Agentes por cidade */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-400" />
            Agentes por Cidade
          </h2>
          {data?.cities && data.cities.length > 0 ? (
            <div className="space-y-3">
              {data.cities.map(([city, count]) => (
                <div key={city} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{city}</span>
                      <span className="text-slate-900 dark:text-white font-semibold">{count}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(count / maxCity) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Nenhum dado de cidade disponível ainda
            </p>
          )}
        </div>

        {/* Individual vs Coletivo */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            Individual vs Coletivo
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Individual', value: data?.personType.individual ?? 0, color: '#3b82f6' },
              { label: 'Coletivo', value: data?.personType.coletivo ?? 0, color: '#8b5cf6' },
            ].map(({ label, value, color }) => {
              const total = (data?.personType.individual ?? 0) + (data?.personType.coletivo ?? 0)
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
        </div>

      </div>
    </div>
  )
}
