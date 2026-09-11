import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useCrud } from '@/hooks/useCrud'
import { formatDateTime, toDatetimeLocal, fromDatetimeLocal } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { AdminTable, BoolBadge, RowActions, type AdminColumn } from '@/components/admin/AdminTable'
import { Field, CheckboxField, FormFooter } from '@/components/admin/Field'
import { asNumberOrNull } from '@/components/admin/formRules'
import { ImageUploader } from '@/components/ImageUploader'

type EventType = 'show' | 'peca_teatro' | 'exposicao' | 'festival' | 'oficina' | 'feira' | 'outro'

interface CulturalEvent {
  id: string
  title: string
  description: string | null
  type: EventType | null
  location: string | null
  space_id: string | null
  city: string
  cover_url: string | null
  start_date: string
  end_date: string | null
  is_free: boolean
  price: number | null
  ticket_link: string | null
  organizer: string | null
  contact: string | null
  is_active: boolean
  is_featured: boolean
  created_at: string
}

interface EventForm {
  title: string
  type: EventType
  description: string
  location: string
  space_id: string
  start_date: string
  end_date: string
  is_free: boolean
  price: number | null
  ticket_link: string
  organizer: string
  contact: string
  cover_url: string
  is_featured: boolean
  is_active: boolean
}

const TYPE_LABELS: Record<EventType, string> = {
  show: 'Show',
  peca_teatro: 'Peça de teatro',
  exposicao: 'Exposição',
  festival: 'Festival',
  oficina: 'Oficina',
  feira: 'Feira',
  outro: 'Outro',
}

const DEFAULTS: EventForm = {
  title: '', type: 'outro', description: '', location: '', space_id: '', start_date: '', end_date: '',
  is_free: true, price: null, ticket_link: '', organizer: '', contact: '', cover_url: '', is_featured: false, is_active: true,
}

function toForm(e: CulturalEvent): EventForm {
  return {
    title: e.title ?? '',
    type: e.type ?? 'outro',
    description: e.description ?? '',
    location: e.location ?? '',
    space_id: e.space_id ?? '',
    start_date: toDatetimeLocal(e.start_date),
    end_date: toDatetimeLocal(e.end_date),
    is_free: e.is_free ?? true,
    price: e.price,
    ticket_link: e.ticket_link ?? '',
    organizer: e.organizer ?? '',
    contact: e.contact ?? '',
    cover_url: e.cover_url ?? '',
    is_featured: e.is_featured ?? false,
    is_active: e.is_active ?? true,
  }
}

export function AdminEvents() {
  const { isAdmin } = useAuth()
  const confirm = useConfirm()
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CulturalEvent | null>(null)

  const crud = useCrud<CulturalEvent>({
    table: 'cultural_events',
    orderBy: ['start_date', false],
    invalidate: [['cultural_events'], ['home-stats']],
  })

  const { data: spaces } = useQuery({
    queryKey: ['admin-spaces-options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cultural_spaces').select('id, name').order('name')
      if (error) throw error
      return (data ?? []) as { id: string; name: string }[]
    },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EventForm>({ defaultValues: DEFAULTS })
  const coverUrl = watch('cover_url')
  const isFree = watch('is_free')

  function openNew() { setEditing(null); reset(DEFAULTS); setOpen(true) }
  function openEdit(item: CulturalEvent) { setEditing(item); reset(toForm(item)); setOpen(true) }
  function close() { setOpen(false) }

  function onSubmit(values: EventForm) {
    const start = fromDatetimeLocal(values.start_date)
    if (!start) return
    crud.save.mutate(
      {
        id: editing?.id,
        ...values,
        start_date: start,
        end_date: fromDatetimeLocal(values.end_date),
        price: values.is_free ? null : values.price,
        ticket_link: values.is_free ? '' : values.ticket_link,
      },
      { onSuccess: close },
    )
  }

  async function onDelete(item: CulturalEvent) {
    const ok = await confirm({ title: `Excluir "${item.title}"?`, message: 'O evento será removido do site. Esta ação não pode ser desfeita.', danger: true, confirmLabel: 'Excluir' })
    if (ok) crud.remove.mutate(item.id)
  }

  const columns: AdminColumn<CulturalEvent>[] = [
    { key: 'title', header: 'Título', render: (e) => <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{e.title}</span> },
    { key: 'type', header: 'Tipo', render: (e) => (e.type ? TYPE_LABELS[e.type] : '—') },
    { key: 'start', header: 'Início', render: (e) => formatDateTime(e.start_date) },
    { key: 'free', header: 'Entrada', render: (e) => (e.is_free ? 'Gratuita' : e.price != null ? `R$ ${Number(e.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Paga') },
    { key: 'featured', header: 'Destaque', render: (e) => <BoolBadge value={e.is_featured} /> },
    { key: 'active', header: 'Ativo', render: (e) => <BoolBadge value={e.is_active} /> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, align: 'right', render: (e) => <RowActions canWrite={isAdmin} onEdit={() => openEdit(e)} onDelete={() => onDelete(e)} /> },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Calendar}
        title="Eventos Culturais"
        description="Agenda cultural do município: shows, espetáculos, exposições e festivais."
        actions={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo evento</button>}
      />

      {crud.isLoading ? (
        <SkeletonList rows={5} />
      ) : crud.error ? (
        <ErrorState error={crud.error} onRetry={() => crud.refetch()} />
      ) : crud.items.length === 0 ? (
        <EmptyState icon={Calendar} title="Nenhum evento cadastrado" description="Cadastre eventos para que apareçam na agenda cultural do site." action={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo evento</button>} />
      ) : (
        <AdminTable columns={columns} rows={crud.items} caption="Lista de eventos culturais" />
      )}

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Editar evento' : 'Novo evento'}
        locked={crud.save.isPending}
        footer={<FormFooter formId={formId} onCancel={close} loading={crud.save.isPending} canWrite={isAdmin} />}
      >
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset disabled={!isAdmin} className="space-y-4 min-w-0">
            <Field label="Título" required error={errors.title?.message}>
              {(p) => <input {...p} {...register('title', { required: 'Informe o título do evento.' })} className="input w-full" />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tipo">
                {(p) => (
                  <select {...p} {...register('type')} className="input w-full">
                    {(Object.keys(TYPE_LABELS) as EventType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Espaço cultural" hint="Opcional: vincula o evento a um espaço cadastrado.">
                {(p) => (
                  <select {...p} {...register('space_id')} className="input w-full">
                    <option value="">Sem vínculo</option>
                    {spaces?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Descrição">
              {(p) => <textarea {...p} {...register('description')} className="input w-full" rows={3} />}
            </Field>
            <Field label="Local" hint="Texto livre exibido no site (ex.: Praça Central).">
              {(p) => <input {...p} {...register('location')} className="input w-full" />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Início" required error={errors.start_date?.message}>
                {(p) => <input {...p} {...register('start_date', { required: 'Informe a data e hora de início.' })} type="datetime-local" className="input w-full" />}
              </Field>
              <Field label="Término" error={errors.end_date?.message}>
                {(p) => (
                  <input
                    {...p}
                    {...register('end_date', {
                      validate: (v, all) => !v || !all.start_date || new Date(v) >= new Date(all.start_date) || 'O término deve ser depois do início.',
                    })}
                    type="datetime-local"
                    className="input w-full"
                  />
                )}
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Organizador">
                {(p) => <input {...p} {...register('organizer')} className="input w-full" />}
              </Field>
              <Field label="Contato">
                {(p) => <input {...p} {...register('contact')} className="input w-full" placeholder="Telefone ou e-mail" />}
              </Field>
            </div>
            <CheckboxField label="Evento gratuito" {...register('is_free')} />
            {!isFree && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Preço (R$)" error={errors.price?.message}>
                  {(p) => <input {...p} {...register('price', { ...asNumberOrNull, min: { value: 0, message: 'Informe um valor positivo.' } })} type="number" min={0} step="0.01" className="input w-full" />}
                </Field>
                <Field label="Link para ingressos">
                  {(p) => <input {...p} {...register('ticket_link')} type="url" className="input w-full" placeholder="https://" />}
                </Field>
              </div>
            )}
            <div>
              <p className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Foto de capa</p>
              <input type="hidden" {...register('cover_url')} />
              <ImageUploader label="Foto de capa" currentUrl={coverUrl || null} folder="events" onUpload={(url) => setValue('cover_url', url, { shouldDirty: true })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CheckboxField label="Destaque na página inicial" {...register('is_featured')} />
              <CheckboxField label="Evento ativo" hint="Eventos inativos não aparecem no site." {...register('is_active')} />
            </div>
          </fieldset>
        </form>
      </Modal>
    </div>
  )
}
