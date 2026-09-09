import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ShoppingBag, Eye, EyeOff, Star } from 'lucide-react'

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  peca_teatro: 'Peça de Teatro', show: 'Show', album: 'Álbum', livro: 'Livro',
  exposicao: 'Exposição', filme: 'Filme', danca: 'Dança', artesanato: 'Artesanato',
  grafite: 'Grafite', outro: 'Produto Cultural',
}

export function AdminProducts() {
  const qc = useQueryClient()

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cultural_products')
        .select('*, artists(artistic_name, profiles(full_name))')
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      await supabase.from('cultural_products').update({ [field]: value }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Produtos Culturais</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Modere os produtos cadastrados pelos artistas</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />)}</div>
      ) : products && products.length > 0 ? (
        <div className="rounded-2xl border overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full">
            <thead style={{ background: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Produto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Artista</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Ativo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Destaque</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {products.map((product: any) => (
                <tr key={product.id} style={{ background: 'var(--bg-card)' }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{product.title}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {(product.artists as any)?.artistic_name ?? (product.artists as any)?.profiles?.full_name}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {PRODUCT_TYPE_LABELS[product.type] ?? product.type}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleMutation.mutate({ id: product.id, field: 'is_active', value: !product.is_active })}
                      className={`p-1.5 rounded-lg transition-colors ${product.is_active ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'}`}
                      title={product.is_active ? 'Ativo — clique para desativar' : 'Inativo — clique para ativar'}
                    >
                      {product.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleMutation.mutate({ id: product.id, field: 'is_featured', value: !product.is_featured })}
                      className={`p-1.5 rounded-lg transition-colors ${product.is_featured ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:text-amber-500'}`}
                      title={product.is_featured ? 'Em destaque' : 'Sem destaque'}
                    >
                      <Star size={16} className={product.is_featured ? 'fill-current' : ''} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
          <ShoppingBag size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-primary)' }}>Nenhum produto cadastrado pelos artistas ainda</p>
        </div>
      )}
    </div>
  )
}
