import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getArtists } from '@/services/artistService'
import { getPublicAgents } from '@/services/culturalAgentService'
import { Search, SlidersHorizontal, MapPin, Star, ChevronLeft, ChevronRight, X } from 'lucide-react'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const search = searchParams.get('q') ?? ''
  const categoryId = searchParams.get('category') ?? ''
  const subcategoryId = searchParams.get('subcategory') ?? ''
  const neighborhood = searchParams.get('neighborhood') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')

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

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
      return data ?? []
    },
  })

  const { data: subcategories } = useQuery({
    queryKey: ['subcategories', categoryId],
    queryFn: async () => {
      if (!categoryId) return []
      const { data } = await supabase.from('subcategories').select('*').eq('category_id', categoryId).order('sort_order')
      return data ?? []
    },
    enabled: !!categoryId,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['artists-and-agents', { search, categoryId, subcategoryId, neighborhood, page }],
    queryFn: async () => {
      // 1. Busca agentes oficiais do SMIIC
      const smiicRes = await getPublicAgents({
        search: search || undefined,
        page,
        pageSize: 12,
      }).catch(() => ({ data: [], count: 0, totalPages: 1 }))

      // 2. Busca artistas da tabela legado
      const legacyRes = await getArtists({
        search: search || undefined,
        category_id: categoryId || undefined,
        subcategory_id: subcategoryId || undefined,
        neighborhood: neighborhood || undefined,
        page,
        pageSize: 12,
      }).catch(() => ({ data: [], count: 0, totalPages: 1 }))

      const mappedSmiic = smiicRes.data.map((a: any) => {
        const addr = Array.isArray(a.agent_addresses) ? a.agent_addresses[0] : a.agent_addresses
        const typ = a.agent_typologies?.[0]?.cultural_typologies?.name
        const area = a.agent_areas?.[0]?.categories
        return {
          id: a.id,
          artistic_name: a.display_name || a.legal_name,
          photo_url: a.photo_url,
          city: addr?.city || 'Água Boa',
          neighborhood: addr?.neighborhood,
          is_verified: true,
          profiles: null,
          is_available: true,
          categories: area ? { name: area.name, icon: area.icon } : (typ ? { name: typ, icon: '🏛️' } : null),
        } as any
      })

      const combinedData = [...mappedSmiic, ...legacyRes.data]
      const totalCount = smiicRes.count + legacyRes.count

      return {
        data: combinedData,
        count: totalCount,
        page,
        pageSize: 12,
        totalPages: Math.max(1, Math.ceil(totalCount / 12)),
      }
    },
    placeholderData: (prev) => prev,
  })

  const hasFilters = search || categoryId || subcategoryId || neighborhood

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Artistas e Agentes Culturais</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {data?.count ?? 0} artistas cadastrados em Água Boa e região
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por nome, gênero, estilo..."
            className="input pl-10"
            value={search}
            onChange={(e) => setParam('q', e.target.value)}
          />
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`btn btn-secondary gap-2 ${filtersOpen ? 'border-amber-500 text-amber-400' : ''}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {hasFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-black">
              !
            </span>
          )}
        </button>
      </div>

      {/* Filters panel */}
      {filtersOpen && (
        <div className="card p-5 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Filtros</h3>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                <X className="h-3 w-3" />
                Limpar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Categoria
              </label>
              <select
                className="input"
                value={categoryId}
                onChange={(e) => setParam('category', e.target.value)}
              >
                <option value="">Todas as categorias</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            {categoryId && subcategories && subcategories.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Subcategoria
                </label>
                <select
                  className="input"
                  value={subcategoryId}
                  onChange={(e) => setParam('subcategory', e.target.value)}
                >
                  <option value="">Todas</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Bairro
              </label>
              <input
                type="text"
                className="input"
                placeholder="Nome do bairro"
                value={neighborhood}
                onChange={(e) => setParam('neighborhood', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Active filters chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 mb-6">
          {search && (
            <span className="badge badge-amber">
              Busca: "{search}"
              <button onClick={() => setParam('q', '')} className="ml-1 hover:text-slate-900 dark:text-white">×</button>
            </span>
          )}
          {categoryId && categories && (
            <span className="badge badge-blue">
              {categories.find(c => c.id === categoryId)?.name}
              <button onClick={() => { setParam('category', ''); setParam('subcategory', '') }} className="ml-1 hover:text-slate-900 dark:text-white">×</button>
            </span>
          )}
          {neighborhood && (
            <span className="badge badge-slate">
              Bairro: {neighborhood}
              <button onClick={() => setParam('neighborhood', '')} className="ml-1 hover:text-slate-900 dark:text-white">×</button>
            </span>
          )}
        </div>
      )}

      {/* Artists grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="skeleton mx-auto mb-3 h-16 w-16 rounded-full" />
              <div className="skeleton h-4 w-3/4 mx-auto mb-2" />
              <div className="skeleton h-3 w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="card p-16 text-center">
          <Search className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nenhum artista encontrado</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Tente ajustar os filtros ou buscar por outro termo
          </p>
          <button onClick={clearFilters} className="btn btn-secondary">
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data?.data.map((artist) => (
            <Link
              key={artist.id}
              to={`/artistas/${artist.id}`}
              className="card card-glow p-5 text-center group animate-slide-up"
            >
              <div className="relative mx-auto mb-3 h-18 w-18">
                {artist.photo_url ? (
                  <img
                    src={artist.photo_url}
                    alt={artist.artistic_name ?? ''}
                    className="h-18 w-18 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-amber-500/40 transition-all"
                    style={{ height: 72, width: 72 }}
                  />
                ) : (
                  <div
                    className="rounded-full flex items-center justify-center ring-2 ring-white/10 group-hover:ring-amber-500/40 transition-all"
                    style={{
                      height: 72,
                      width: 72,
                      background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                    }}
                  >
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {(artist.artistic_name ?? (artist.profiles as any)?.full_name ?? 'A')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                {artist.is_verified && (
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-[var(--bg-card)]">
                    <Star className="h-3 w-3 text-slate-900 dark:text-white fill-current" />
                  </div>
                )}
              </div>

              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-amber-400 transition-colors">
                {artist.artistic_name ?? (artist.profiles as any)?.full_name}
              </p>

              {(artist.categories as any)?.name && (
                <span className="badge badge-amber text-xs mt-1">
                  {(artist.categories as any)?.icon} {(artist.categories as any)?.name}
                </span>
              )}

              <div className="flex items-center justify-center gap-1 mt-2">
                <MapPin className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {artist.neighborhood ? `${artist.neighborhood}, ` : ''}{artist.city}
                </span>
              </div>

              {artist.is_available && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <span className="status-dot online" />
                  <span className="text-xs text-emerald-400">Disponível</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-10">
          <button
            onClick={() => setParam('page', String(page - 1))}
            disabled={page <= 1}
            className="btn btn-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Página {page} de {data.totalPages}
          </span>
          <button
            onClick={() => setParam('page', String(page + 1))}
            disabled={page >= data.totalPages}
            className="btn btn-secondary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
