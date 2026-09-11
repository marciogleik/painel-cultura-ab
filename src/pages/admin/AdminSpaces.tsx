import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Building2, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCrud } from '@/hooks/useCrud'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { AdminTable, BoolBadge, RowActions, type AdminColumn } from '@/components/admin/AdminTable'
import { Field, CheckboxField, FormFooter } from '@/components/admin/Field'
import { asNumberOrNull } from '@/components/admin/formRules'
import { ImageUploader } from '@/components/ImageUploader'

type SpaceType = 'teatro' | 'museu' | 'biblioteca' | 'centro_cultural' | 'galeria' | 'sala_ensaio' | 'espaco_publico' | 'outro'

interface CulturalSpace {
  id: string
  name: string
  description: string | null
  type: SpaceType | null
  address: string | null
  city: string
  state: string
  phone: string | null
  email: string | null
  website: string | null
  capacity: number | null
  photo_url: string | null
  is_active: boolean
  created_at: string
}

interface SpaceForm {
  name: string
  type: SpaceType
  description: string
  address: string
  phone: string
  email: string
  website: string
  capacity: number | null
  photo_url: string
  is_active: boolean
}

const TYPE_LABELS: Record<SpaceType, string> = {
  teatro: 'Teatro',
  museu: 'Museu',
  biblioteca: 'Biblioteca',
  centro_cultural: 'Centro Cultural',
  galeria: 'Galeria',
  sala_ensaio: 'Sala de Ensaio',
  espaco_publico: 'Espaço Público',
  outro: 'Outro',
}

const DEFAULTS: SpaceForm = {
  name: '', type: 'outro', description: '', address: '', phone: '', email: '', website: '',
  capacity: null, photo_url: '', is_active: true,
}

function toForm(s: CulturalSpace): SpaceForm {
  return {
    name: s.name ?? '',
    type: s.type ?? 'outro',
    description: s.description ?? '',
    address: s.address ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    website: s.website ?? '',
    capacity: s.capacity,
    photo_url: s.photo_url ?? '',
    is_active: s.is_active ?? true,
  }
}

export function AdminSpaces() {
  const { isAdmin } = useAuth()
  const confirm = useConfirm()
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CulturalSpace | null>(null)

  const crud = useCrud<CulturalSpace>({
    table: 'cultural_spaces',
    orderBy: ['created_at', false],
    invalidate: [['cultural_spaces'], ['home-stats']],
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SpaceForm>({ defaultValues: DEFAULTS })
  const photoUrl = watch('photo_url')

  function openNew() { setEditing(null); reset(DEFAULTS); setOpen(true) }
  function openEdit(item: CulturalSpace) { setEditing(item); reset(toForm(item)); setOpen(true) }
  function close() { setOpen(false) }

  function onSubmit(values: SpaceForm) {
    crud.save.mutate({ id: editing?.id, ...values }, { onSuccess: close })
  }

  async function onDelete(item: CulturalSpace) {
    const ok = await confirm({ title: `Excluir "${item.name}"?`, message: 'O espaço será removido do site. Esta ação não pode ser desfeita.', danger: true, confirmLabel: 'Excluir' })
    if (ok) crud.remove.mutate(item.id)
  }

  const columns: AdminColumn<CulturalSpace>[] = [
    { key: 'name', header: 'Nome', render: (s) => <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span> },
    { key: 'type', header: 'Tipo', render: (s) => (s.type ? TYPE_LABELS[s.type] : '—') },
    { key: 'capacity', header: 'Capacidade', render: (s) => (s.capacity ? `${s.capacity} pessoas` : '—') },
    { key: 'active', header: 'Ativo', render: (s) => <BoolBadge value={s.is_active} /> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, align: 'right', render: (s) => <RowActions canWrite={isAdmin} onEdit={() => openEdit(s)} onDelete={() => onDelete(s)} /> },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Building2}
        title="Espaços Culturais"
        description="Teatros, museus, bibliotecas e outros equipamentos culturais do município."
        actions={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo espaço</button>}
      />

      {crud.isLoading ? (
        <SkeletonList rows={5} />
      ) : crud.error ? (
        <ErrorState error={crud.error} onRetry={() => crud.refetch()} />
      ) : crud.items.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhum espaço cultural cadastrado" description="Cadastre os equipamentos culturais para que apareçam no site." action={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo espaço</button>} />
      ) : (
        <AdminTable columns={columns} rows={crud.items} caption="Lista de espaços culturais" />
      )}

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Editar espaço cultural' : 'Novo espaço cultural'}
        locked={crud.save.isPending}
        footer={<FormFooter formId={formId} onCancel={close} loading={crud.save.isPending} canWrite={isAdmin} />}
      >
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset disabled={!isAdmin} className="space-y-4 min-w-0">
            <Field label="Nome" required error={errors.name?.message}>
              {(p) => <input {...p} {...register('name', { required: 'Informe o nome do espaço.' })} className="input w-full" />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tipo">
                {(p) => (
                  <select {...p} {...register('type')} className="input w-full">
                    {(Object.keys(TYPE_LABELS) as SpaceType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Capacidade (pessoas)" error={errors.capacity?.message}>
                {(p) => <input {...p} {...register('capacity', { ...asNumberOrNull, min: { value: 0, message: 'Informe um número positivo.' } })} type="number" min={0} className="input w-full" />}
              </Field>
            </div>
            <Field label="Descrição">
              {(p) => <textarea {...p} {...register('description')} className="input w-full" rows={3} />}
            </Field>
            <Field label="Endereço">
              {(p) => <input {...p} {...register('address')} className="input w-full" placeholder="Rua, número, bairro" />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Telefone">
                {(p) => <input {...p} {...register('phone')} type="tel" className="input w-full" />}
              </Field>
              <Field label="E-mail" error={errors.email?.message}>
                {(p) => <input {...p} {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido.' } })} type="email" className="input w-full" />}
              </Field>
            </div>
            <Field label="Site">
              {(p) => <input {...p} {...register('website')} type="url" className="input w-full" placeholder="https://" />}
            </Field>
            <div>
              <p className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Foto do espaço</p>
              <input type="hidden" {...register('photo_url')} />
              <ImageUploader label="Foto do espaço" currentUrl={photoUrl || null} folder="spaces" onUpload={(url) => setValue('photo_url', url, { shouldDirty: true })} />
            </div>
            <CheckboxField label="Espaço ativo" hint="Espaços inativos não aparecem no site." {...register('is_active')} />
          </fieldset>
        </form>
      </Modal>
    </div>
  )
}
