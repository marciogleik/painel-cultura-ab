import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ExternalLink, MessageCircle, Pencil, Plus, ShoppingBag, Trash2, UserRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMyAgents } from '@/hooks/useMyAgent'
import { useToast } from '@/components/ui/Toast'
import { LoadingButton, useConfirm } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonGrid } from '@/components/ui/Spinner'
import { errorMessage, formatPhone, onlyDigits, safeUrl, whatsappLink } from '@/lib/utils'
import type { CulturalProduct } from '@/types'

type ProductType = CulturalProduct['type']

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'peca_teatro', label: 'Peça de teatro' },
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

const TYPE_LABEL = Object.fromEntries(PRODUCT_TYPES.map((t) => [t.value, t.label])) as Record<ProductType, string>

interface ProductForm {
  agent_id: string
  title: string
  type: ProductType
  description: string
  whatsapp: string
  external_link: string
  cover_url: string
  technical_sheet_text: string
}

function sheetDetails(sheet: CulturalProduct['technical_sheet']): string | null {
  const details = sheet && typeof sheet === 'object' ? (sheet as { details?: unknown }).details : null
  return typeof details === 'string' && details.trim() ? details : null
}

async function fetchMyProducts(agentIds: string[]): Promise<CulturalProduct[]> {
  if (agentIds.length === 0) return []
  const { data, error } = await supabase
    .from('cultural_products')
    .select('*, cultural_agents(id, display_name, photo_url)')
    .in('agent_id', agentIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CulturalProduct[]
}

export function MyProductsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CulturalProduct | null>(null)

  const { agents, primaryAgent, isLoading: agentsLoading, error: agentsError, refetch: refetchAgents } = useMyAgents()
  const agentIds = agents.map((a) => a.id)
  // A RLS só permite escrever produtos de agentes em que o usuário é dono ou administrador
  const manageableAgents = useMemo(
    () => agents.filter((a) => a.membership_role === 'owner' || a.membership_role === 'admin'),
    [agents]
  )
  const defaultAgentId =
    (primaryAgent && manageableAgents.some((a) => a.id === primaryAgent.id) ? primaryAgent.id : manageableAgents[0]?.id) ?? ''

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ProductForm>()

  const productsQuery = useQuery({
    queryKey: ['my-products', agentIds],
    queryFn: () => fetchMyProducts(agentIds),
    enabled: !agentsLoading && agentIds.length > 0,
  })
  const products = productsQuery.data ?? []
  const isLoading = agentsLoading || (agentIds.length > 0 && productsQuery.isLoading)

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  const saveMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const payload = {
        title: data.title.trim(),
        type: data.type,
        description: data.description.trim() || null,
        whatsapp: onlyDigits(data.whatsapp) || null,
        external_link: safeUrl(data.external_link),
        cover_url: safeUrl(data.cover_url),
        technical_sheet: data.technical_sheet_text.trim() ? { details: data.technical_sheet_text.trim() } : {},
      }
      if (editing) {
        const { error } = await supabase.from('cultural_products').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const agentId = data.agent_id || defaultAgentId
        if (!agentId) throw new Error('Selecione o agente cultural responsável pelo produto.')
        const { error } = await supabase.from('cultural_products').insert({ ...payload, agent_id: agentId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] })
      toast.success(editing ? 'Produto atualizado.' : 'Produto cadastrado.')
      closeModal()
      reset()
    },
    onError: (err) => toast.error(errorMessage(err, 'Não foi possível salvar o produto.')),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cultural_products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] })
      toast.success('Produto excluído.')
    },
    onError: (err) => toast.error(errorMessage(err, 'Não foi possível excluir o produto.')),
  })

  function openEdit(product: CulturalProduct) {
    setEditing(product)
    reset({
      agent_id: product.agent_id ?? defaultAgentId,
      title: product.title,
      type: product.type,
      description: product.description ?? '',
      whatsapp: formatPhone(product.whatsapp),
      external_link: product.external_link ?? '',
      cover_url: product.cover_url ?? '',
      technical_sheet_text: sheetDetails(product.technical_sheet) ?? '',
    })
    setModalOpen(true)
  }

  function openNew() {
    setEditing(null)
    reset({
      agent_id: defaultAgentId,
      title: '',
      type: 'outro',
      description: '',
      whatsapp: '',
      external_link: '',
      cover_url: '',
      technical_sheet_text: '',
    })
    setModalOpen(true)
  }

  async function handleDelete(product: CulturalProduct) {
    const ok = await confirm({
      title: 'Excluir produto?',
      message: <>O produto <strong>{product.title}</strong> será removido do seu perfil. Esta ação não pode ser desfeita.</>,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (ok) deleteMutation.mutate(product.id)
  }

  function onSubmit(data: ProductForm) {
    let valid = true
    if (data.cover_url.trim() && !safeUrl(data.cover_url)) {
      setError('cover_url', { message: 'Informe um endereço válido (http:// ou https://).' })
      valid = false
    }
    if (data.external_link.trim() && !safeUrl(data.external_link)) {
      setError('external_link', { message: 'Informe um endereço válido (http:// ou https://).' })
      valid = false
    }
    const digits = onlyDigits(data.whatsapp)
    if (digits && (digits.length < 10 || digits.length > 13)) {
      setError('whatsapp', { message: 'Informe o número com DDD, ex.: (66) 99999-9999.' })
      valid = false
    }
    if (valid) saveMutation.mutate(data)
  }

  const canCreate = manageableAgents.length > 0
  const showAgentName = agents.length > 1

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={ShoppingBag}
        title="Meus produtos culturais"
        description="Cadastre suas peças, shows, livros, exposições e mais para divulgar no site."
        actions={
          canCreate && (
            <button type="button" onClick={openNew} className="btn btn-primary">
              <Plus size={16} aria-hidden="true" /> Novo produto
            </button>
          )
        }
      />

      {isLoading ? (
        <SkeletonGrid items={3} />
      ) : agentsError ? (
        <ErrorState error={agentsError} onRetry={() => refetchAgents()} />
      ) : productsQuery.isError ? (
        <ErrorState error={productsQuery.error} onRetry={() => productsQuery.refetch()} />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Cadastre seu Agente Cultural"
          description="Os produtos culturais ficam vinculados ao seu Agente Cultural. Faça o cadastro no SMIIC para começar."
          action={<Link to="/painel/agentes/cadastrar" className="btn btn-primary">Cadastrar Agente Cultural</Link>}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nenhum produto cadastrado"
          description={
            canCreate
              ? 'Cadastre suas peças, shows, exposições e muito mais.'
              : 'Somente o dono ou administrador do agente cultural pode cadastrar produtos.'
          }
          action={
            canCreate && (
              <button type="button" onClick={openNew} className="btn btn-primary">
                <Plus size={16} aria-hidden="true" /> Cadastrar primeiro produto
              </button>
            )
          }
        />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const wa = whatsappLink(product.whatsapp)
            const link = safeUrl(product.external_link)
            const cover = safeUrl(product.cover_url)
            const details = sheetDetails(product.technical_sheet)
            const canManage = manageableAgents.some((a) => a.id === product.agent_id)
            return (
              <li key={product.id} className="card overflow-hidden flex flex-col">
                <div className="aspect-video" style={{ background: 'var(--bg-secondary)' }}>
                  {cover ? (
                    <img src={cover} alt={product.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={40} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-amber text-xs">{TYPE_LABEL[product.type] ?? product.type}</span>
                    {!product.is_active && <span className="badge badge-slate text-xs">Inativo</span>}
                    {showAgentName && product.cultural_agents?.display_name && (
                      <span className="badge badge-slate text-xs inline-flex items-center gap-1">
                        <UserRound size={11} aria-hidden="true" />
                        {product.cultural_agents.display_name}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm mt-2" style={{ color: 'var(--text-primary)' }}>{product.title}</h3>
                  {product.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>
                  )}
                  {details && (
                    <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      <strong>Ficha técnica:</strong> {details}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-auto pt-3">
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      >
                        <MessageCircle size={12} aria-hidden="true" /> WhatsApp
                      </a>
                    )}
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}
                      >
                        <ExternalLink size={12} aria-hidden="true" /> Link
                      </a>
                    )}
                    <div className="flex-1" />
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          aria-label={`Editar ${product.title}`}
                          className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          disabled={deleteMutation.isPending}
                          aria-label={`Excluir ${product.title}`}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar produto' : 'Novo produto cultural'}
        locked={saveMutation.isPending}
        footer={
          <>
            <button type="button" onClick={closeModal} className="btn btn-secondary" disabled={saveMutation.isPending}>
              Cancelar
            </button>
            <LoadingButton type="submit" form="product-form" loading={saveMutation.isPending} className="btn btn-primary">
              {editing ? 'Salvar alterações' : 'Cadastrar produto'}
            </LoadingButton>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {!editing && manageableAgents.length > 1 && (
            <div>
              <label htmlFor="product-agent" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Agente cultural responsável *
              </label>
              <select id="product-agent" {...register('agent_id', { required: 'Selecione o agente' })} className="input w-full">
                {manageableAgents.map((a) => (
                  <option key={a.id} value={a.id}>{a.display_name ?? 'Agente sem nome'}</option>
                ))}
              </select>
              {errors.agent_id && <p role="alert" className="text-xs text-red-500 mt-1">{errors.agent_id.message}</p>}
            </div>
          )}

          <div>
            <label htmlFor="product-title" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Título *</label>
            <input
              id="product-title"
              {...register('title', { required: 'Informe o título', maxLength: { value: 150, message: 'Máximo de 150 caracteres' } })}
              className={`input w-full ${errors.title ? 'input-error' : ''}`}
              placeholder="Ex.: Senso Incomum"
              aria-invalid={!!errors.title || undefined}
            />
            {errors.title && <p role="alert" className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="product-type" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tipo *</label>
            <select id="product-type" {...register('type', { required: true })} className="input w-full">
              {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="product-description" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Descrição</label>
            <textarea id="product-description" {...register('description')} className="input w-full" rows={3} maxLength={2000} placeholder="Descreva seu produto cultural..." />
          </div>

          <div>
            <label htmlFor="product-sheet" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Ficha técnica</label>
            <textarea
              id="product-sheet"
              {...register('technical_sheet_text')}
              className="input w-full"
              rows={3}
              maxLength={2000}
              placeholder="Ex.: Elenco: João Silva, Maria Santos. Direção: Pedro Lima. Ano: 2024..."
            />
          </div>

          <div>
            <label htmlFor="product-cover" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>URL da capa / foto</label>
            <input
              id="product-cover"
              type="url"
              {...register('cover_url')}
              className={`input w-full ${errors.cover_url ? 'input-error' : ''}`}
              placeholder="https://..."
              aria-invalid={!!errors.cover_url || undefined}
            />
            {errors.cover_url && <p role="alert" className="text-xs text-red-500 mt-1">{errors.cover_url.message}</p>}
          </div>

          <div>
            <label htmlFor="product-whatsapp" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>WhatsApp para contato</label>
            <input
              id="product-whatsapp"
              type="tel"
              inputMode="tel"
              {...register('whatsapp')}
              className={`input w-full ${errors.whatsapp ? 'input-error' : ''}`}
              placeholder="(66) 99999-9999"
              aria-invalid={!!errors.whatsapp || undefined}
            />
            {errors.whatsapp && <p role="alert" className="text-xs text-red-500 mt-1">{errors.whatsapp.message}</p>}
          </div>

          <div>
            <label htmlFor="product-link" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Link externo (YouTube, Spotify etc.)</label>
            <input
              id="product-link"
              type="url"
              {...register('external_link')}
              className={`input w-full ${errors.external_link ? 'input-error' : ''}`}
              placeholder="https://..."
              aria-invalid={!!errors.external_link || undefined}
            />
            {errors.external_link && <p role="alert" className="text-xs text-red-500 mt-1">{errors.external_link.message}</p>}
          </div>
        </form>
      </Modal>
    </div>
  )
}
