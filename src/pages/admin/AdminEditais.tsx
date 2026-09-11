import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { FileText, Plus, Calendar, Send, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useCrud } from '@/hooks/useCrud'
import { formatDate } from '@/lib/utils'
import type { Category, Edital, EditalStatus } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { IconButton, RowActions } from '@/components/admin/AdminTable'
import { Field, FormFooter } from '@/components/admin/Field'
import { asNumberOrNull } from '@/components/admin/formRules'
import { ImageUploader } from '@/components/ImageUploader'
import { FileUploader } from '@/components/FileUploader'

interface EditalRow extends Omit<Edital, 'categories' | 'profiles'> {
  cover_url: string | null
  document_url: string | null
  categories?: Pick<Category, 'name' | 'icon'>
}

interface EditalForm {
  title: string
  description: string
  requirements: string
  category_id: string
  status: EditalStatus
  start_date: string
  end_date: string
  total_slots: number | null
  prize_value: number | null
  cover_url: string
  document_url: string
}

const STATUS_BADGE: Record<EditalStatus, string> = {
  RASCUNHO: 'badge-slate',
  PUBLICADO: 'badge-green',
  ENCERRADO: 'badge-amber',
  CANCELADO: 'badge-red',
}

const STATUS_LABELS: Record<EditalStatus, string> = {
  RASCUNHO: 'Rascunho',
  PUBLICADO: 'Publicado',
  ENCERRADO: 'Encerrado',
  CANCELADO: 'Cancelado',
}

const DEFAULTS: EditalForm = {
  title: '', description: '', requirements: '', category_id: '', status: 'RASCUNHO',
  start_date: '', end_date: '', total_slots: null, prize_value: null, cover_url: '', document_url: '',
}

function toForm(e: EditalRow): EditalForm {
  return {
    title: e.title ?? '',
    description: e.description ?? '',
    requirements: e.requirements ?? '',
    category_id: e.category_id ?? '',
    status: e.status ?? 'RASCUNHO',
    start_date: e.start_date ?? '',
    end_date: e.end_date ?? '',
    total_slots: e.total_slots,
    prize_value: e.prize_value,
    cover_url: e.cover_url ?? '',
    document_url: e.document_url ?? '',
  }
}

export function AdminEditais() {
  const { isAdmin, user } = useAuth()
  const confirm = useConfirm()
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EditalRow | null>(null)

  const crud = useCrud<EditalRow>({
    table: 'editais',
    queryKey: ['admin-editais'],
    select: '*, categories(name, icon)',
    orderBy: ['created_at', false],
    invalidate: [['editais-public'], ['open-editais-count'], ['edital']],
    omitOnSave: ['categories'],
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('id, name, icon').eq('is_active', true).order('sort_order')
      if (error) throw error
      return (data ?? []) as Pick<Category, 'id' | 'name' | 'icon'>[]
    },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EditalForm>({ defaultValues: DEFAULTS })
  const coverUrl = watch('cover_url')
  const documentUrl = watch('document_url')

  function openNew() { setEditing(null); reset(DEFAULTS); setOpen(true) }
  function openEdit(item: EditalRow) { setEditing(item); reset(toForm(item)); setOpen(true) }
  function close() { setOpen(false) }

  /** published_by/published_at só são gravados na transição para PUBLICADO. */
  function publicationFields(nextStatus: EditalStatus, current: EditalRow | null) {
    if (nextStatus === 'PUBLICADO' && current?.status !== 'PUBLICADO') {
      return { published_by: user?.id ?? null, published_at: new Date().toISOString() }
    }
    return {}
  }

  function onSubmit(values: EditalForm) {
    crud.save.mutate({ id: editing?.id, ...values, ...publicationFields(values.status, editing) }, { onSuccess: close })
  }

  async function onPublish(item: EditalRow) {
    const ok = await confirm({
      title: `Publicar "${item.title}"?`,
      message: 'O edital ficará visível no site e aberto a inscrições dentro do período informado.',
      confirmLabel: 'Publicar',
    })
    if (ok) crud.save.mutate({ id: item.id, status: 'PUBLICADO', ...publicationFields('PUBLICADO', item) })
  }

  async function onDelete(item: EditalRow) {
    const ok = await confirm({ title: `Excluir "${item.title}"?`, message: 'As inscrições vinculadas a este edital também serão excluídas. Esta ação não pode ser desfeita.', danger: true, confirmLabel: 'Excluir' })
    if (ok) crud.remove.mutate(item.id)
  }

  const newButton = isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo edital</button>

  return (
    <div className="animate-fade-in">
      <PageHeader icon={FileText} title="Editais" description="Editais públicos, chamadas e concursos culturais." actions={newButton} />

      {crud.isLoading ? (
        <SkeletonList rows={4} />
      ) : crud.error ? (
        <ErrorState error={crud.error} onRetry={() => crud.refetch()} />
      ) : crud.items.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum edital criado ainda" description="Crie o primeiro edital para abrir inscrições." action={newButton} />
      ) : (
        <ul className="space-y-3">
          {crud.items.map((edital) => (
            <li key={edital.id} className="card p-5">
              <div className="flex items-start gap-4">
                {edital.cover_url && <img src={edital.cover_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 hidden sm:block" />}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`badge text-xs ${STATUS_BADGE[edital.status] ?? 'badge-slate'}`}>{STATUS_LABELS[edital.status] ?? edital.status}</span>
                    {edital.categories && <span className="badge badge-amber text-xs">{edital.categories.icon} {edital.categories.name}</span>}
                    {edital.document_url && (
                      <a href={edital.document_url} target="_blank" rel="noopener noreferrer" className="badge text-xs inline-flex items-center gap-1 hover:opacity-80" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                        <Download size={10} /> Documento
                      </a>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{edital.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="inline-flex items-center gap-1"><Calendar size={12} /> {formatDate(edital.start_date)} – {formatDate(edital.end_date)}</span>
                    {edital.prize_value != null && <span>R$ {Number(edital.prize_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                    {edital.total_slots != null && <span>{edital.total_slots} vagas</span>}
                    {edital.published_at && <span>Publicado em {formatDate(edital.published_at)}</span>}
                  </div>
                </div>
                <RowActions canWrite={isAdmin} onEdit={() => openEdit(edital)} onDelete={() => onDelete(edital)}>
                  {isAdmin && edital.status === 'RASCUNHO' && (
                    <IconButton label="Publicar edital" tone="success" onClick={() => onPublish(edital)} disabled={crud.save.isPending}><Send size={14} /></IconButton>
                  )}
                </RowActions>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Editar edital' : 'Novo edital'}
        size="lg"
        locked={crud.save.isPending}
        footer={<FormFooter formId={formId} onCancel={close} loading={crud.save.isPending} canWrite={isAdmin} submitLabel={editing ? 'Salvar alterações' : 'Criar edital'} />}
      >
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset disabled={!isAdmin} className="space-y-4 min-w-0">
            <div>
              <p className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Imagem de capa</p>
              <input type="hidden" {...register('cover_url')} />
              <ImageUploader label="Imagem de capa" currentUrl={coverUrl || null} folder="editais" onUpload={(url) => setValue('cover_url', url, { shouldDirty: true })} />
            </div>
            <Field label="Título" required error={errors.title?.message}>
              {(p) => <input {...p} {...register('title', { required: 'Informe o título do edital.' })} className="input w-full" placeholder="Ex.: Edital de Fomento à Cultura 2026" />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Categoria">
                {(p) => (
                  <select {...p} {...register('category_id')} className="input w-full">
                    <option value="">Sem categoria</option>
                    {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Status" required hint="Ao publicar, a data e o responsável pela publicação ficam registrados.">
                {(p) => (
                  <select {...p} {...register('status', { required: true })} className="input w-full">
                    {(Object.keys(STATUS_LABELS) as EditalStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                )}
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Início das inscrições" required error={errors.start_date?.message}>
                {(p) => <input {...p} {...register('start_date', { required: 'Informe a data de início.' })} type="date" className="input w-full" />}
              </Field>
              <Field label="Encerramento" required error={errors.end_date?.message}>
                {(p) => (
                  <input
                    {...p}
                    {...register('end_date', {
                      required: 'Informe a data de encerramento.',
                      validate: (v, all) => !all.start_date || v >= all.start_date || 'O encerramento deve ser depois do início.',
                    })}
                    type="date"
                    className="input w-full"
                  />
                )}
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Total de vagas" error={errors.total_slots?.message}>
                {(p) => <input {...p} {...register('total_slots', { ...asNumberOrNull, min: { value: 0, message: 'Informe um número positivo.' } })} type="number" min={0} className="input w-full" placeholder="Ex.: 30" />}
              </Field>
              <Field label="Valor da premiação (R$)" error={errors.prize_value?.message}>
                {(p) => <input {...p} {...register('prize_value', { ...asNumberOrNull, min: { value: 0, message: 'Informe um valor positivo.' } })} type="number" min={0} step="0.01" className="input w-full" placeholder="Ex.: 5000.00" />}
              </Field>
            </div>
            <Field label="Descrição" required error={errors.description?.message}>
              {(p) => <textarea {...p} {...register('description', { required: 'Descreva o edital.' })} className="input w-full" rows={4} placeholder="Objetivo e detalhes do edital" />}
            </Field>
            <Field label="Requisitos / critérios de participação">
              {(p) => <textarea {...p} {...register('requirements')} className="input w-full" rows={3} />}
            </Field>
            <div>
              <p className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Documento oficial (PDF/DOC)</p>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Anexe o edital completo ou regulamento para download público.</p>
              <input type="hidden" {...register('document_url')} />
              <FileUploader label="Anexar o documento do edital" currentUrl={documentUrl || null} folder="editais/docs" maxMb={20} onUpload={(url) => setValue('document_url', url, { shouldDirty: true })} />
            </div>
          </fieldset>
        </form>
      </Modal>
    </div>
  )
}
