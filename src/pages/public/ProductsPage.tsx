import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ShoppingBag, ExternalLink, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sanitizeSearch, safeUrl, whatsappLink } from '@/lib/utils'
import type { CulturalProduct } from '@/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonGrid, Spinner } from '@/components/ui/Spinner'

type ProductType = CulturalProduct['type']

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  peca_teatro: 'Peça de Teatro', show: 'Show', album: 'Álbum', livro: 'Livro',
  exposicao: 'Exposição', filme: 'Filme', danca: 'Dança', artesanato: 'Artesanato',
  grafite: 'Grafite', outro: 'Produto Cultural',
}

const ALL_TYPES = Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]
const PAGE_SIZE = 24

/** Produto com o agente (novo) e, para registros antigos, o artista legado. */
type ProductRow = Pick<CulturalProduct, 'id' | 'agent_id' | 'title' | 'type' | 'cover_url' | 'description' | 'whatsapp' | 'external_link'> & {
  cultural_agents?: { id: string; display_name: string | null; photo_url: string | null } | null
  artists?: { artistic_name: string | null; profiles?: { full_name: string | null } | null } | null
}

function agentName(p: ProductRow): string | null {
  return p.cultural_agents?.display_name ?? p.artists?.artistic_name ?? p.artists?.profiles?.full_name ?? null
}

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<ProductType | 'todos'>('todos')

  const query = useInfiniteQuery({
    queryKey: ['public-products', { type, search }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('cultural_products')
        .select('id, agent_id, title, type, cover_url, description, whatsapp, external_link, cultural_agents(id, display_name, photo_url), artists(artistic_name, profiles(full_name))')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1)
      if (type !== 'todos') q = q.eq('type', type)
      const term = sanitizeSearch(search)
      if (term) q = q.ilike('title', `%${term}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as ProductRow[]
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
    placeholderData: (prev) => prev,
  })

  const products = query.data?.pages.flat() ?? []
  const hasFilters = !!search || type !== 'todos'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <PageHeader
        variant="public"
        icon={ShoppingBag}
        eyebrow="Vitrine cultural"
        title="Produtos Culturais"
        description="Peças, shows, álbuns, exposições e obras dos agentes culturais de Água Boa"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <SearchInput
            className="flex-1"
            value={search}
            onChange={setSearch}
            label="Buscar produto"
            placeholder="Buscar produto pelo título..."
          />
          <div className="w-full sm:w-56">
            <label htmlFor="product-type" className="sr-only">Tipo de produto</label>
            <select
              id="product-type"
              value={type}
              onChange={(e) => setType(e.target.value as ProductType | 'todos')}
              className="input"
            >
              <option value="todos">Todos os tipos</option>
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>

        {query.isLoading ? (
          <SkeletonGrid items={8} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => {
                const name = agentName(product)
                const wa = whatsappLink(product.whatsapp, `Olá! Vi "${product.title}" na Plataforma Municipal de Cultura.`)
                const link = safeUrl(product.external_link)
                return (
                  <article key={product.id} className="card group overflow-hidden flex flex-col transition-all hover:-translate-y-1">
                    <div className="aspect-[4/3] overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                      {product.cover_url ? (
                        <img
                          src={product.cover_url}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag size={40} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <span className="badge badge-amber self-start">
                        {PRODUCT_TYPE_LABELS[product.type] ?? product.type}
                      </span>
                      <h2 className="font-bold text-sm mt-2 leading-snug" style={{ color: 'var(--text-primary)' }}>{product.title}</h2>
                      {name && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {product.agent_id ? (
                            <Link to={`/agentes/${product.agent_id}`} className="hover:underline">{name}</Link>
                          ) : name}
                        </p>
                      )}
                      {product.description && (
                        <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>
                      )}
                      {(wa || link) && (
                        <div className="flex flex-wrap gap-2 mt-auto pt-3">
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Contato por WhatsApp sobre ${product.title}`}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                            >
                              <MessageCircle size={12} aria-hidden="true" /> Contato
                            </a>
                          )}
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Ver mais sobre ${product.title} (abre em nova aba)`}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                              style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}
                            >
                              <ExternalLink size={12} aria-hidden="true" /> Ver
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            {query.hasNextPage && (
              <div className="flex justify-center mt-10">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                  aria-busy={query.isFetchingNextPage}
                >
                  {query.isFetchingNextPage && <Spinner size={14} />}
                  Carregar mais
                </button>
              </div>
            )}
          </>
        ) : hasFilters ? (
          <EmptyState
            icon={ShoppingBag}
            title="Nenhum produto encontrado"
            description="Tente outro termo ou outro tipo de produto."
            action={<button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setType('todos') }}>Limpar filtros</button>}
          />
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="Nenhum produto cadastrado ainda"
            description="Os agentes culturais ainda estão cadastrando seus produtos."
          />
        )}
      </div>
    </div>
  )
}
