import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { GraduationCap, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCrud } from '@/hooks/useCrud'
import { formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { AdminTable, BoolBadge, RowActions, type AdminColumn } from '@/components/admin/AdminTable'
import { Field, CheckboxField, FormFooter } from '@/components/admin/Field'
import { ImageUploader } from '@/components/ImageUploader'

type ProjectStatus = 'planejamento' | 'em_andamento' | 'concluido' | 'suspenso'

interface CulturalProject {
  id: string
  title: string
  description: string | null
  status: ProjectStatus
  cover_url: string | null
  start_date: string | null
  end_date: string | null
  coordinator: string | null
  contact: string | null
  website: string | null
  partners: string | null
  is_public: boolean
  created_at: string
}

interface ProjectForm {
  title: string
  status: ProjectStatus
  description: string
  start_date: string
  end_date: string
  coordinator: string
  contact: string
  website: string
  partners: string
  cover_url: string
  is_public: boolean
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  suspenso: 'Suspenso',
}

const STATUS_BADGE: Record<ProjectStatus, string> = {
  planejamento: 'badge-blue',
  em_andamento: 'badge-amber',
  concluido: 'badge-green',
  suspenso: 'badge-red',
}

const DEFAULTS: ProjectForm = {
  title: '', status: 'planejamento', description: '', start_date: '', end_date: '',
  coordinator: '', contact: '', website: '', partners: '', cover_url: '', is_public: true,
}

function toForm(p: CulturalProject): ProjectForm {
  return {
    title: p.title ?? '',
    status: p.status ?? 'planejamento',
    description: p.description ?? '',
    start_date: p.start_date ?? '',
    end_date: p.end_date ?? '',
    coordinator: p.coordinator ?? '',
    contact: p.contact ?? '',
    website: p.website ?? '',
    partners: p.partners ?? '',
    cover_url: p.cover_url ?? '',
    is_public: p.is_public ?? true,
  }
}

export function AdminProjects() {
  const { isAdmin } = useAuth()
  const confirm = useConfirm()
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CulturalProject | null>(null)

  const crud = useCrud<CulturalProject>({
    table: 'cultural_projects',
    orderBy: ['created_at', false],
    invalidate: [['cultural_projects']],
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProjectForm>({ defaultValues: DEFAULTS })
  const coverUrl = watch('cover_url')

  function openNew() { setEditing(null); reset(DEFAULTS); setOpen(true) }
  function openEdit(item: CulturalProject) { setEditing(item); reset(toForm(item)); setOpen(true) }
  function close() { setOpen(false) }

  function onSubmit(values: ProjectForm) {
    crud.save.mutate({ id: editing?.id, ...values }, { onSuccess: close })
  }

  async function onDelete(item: CulturalProject) {
    const ok = await confirm({ title: `Excluir "${item.title}"?`, message: 'O projeto será removido do site. Esta ação não pode ser desfeita.', danger: true, confirmLabel: 'Excluir' })
    if (ok) crud.remove.mutate(item.id)
  }

  const columns: AdminColumn<CulturalProject>[] = [
    { key: 'title', header: 'Título', render: (p) => <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.title}</span> },
    { key: 'status', header: 'Status', render: (p) => <span className={`badge text-xs ${STATUS_BADGE[p.status] ?? 'badge-slate'}`}>{STATUS_LABELS[p.status] ?? p.status}</span> },
    { key: 'period', header: 'Período', render: (p) => (p.start_date || p.end_date ? `${formatDate(p.start_date)} – ${formatDate(p.end_date)}` : '—') },
    { key: 'coordinator', header: 'Coordenação', render: (p) => p.coordinator ?? '—' },
    { key: 'public', header: 'Público', render: (p) => <BoolBadge value={p.is_public} /> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, align: 'right', render: (p) => <RowActions canWrite={isAdmin} onEdit={() => openEdit(p)} onDelete={() => onDelete(p)} /> },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={GraduationCap}
        title="Projetos Culturais"
        description="Projetos e programas culturais mantidos ou apoiados pelo município."
        actions={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo projeto</button>}
      />

      {crud.isLoading ? (
        <SkeletonList rows={5} />
      ) : crud.error ? (
        <ErrorState error={crud.error} onRetry={() => crud.refetch()} />
      ) : crud.items.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Nenhum projeto cadastrado" description="Cadastre projetos para que apareçam no site." action={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo projeto</button>} />
      ) : (
        <AdminTable columns={columns} rows={crud.items} caption="Lista de projetos culturais" />
      )}

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Editar projeto' : 'Novo projeto'}
        locked={crud.save.isPending}
        footer={<FormFooter formId={formId} onCancel={close} loading={crud.save.isPending} canWrite={isAdmin} />}
      >
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset disabled={!isAdmin} className="space-y-4 min-w-0">
            <Field label="Título" required error={errors.title?.message}>
              {(p) => <input {...p} {...register('title', { required: 'Informe o título do projeto.' })} className="input w-full" />}
            </Field>
            <Field label="Status">
              {(p) => (
                <select {...p} {...register('status')} className="input w-full">
                  {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              )}
            </Field>
            <Field label="Descrição">
              {(p) => <textarea {...p} {...register('description')} className="input w-full" rows={3} />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Início">
                {(p) => <input {...p} {...register('start_date')} type="date" className="input w-full" />}
              </Field>
              <Field label="Término" error={errors.end_date?.message}>
                {(p) => (
                  <input
                    {...p}
                    {...register('end_date', { validate: (v, all) => !v || !all.start_date || v >= all.start_date || 'O término deve ser depois do início.' })}
                    type="date"
                    className="input w-full"
                  />
                )}
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Coordenação">
                {(p) => <input {...p} {...register('coordinator')} className="input w-full" />}
              </Field>
              <Field label="Contato">
                {(p) => <input {...p} {...register('contact')} className="input w-full" placeholder="Telefone ou e-mail" />}
              </Field>
            </div>
            <Field label="Parceiros">
              {(p) => <input {...p} {...register('partners')} className="input w-full" placeholder="Instituições e apoiadores" />}
            </Field>
            <Field label="Site">
              {(p) => <input {...p} {...register('website')} type="url" className="input w-full" placeholder="https://" />}
            </Field>
            <div>
              <p className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Foto de capa</p>
              <input type="hidden" {...register('cover_url')} />
              <ImageUploader label="Foto de capa" currentUrl={coverUrl || null} folder="projects" onUpload={(url) => setValue('cover_url', url, { shouldDirty: true })} />
            </div>
            <CheckboxField label="Projeto público" hint="Projetos não públicos ficam visíveis apenas no painel." {...register('is_public')} />
          </fieldset>
        </form>
      </Modal>
    </div>
  )
}
