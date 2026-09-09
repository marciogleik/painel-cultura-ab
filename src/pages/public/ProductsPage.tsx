import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ShoppingBag, Search, ExternalLink, MessageCircle } from 'lucide-react'
import { useState } from 'react'

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  peca_teatro: 'Peça de Teatro', show: 'Show', album: 'Álbum', livro: 'Livro',
  exposicao: 'Exposição', filme: 'Filme', danca: 'Dança', artesanato: 'Artesanato',
  grafite: 'Grafite', outro: 'Produto Cultural',
}

const ALL_TYPES = ['todos', ...Object.keys(PRODUCT_TYPE_LABELS)]

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('todos')

  const { data: products, isLoading } = useQuery({
    queryKey: ['public-products', type],
    queryFn: async () => {
      let q = supabase
        .from('cultural_products')
        .select('*, artists(artistic_name, photo_url, profiles(full_name))')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (type !== 'todos') q = q.eq('type', type)
      const { data } = await q
      return data ?? []
    },
  })

  const filtered = products?.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.artists as any)?.artistic_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-inst-header)', borderBottom: '3px solid var(--accent)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag size={32} style={{ color: 'var(--accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-inst-title)' }}>Produtos Culturais</h1>
          </div>
          <p style={{ color: 'var(--text-inst-subtitle)' }}>Peças, shows, álbuns, exposições e obras dos artistas de Água Boa</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto ou artista..."
              className="input pl-10 w-full"
            />
          </div>
          <select value={type} onChange={e => setType(e.target.value)} className="input w-full sm:w-56">
            {ALL_TYPES.map(t => (
              <option key={t} value={t}>{t === 'todos' ? 'Todos os tipos' : PRODUCT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', height: 280 }} />
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product: any) => (
              <div key={product.id} className="group rounded-2xl overflow-hidden border transition-all hover:shadow-lg hover:-translate-y-1" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="aspect-[4/3] overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                  {product.cover_url ? (
                    <img src={product.cover_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={40} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                    {PRODUCT_TYPE_LABELS[product.type] ?? product.type}
                  </span>
                  <h3 className="font-bold text-sm mt-2 leading-snug" style={{ color: 'var(--text-primary)' }}>{product.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {(product.artists as any)?.artistic_name ?? (product.artists as any)?.profiles?.full_name}
                  </p>
                  {product.description && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {product.whatsapp && (
                      <a href={`https://wa.me/${product.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 transition-colors">
                        <MessageCircle size={12} /> Contato
                      </a>
                    )}
                    {product.external_link && (
                      <a href={product.external_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                        <ExternalLink size={12} /> Ver
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhum produto encontrado</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Os artistas ainda estão cadastrando seus produtos</p>
          </div>
        )}
      </div>
    </div>
  )
}
