import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ShoppingBag, Plus, Pencil, Trash2, X, MessageCircle, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

const PRODUCT_TYPES = [
  { value: 'peca_teatro', label: 'Peça de Teatro' },
  { value: 'show', label: 'Show' },
  { value: 'album', label: 'Álbum' },
  { value: 'livro', label: 'Livro' },
  { value: 'exposicao', label: 'Exposição' },
  { value: 'filme', label: 'Filme' },
  { value: 'danca', label: 'Dança' },
  { value: 'artesanato', label: 'Artesanato' },
  { value: 'grafite', label: 'Grafite' },
  { value: 'outro', label: 'Outro' },
]

interface ProductForm {
  title: string
  type: string
  description: string
  whatsapp: string
  external_link: string
  cover_url: string
  technical_sheet_text: string
}

export function MyProductsPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>()

  // Get artist id
  const { data: artist } = useQuery({
    queryKey: ['my-artist', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('artists').select('id').eq('user_id', profile!.id).single()
      return data
    },
    enabled: !!profile?.id,
  })

  const { data: products, isLoading } = useQuery({
    queryKey: ['my-products', artist?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('cultural_products')
        .select('*')
        .eq('artist_id', artist!.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!artist?.id,
  })

  const mutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const payload = {
        title: data.title,
        type: data.type,
        description: data.description || null,
        whatsapp: data.whatsapp || null,
        external_link: data.external_link || null,
        cover_url: data.cover_url || null,
        technical_sheet: data.technical_sheet_text ? { details: data.technical_sheet_text } : {},
        artist_id: artist!.id,
      }
      if (editing) {
        await supabase.from('cultural_products').update(payload).eq('id', editing.id)
      } else {
        await supabase.from('cultural_products').insert(payload)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] })
      setModalOpen(false)
      setEditing(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('cultural_products').delete().eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-products'] }),
  })

  function openEdit(product: any) {
    setEditing(product)
    reset({
      title: product.title,
      type: product.type,
      description: product.description ?? '',
      whatsapp: product.whatsapp ?? '',
      external_link: product.external_link ?? '',
      cover_url: product.cover_url ?? '',
      technical_sheet_text: product.technical_sheet?.details ?? '',
    })
    setModalOpen(true)
  }

  function openNew() {
    setEditing(null)
    reset({ type: 'outro' })
    setModalOpen(true)
  }

  if (!artist) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <ShoppingBag size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-primary)' }}>Crie seu perfil artístico primeiro para cadastrar produtos.</p>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Meus Produtos Culturais</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Cadastre suas peças, shows, livros, exposições e mais</p>
        </div>
        <button onClick={openNew} className="btn btn-primary">
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-2xl border animate-pulse h-48" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />)}
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product: any) => (
            <div key={product.id} className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="aspect-video" style={{ background: 'var(--bg-secondary)' }}>
                {product.cover_url ? (
                  <img src={product.cover_url} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={40} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                  {PRODUCT_TYPES.find(t => t.value === product.type)?.label ?? product.type}
                </span>
                <h3 className="font-bold text-sm mt-2" style={{ color: 'var(--text-primary)' }}>{product.title}</h3>
                {product.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>}
                
                {product.technical_sheet?.details && (
                  <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    <strong>Ficha técnica:</strong> {product.technical_sheet.details}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3">
                  {product.whatsapp && (
                    <a href={`https://wa.me/${product.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                      <MessageCircle size={12} /> WhatsApp
                    </a>
                  )}
                  {product.external_link && (
                    <a href={product.external_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                      <ExternalLink size={12} /> Link
                    </a>
                  )}
                  <div className="flex-1" />
                  <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => { if (confirm('Excluir este produto?')) deleteMutation.mutate(product.id) }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
          <ShoppingBag size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhum produto cadastrado</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>Cadastre suas peças, shows, exposições e muito mais</p>
          <button onClick={openNew} className="btn btn-primary">
            <Plus size={16} /> Cadastrar primeiro produto
          </button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editing ? 'Editar Produto' : 'Novo Produto Cultural'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
              <div>
                <label className="label">Título *</label>
                <input {...register('title', { required: 'Obrigatório' })} className="input w-full" placeholder="Ex: Senso Incomum" />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="label">Tipo *</label>
                <select {...register('type', { required: true })} className="input w-full">
                  {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea {...register('description')} className="input w-full" rows={3} placeholder="Descreva seu produto cultural..." />
              </div>

              <div>
                <label className="label">Ficha Técnica</label>
                <textarea {...register('technical_sheet_text')} className="input w-full" rows={3}
                  placeholder="Ex: Elenco: João Silva, Maria Santos. Direção: Pedro Lima. Ano: 2024..." />
              </div>

              <div>
                <label className="label">URL da Capa / Foto</label>
                <input {...register('cover_url')} className="input w-full" placeholder="https://..." />
              </div>

              <div>
                <label className="label">WhatsApp para Contato</label>
                <input {...register('whatsapp')} className="input w-full" placeholder="(66) 99999-9999" />
              </div>

              <div>
                <label className="label">Link Externo (YouTube, Spotify, etc.)</label>
                <input {...register('external_link')} className="input w-full" placeholder="https://..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={mutation.isPending} className="btn btn-primary flex-1">
                  {mutation.isPending ? 'Salvando...' : (editing ? 'Salvar alterações' : 'Cadastrar produto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
