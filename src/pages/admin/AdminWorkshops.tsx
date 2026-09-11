import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Wrench, Plus } from 'lucide-react'
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

type Period = 'manha' | 'tarde' | 'noite'
type TargetAudience = 'crianca' | 'adolescente' | 'adulto' | 'todos'

interface CulturalWorkshop {
  id: string
  title: string
  description: string | null
  instructor: string | null
  category: string | null
  location: string | null
  city: string
  cover_url: string | null
  start_date: string | null
  duration: string | null
  schedule: string | null
  vacancies: number | null
  is_free: boolean
  price: number | null
  contact: string | null
  is_active: boolean
  is_featured: boolean
  allowed_periods: Period[]
  target_audience: TargetAudience
  created_at: string
}

interface WorkshopForm {
  title: string
  category: string
  description: string
  instructor: string
  location: string
  start_date: string
  schedule: string
  duration: string
  vacancies: number | null
  contact: string
  allowed_periods: Period[]
  target_audience: TargetAudience
  is_free: boolean
  price: number | null
  cover_url: string
  is_active: boolean
  is_featured: boolean
}

const PERIOD_LABELS: Record<Period, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }
const AUDIENCE_LABELS: Record<TargetAudience, string> = {
  crianca: 'Crianças',
  adolescente: 'Adolescentes',
  adulto: 'Adultos',
  todos: 'Todas as idades',
}

const DEFAULTS: WorkshopForm = {
  title: '', category: '', description: '', instructor: '', location: '', start_date: '', schedule: '', duration: '',
  vacancies: null, contact: '', allowed_periods: ['manha', 'tarde'], target_audience: 'todos',
  is_free: true, price: null, cover_url: '', is_active: true, is_featured: false,
}

function toForm(w: CulturalWorkshop): WorkshopForm {
  return {
    title: w.title ?? '',
    category: w.category ?? '',
    description: w.description ?? '',
    instructor: w.instructor ?? '',
    location: w.location ?? '',
    start_date: toDatetimeLocal(w.start_date),
    schedule: w.schedule ?? '',
    duration: w.duration ?? '',
    vacancies: w.vacancies,
    contact: w.contact ?? '',
    allowed_periods: Array.isArray(w.allowed_periods) ? w.allowed_periods : [],
    target_audience: w.target_audience ?? 'todos',
    is_free: w.is_free ?? true,
    price: w.price,
    cover_url: w.cover_url ?? '',
    is_active: w.is_active ?? true,
    is_featured: w.is_featured ?? false,
  }
}

export function AdminWorkshops() {
  const { isAdmin } = useAuth()
  const confirm = useConfirm()
  const formId = useId()
  const periodsId = useId()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CulturalWorkshop | null>(null)

  const crud = useCrud<CulturalWorkshop>({
    table: 'cultural_workshops',
    orderBy: ['created_at', false],
    invalidate: [['cultural_workshops'], ['workshops_for_enrollment'], ['workshops_filter']],
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<WorkshopForm>({ defaultValues: DEFAULTS })
  const coverUrl = watch('cover_url')
  const isFree = watch('is_free')

  function openNew() { setEditing(null); reset(DEFAULTS); setOpen(true) }
  function openEdit(item: CulturalWorkshop) { setEditing(item); reset(toForm(item)); setOpen(true) }
  function close() { setOpen(false) }

  function onSubmit(values: WorkshopForm) {
    const periods = Array.isArray(values.allowed_periods) ? values.allowed_periods : []
    crud.save.mutate(
      {
        id: editing?.id,
        ...values,
        allowed_periods: periods,
        start_date: fromDatetimeLocal(values.start_date),
        price: values.is_free ? null : values.price,
      },
      { onSuccess: close },
    )
  }

  async function onDelete(item: CulturalWorkshop) {
    const ok = await confirm({ title: `Excluir "${item.title}"?`, message: 'As fichas de matrícula vinculadas perdem o vínculo com esta oficina. Esta ação não pode ser desfeita.', danger: true, confirmLabel: 'Excluir' })
    if (ok) crud.remove.mutate(item.id)
  }

  const columns: AdminColumn<CulturalWorkshop>[] = [
    { key: 'title', header: 'Título', render: (w) => <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{w.title}</span> },
    { key: 'instructor', header: 'Instrutor(a)', render: (w) => w.instructor ?? '—' },
    { key: 'start', header: 'Início', render: (w) => formatDateTime(w.start_date) },
    { key: 'periods', header: 'Períodos', render: (w) => (Array.isArray(w.allowed_periods) && w.allowed_periods.length ? w.allowed_periods.map((p) => PERIOD_LABELS[p] ?? p).join(', ') : '—') },
    { key: 'vacancies', header: 'Vagas', render: (w) => w.vacancies ?? '—', align: 'right' },
    { key: 'free', header: 'Gratuita', render: (w) => <BoolBadge value={w.is_free} /> },
    { key: 'active', header: 'Ativa', render: (w) => <BoolBadge value={w.is_active} /> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, align: 'right', render: (w) => <RowActions canWrite={isAdmin} onEdit={() => openEdit(w)} onDelete={() => onDelete(w)} /> },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Wrench}
        title="Oficinas Culturais"
        description="Oficinas, cursos e escolinhas abertas a matrícula pela comunidade."
        actions={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Nova oficina</button>}
      />

      {crud.isLoading ? (
        <SkeletonList rows={5} />
      ) : crud.error ? (
        <ErrorState error={crud.error} onRetry={() => crud.refetch()} />
      ) : crud.items.length === 0 ? (
        <EmptyState icon={Wrench} title="Nenhuma oficina cadastrada" description="Cadastre oficinas para abrir as matrículas no site." action={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Nova oficina</button>} />
      ) : (
        <AdminTable columns={columns} rows={crud.items} caption="Lista de oficinas culturais" />
      )}

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Editar oficina' : 'Nova oficina'}
        locked={crud.save.isPending}
        footer={<FormFooter formId={formId} onCancel={close} loading={crud.save.isPending} canWrite={isAdmin} />}
      >
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset disabled={!isAdmin} className="space-y-4 min-w-0">
            <Field label="Título" required error={errors.title?.message}>
              {(p) => <input {...p} {...register('title', { required: 'Informe o título da oficina.' })} className="input w-full" />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Categoria">
                {(p) => <input {...p} {...register('category')} className="input w-full" placeholder="Ex.: Música, Teatro, Artesanato" />}
              </Field>
              <Field label="Público-alvo">
                {(p) => (
                  <select {...p} {...register('target_audience')} className="input w-full">
                    {(Object.keys(AUDIENCE_LABELS) as TargetAudience[]).map((a) => <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>)}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Descrição">
              {(p) => <textarea {...p} {...register('description')} className="input w-full" rows={3} />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Instrutor(a)">
                {(p) => <input {...p} {...register('instructor')} className="input w-full" />}
              </Field>
              <Field label="Local">
                {(p) => <input {...p} {...register('location')} className="input w-full" />}
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Início">
                {(p) => <input {...p} {...register('start_date')} type="datetime-local" className="input w-full" />}
              </Field>
              <Field label="Dias e horários">
                {(p) => <input {...p} {...register('schedule')} className="input w-full" placeholder="Ex.: Sábados, 9h às 12h" />}
              </Field>
            </div>

            <fieldset aria-describedby={errors.allowed_periods ? `${periodsId}-error` : undefined}>
              <legend className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Períodos oferecidos <span aria-hidden="true" style={{ color: 'var(--error)' }}>*</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PERIOD_LABELS) as Period[]).map((period) => (
                  <label key={period} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      value={period}
                      className="h-4 w-4 accent-amber-500"
                      {...register('allowed_periods', {
                        validate: (v) => (Array.isArray(v) && v.length > 0) || 'Selecione ao menos um período.',
                      })}
                    />
                    {PERIOD_LABELS[period]}
                  </label>
                ))}
              </div>
              {errors.allowed_periods && (
                <p id={`${periodsId}-error`} role="alert" className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.allowed_periods.message}</p>
              )}
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Duração">
                {(p) => <input {...p} {...register('duration')} className="input w-full" placeholder="Ex.: 8 horas" />}
              </Field>
              <Field label="Vagas" error={errors.vacancies?.message}>
                {(p) => <input {...p} {...register('vacancies', { ...asNumberOrNull, min: { value: 0, message: 'Informe um número positivo.' } })} type="number" min={0} className="input w-full" />}
              </Field>
              <Field label="Contato">
                {(p) => <input {...p} {...register('contact')} className="input w-full" placeholder="Telefone ou e-mail" />}
              </Field>
            </div>

            <CheckboxField label="Oficina gratuita" {...register('is_free')} />
            {!isFree && (
              <Field label="Preço (R$)" error={errors.price?.message}>
                {(p) => <input {...p} {...register('price', { ...asNumberOrNull, min: { value: 0, message: 'Informe um valor positivo.' } })} type="number" min={0} step="0.01" className="input w-full" />}
              </Field>
            )}

            <div>
              <p className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Foto de capa</p>
              <input type="hidden" {...register('cover_url')} />
              <ImageUploader label="Foto de capa" currentUrl={coverUrl || null} folder="workshops" onUpload={(url) => setValue('cover_url', url, { shouldDirty: true })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CheckboxField label="Destaque na página inicial" {...register('is_featured')} />
              <CheckboxField label="Oficina ativa" hint="Oficinas inativas não aceitam matrículas." {...register('is_active')} />
            </div>
          </fieldset>
        </form>
      </Modal>
    </div>
  )
}
