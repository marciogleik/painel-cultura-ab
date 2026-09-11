import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { Users, SlidersHorizontal, MapPin, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getPublicAgents, getTypologyTree, flattenTypologyTree } from '@/services/culturalAgentService'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonGrid } from '@/components/ui/Spinner'
import type { Category, PublicCulturalAgent } from '@/types'

const PAGE_SIZE = 12

type CategoryOption = Pick<Category, 'id' | 'name' | 'icon'>

function agentKind(agent: PublicCulturalAgent): string {
  if (agent.collective_type === 'coletivo') return 'Coletivo / Grupo'
  return agent.person_type === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const search = searchParams.get('q') ?? ''
  const categoryId = searchParams.get('category') ?? ''
  const typologyId = searchParams.get('typology') ?? ''
  const city = searchParams.get('city') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'page') p.delete('page')
    setSearchParams(p)
  }

  function clearFilters() {
    setSearchParams({})
  }

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as CategoryOption[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: typologyMap } = useQuery({
    queryKey: ['typology-tree', 'agent'],
    queryFn: async () => flattenTypologyTree(await getTypologyTree('agent')),
    staleTime: 5 * 60 * 1000,
  })

  const typologyOptions = useMemo(() => {
    if (!typologyMap) return []
    return Array.from(typologyMap.entries()).map(([id, { path }]) => ({ id, label: path.join(' › ') }))
  }, [typologyMap])

  const { data: cities = [] } = useQuery({
    queryKey: ['public-agent-cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_cultural_agents')
        .select('city')
        .not('city', 'is', null)
        .order('city')
      if (error) throw error
      const rows = (data ?? []) as { city: string | null }[]
      return Array.from(new Set(rows.map((r) => r.city?.trim()).filter((c): c is string => !!c)))
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['public-agents', { search, categoryId, typologyId, city, page }],
    queryFn: () =>
      getPublicAgents({
        search: search || undefined,
        category_id: categoryId || undefined,
        typology_id: typologyId || undefined,
        city: city || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  })

  const hasFilters = Boolean(search || categoryId || typologyId || city)
  const activeCategory = categories.find((c) => c.id === categoryId)
  const activeTypology = typologyId ? typologyMap?.get(typologyId) : undefined
  const totalPages = Math.max(1, data?.totalPages ?? 1)

  function firstTypologyLabel(agent: PublicCulturalAgent): string | null {
    const t = agent.typologies?.[0]
    if (!t) return null
    return typologyMap?.get(t.typology_id)?.path.join(' › ') ?? t.cultural_typologies?.name ?? null
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <PageHeader
        variant="public"
        icon={Users}
        eyebrow="Cadastro Municipal"
        title="Agentes Culturais"
        description={
          data
            ? `${data.count} ${data.count === 1 ? 'agente cultural cadastrado' : 'agentes culturais cadastrados'} em Água Boa e região`
            : 'Artistas, grupos, coletivos e instituições culturais de Água Boa e região'
        }
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Busca */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={(v) => setParam('q', v)}
              label="Buscar agentes culturais"
              placeholder="Buscar por nome, área ou atividade..."
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="agent-filters"
            className={`btn btn-secondary gap-2 ${filtersOpen ? 'border-amber-500' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtros
            {hasFilters && (
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-900"
                aria-label="Filtros ativos"
              >
                !
              </span>
            )}
          </button>
        </div>

        {/* Painel de filtros */}
        {filtersOpen && (
          <div id="agent-filters" className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up">
            <div>
              <label htmlFor="filter-category" className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Área de atuação
              </label>
              <select
                id="filter-category"
                className="input"
                value={categoryId}
                onChange={(e) => setParam('category', e.target.value)}
              >
                <option value="">Todas as áreas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-typology" className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Tipologia cultural
              </label>
              <select
                id="filter-typology"
                className="input"
                value={typologyId}
                onChange={(e) => setParam('typology', e.target.value)}
              >
                <option value="">Todas as tipologias</option>
                {typologyOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-city" className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Cidade
              </label>
              <select
                id="filter-city"
                className="input"
                value={city}
                onChange={(e) => setParam('city', e.target.value)}
              >
                <option value="">Todas as cidades</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Filtros ativos */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Filtros ativos:</span>
            {search && (
              <span className="badge badge-amber gap-1">
                Busca: “{search}”
                <button type="button" onClick={() => setParam('q', '')} aria-label="Remover filtro de busca" className="ml-1 hover:opacity-70">
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            )}
            {activeCategory && (
              <span className="badge badge-amber gap-1">
                {activeCategory.name}
                <button type="button" onClick={() => setParam('category', '')} aria-label="Remover filtro de área" className="ml-1 hover:opacity-70">
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            )}
            {activeTypology && (
              <span className="badge badge-amber gap-1">
                {activeTypology.path.join(' › ')}
                <button type="button" onClick={() => setParam('typology', '')} aria-label="Remover filtro de tipologia" className="ml-1 hover:opacity-70">
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            )}
            {city && (
              <span className="badge badge-amber gap-1">
                {city}
                <button type="button" onClick={() => setParam('city', '')} aria-label="Remover filtro de cidade" className="ml-1 hover:opacity-70">
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            )}
            <button type="button" onClick={clearFilters} className="text-xs underline hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
              Limpar tudo
            </button>
          </div>
        )}

        {/* Resultados */}
        {isLoading ? (
          <SkeletonGrid items={8} className="md:grid-cols-3 lg:grid-cols-4" />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum agente cultural encontrado"
            description={hasFilters ? 'Tente ajustar os filtros ou buscar por outro termo.' : 'Ainda não há agentes culturais públicos cadastrados.'}
            action={hasFilters ? <button type="button" onClick={clearFilters} className="btn btn-secondary">Limpar filtros</button> : undefined}
          />
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 list-none p-0 m-0">
            {data.data.map((agent) => {
              const name = agent.display_name ?? 'Agente Cultural'
              const area = agent.areas?.[0]?.categories
              const typology = firstTypologyLabel(agent)
              const place = [agent.neighborhood, agent.city ?? 'Água Boa'].filter(Boolean).join(', ')
              return (
                <li key={agent.id}>
                  <Link
                    to={`/agentes/${agent.id}`}
                    className="card card-glow p-5 text-center group animate-slide-up block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <div className="mx-auto mb-3" style={{ height: 72, width: 72 }}>
                      {agent.photo_url ? (
                        <img
                          src={agent.photo_url}
                          alt={name}
                          loading="lazy"
                          className="rounded-full object-cover ring-2 ring-white/10 group-hover:ring-amber-500/40 transition-all"
                          style={{ height: 72, width: 72 }}
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="rounded-full flex items-center justify-center ring-2 ring-white/10 group-hover:ring-amber-500/40 transition-all"
                          style={{ height: 72, width: 72, background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
                        >
                          <span className="text-2xl font-bold text-white">{name[0]?.toUpperCase() ?? 'A'}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm font-semibold truncate group-hover:text-amber-500 transition-colors" style={{ color: 'var(--text-primary)' }}>
                      {name}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{agentKind(agent)}</p>

                    <div className="flex flex-wrap justify-center gap-1 mt-2">
                      {area && (
                        <span className="badge badge-amber text-xs">
                          {area.icon ? `${area.icon} ` : ''}{area.name}
                        </span>
                      )}
                      {typology && !area && (
                        <span className="badge badge-slate text-xs line-clamp-1">{typology}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-1 mt-2">
                      <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{place}</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        {/* Paginação */}
        {data && totalPages > 1 && (
          <nav aria-label="Paginação" className="flex items-center justify-center gap-3 mt-10">
            <button
              type="button"
              onClick={() => setParam('page', String(page - 1))}
              disabled={page <= 1}
              className="btn btn-secondary"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setParam('page', String(page + 1))}
              disabled={page >= totalPages}
              className="btn btn-secondary"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
