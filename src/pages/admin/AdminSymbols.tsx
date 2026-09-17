import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import DOMPurify from 'dompurify'
import { Flag, Plus, Music } from 'lucide-react'
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

type SymbolType = 'bandeira' | 'brasao' | 'hino' | 'patrimonio' | 'outro'

interface MunicipalSymbol {
  id: string
  title: string
  type: SymbolType
  description: string | null
  content_html: string | null
  image_url: string | null
  audio_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

interface SymbolForm {
  title: string
  type: SymbolType
  description: string
  content_html: string
  image_url: string
  audio_url: string
  sort_order: number | null
  is_active: boolean
}

const TYPE_LABELS: Record<SymbolType, string> = {
  bandeira: 'Bandeira',
  brasao: 'Brasão',
  hino: 'Hino',
  patrimonio: 'Patrimônio',
  outro: 'Outro',
}

const DEFAULTS: SymbolForm = { title: '', type: 'outro', description: '', content_html: '', image_url: '', audio_url: '', sort_order: 0, is_active: true }

function toForm(s: MunicipalSymbol): SymbolForm {
  return {
    title: s.title ?? '',
    type: s.type ?? 'outro',
    description: s.description ?? '',
    content_html: s.content_html ?? '',
    image_url: s.image_url ?? '',
    audio_url: s.audio_url ?? '',
    sort_order: s.sort_order ?? 0,
    is_active: s.is_active ?? true,
  }
}

export function AdminSymbols() {
  const { isAdmin } = useAuth()
  const confirm = useConfirm()
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MunicipalSymbol | null>(null)

  const crud = useCrud<MunicipalSymbol>({
    table: 'municipal_symbols',
    queryKey: ['admin-symbols'],
    orderBy: ['sort_order', true],
    invalidate: [['municipal-symbols']],
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SymbolForm>({ defaultValues: DEFAULTS })
  const imageUrl = watch('image_url')

  function openNew() {
    setEditing(null)
    const next = crud.items.reduce((max, s) => Math.max(max, s.sort_order ?? 0), -1) + 1
    reset({ ...DEFAULTS, sort_order: next })
    setOpen(true)
  }
  function openEdit(item: MunicipalSymbol) { setEditing(item); reset(toForm(item)); setOpen(true) }
  function close() { setOpen(false) }

  function onSubmit(values: SymbolForm) {
    // O conteúdo é renderizado como HTML no site: sanitiza antes de gravar.
    const content_html = values.content_html.trim()
      ? DOMPurify.sanitize(values.content_html, { USE_PROFILES: { html: true }, ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] })
      : ''
    crud.save.mutate({ id: editing?.id, ...values, content_html, sort_order: values.sort_order ?? 0 }, { onSuccess: close })
  }

  async function onDelete(item: MunicipalSymbol) {
    const ok = await confirm({ title: `Excluir "${item.title}"?`, message: 'O símbolo será removido do site. Esta ação não pode ser desfeita.', danger: true, confirmLabel: 'Excluir' })
    if (ok) crud.remove.mutate(item.id)
  }

  const columns: AdminColumn<MunicipalSymbol>[] = [
    {
      key: 'title', header: 'Símbolo',
      render: (s) => (
        <div className="flex items-center gap-3">
          {s.image_url ? (
            <img src={s.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" style={{ background: 'var(--bg-secondary)' }} />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-secondary)' }} aria-hidden="true">
              {s.type === 'hino' ? <Music size={16} style={{ color: 'var(--text-muted)' }} /> : <Flag size={16} style={{ color: 'var(--text-muted)' }} />}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
            {s.description && <p className="text-xs truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>{s.description}</p>}
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Tipo', render: (s) => TYPE_LABELS[s.type] ?? s.type },
    { key: 'order', header: 'Ordem', align: 'right', render: (s) => s.sort_order },
    { key: 'active', header: 'Ativo', render: (s) => <BoolBadge value={s.is_active} /> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, align: 'right', render: (s) => <RowActions canWrite={isAdmin} onEdit={() => openEdit(s)} onDelete={() => onDelete(s)} /> },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Flag}
        title="Símbolos Municipais"
        description="Bandeira, brasão, hino e patrimônios exibidos na página de símbolos."
        actions={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo símbolo</button>}
      />

      {crud.isLoading ? (
        <SkeletonList rows={4} />
      ) : crud.error ? (
        <ErrorState error={crud.error} onRetry={() => crud.refetch()} />
      ) : crud.items.length === 0 ? (
        <EmptyState icon={Flag} title="Nenhum símbolo cadastrado" description="Cadastre a bandeira, o brasão e o hino do município." action={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo símbolo</button>} />
      ) : (
        <AdminTable columns={columns} rows={crud.items} caption="Lista de símbolos municipais" />
      )}

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Editar símbolo' : 'Novo símbolo'}
        locked={crud.save.isPending}
        footer={<FormFooter formId={formId} onCancel={close} loading={crud.save.isPending} canWrite={isAdmin} />}
      >
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset disabled={!isAdmin} className="space-y-4 min-w-0">
            <Field label="Título" required error={errors.title?.message}>
              {(p) => <input {...p} {...register('title', { required: 'Informe o título.' })} className="input w-full" />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tipo">
                {(p) => (
                  <select {...p} {...register('type')} className="input w-full">
                    {(Object.keys(TYPE_LABELS) as SymbolType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Ordem de exibição" error={errors.sort_order?.message}>
                {(p) => <input {...p} {...register('sort_order', { ...asNumberOrNull, min: { value: 0, message: 'Informe um número positivo.' } })} type="number" min={0} className="input w-full" />}
              </Field>
            </div>
            <Field label="Descrição curta">
              {(p) => <input {...p} {...register('description')} className="input w-full" />}
            </Field>
            <Field label="Conteúdo" hint="Aceita HTML simples (parágrafos, negrito, listas). Scripts e estilos são removidos ao salvar.">
              {(p) => <textarea {...p} {...register('content_html')} className="input w-full font-mono text-xs" rows={6} />}
            </Field>
            <div>
              <p className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Imagem</p>
              <input type="hidden" {...register('image_url')} />
              <ImageUploader label="Imagem do símbolo" currentUrl={imageUrl || null} folder="symbols" onUpload={(url) => setValue('image_url', url, { shouldDirty: true })} />
            </div>
            <Field label="URL do áudio (hino)" hint="Link para o arquivo de áudio (MP3) do hino.">
              {(p) => <input {...p} {...register('audio_url')} type="url" className="input w-full" placeholder="https://" />}
            </Field>
            <CheckboxField label="Símbolo ativo" hint="Símbolos inativos não aparecem no site." {...register('is_active')} />
          </fieldset>
        </form>
      </Modal>
    </div>
  )
}
