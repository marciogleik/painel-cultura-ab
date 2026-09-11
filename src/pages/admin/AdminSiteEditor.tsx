import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { Settings2, ImagePlus, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useCrud } from '@/hooks/useCrud'
import { errorMessage } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { IconButton, RowActions, BoolBadge } from '@/components/admin/AdminTable'
import { Field, CheckboxField, FormFooter } from '@/components/admin/Field'
import { SiteContentForm } from '@/components/admin/SiteContentForm'
import { ImageUploader } from '@/components/ImageUploader'

interface CarouselSlide {
  id: string
  title: string | null
  subtitle: string | null
  image_url: string
  link_url: string | null
  link_label: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

interface SlideForm {
  title: string
  subtitle: string
  image_url: string
  link_url: string
  link_label: string
  is_active: boolean
}

const DEFAULTS: SlideForm = { title: '', subtitle: '', image_url: '', link_url: '', link_label: '', is_active: true }

const LINK_OPTIONS = [
  { value: '', label: 'Sem botão' },
  { value: '/agentes', label: 'Agentes culturais' },
  { value: '/eventos', label: 'Eventos' },
  { value: '/espacos', label: 'Espaços culturais' },
  { value: '/editais', label: 'Editais' },
  { value: '/projetos', label: 'Projetos' },
  { value: '/biblioteca', label: 'Biblioteca' },
  { value: '/oficinas', label: 'Oficinas' },
  { value: '/simbolos', label: 'Símbolos municipais' },
]

const SECTION_LABELS: Record<string, string> = {
  home: 'Página inicial',
  biblioteca: 'Biblioteca',
  library: 'Biblioteca',
  footer: 'Rodapé',
  geral: 'Geral',
}

type Tab = 'carousel' | 'content'

export function AdminSiteEditor() {
  const { isAdmin } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const formId = useId()
  const [tab, setTab] = useState<Tab>('carousel')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CarouselSlide | null>(null)

  const crud = useCrud<CarouselSlide>({
    table: 'carousel_images',
    queryKey: ['admin-carousel'],
    orderBy: ['sort_order', true],
    invalidate: [['hero-carousel']],
    successMessage: { save: 'Slide salvo.', remove: 'Slide excluído.' },
  })
  const slides = crud.items

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SlideForm>({ defaultValues: DEFAULTS })
  const imageUrl = watch('image_url')

  /** Reordena a lista inteira de uma vez, com sort_order normalizado (0..n-1). */
  const reorder = useMutation({
    mutationFn: async (ordered: CarouselSlide[]) => {
      const changed = ordered
        .map((s, idx) => ({ id: s.id, sort_order: idx }))
        .filter((s, idx) => ordered[idx].sort_order !== s.sort_order)
      const results = await Promise.all(changed.map((s) => supabase.from('carousel_images').update({ sort_order: s.sort_order }).eq('id', s.id)))
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },
    onSuccess: () => crud.invalidateAll(),
    onError: (err) => toast.error(errorMessage(err)),
  })

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= slides.length) return
    const next = [...slides]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    reorder.mutate(next)
  }

  function openNew() { setEditing(null); reset(DEFAULTS); setOpen(true) }
  function openEdit(s: CarouselSlide) {
    setEditing(s)
    reset({ title: s.title ?? '', subtitle: s.subtitle ?? '', image_url: s.image_url ?? '', link_url: s.link_url ?? '', link_label: s.link_label ?? '', is_active: s.is_active ?? true })
    setOpen(true)
  }
  function close() { setOpen(false) }

  function onSubmit(values: SlideForm) {
    const sort_order = editing ? editing.sort_order : slides.reduce((max, s) => Math.max(max, s.sort_order ?? 0), -1) + 1
    crud.save.mutate({ id: editing?.id, ...values, sort_order }, { onSuccess: close })
  }

  async function onDelete(s: CarouselSlide) {
    const ok = await confirm({ title: `Excluir o slide "${s.title || 'sem título'}"?`, message: 'O slide sai do carrossel da página inicial.', danger: true, confirmLabel: 'Excluir' })
    if (ok) crud.remove.mutate(s.id)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Settings2}
        title="Editor do Site"
        description="Carrossel da página inicial e textos editáveis do site."
        actions={tab === 'carousel' && isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><ImagePlus size={16} /> Novo slide</button>}
      />

      <div role="tablist" aria-label="Seções do editor" className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: 'var(--bg-secondary)' }}>
        {([['carousel', 'Carrossel'], ['content', 'Textos do site']] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'shadow-sm' : ''}`}
            style={tab === id ? { background: 'var(--bg-card)', color: 'var(--text-primary)' } : { color: 'var(--text-secondary)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'carousel' && (
        <section aria-label="Slides do carrossel">
          {crud.isLoading ? (
            <SkeletonList rows={3} />
          ) : crud.error ? (
            <ErrorState error={crud.error} onRetry={() => crud.refetch()} />
          ) : slides.length === 0 ? (
            <EmptyState icon={ImageIcon} title="Nenhum slide cadastrado" description="Adicione fotos ao carrossel da página inicial." action={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><ImagePlus size={16} /> Novo slide</button>} />
          ) : (
            <ol className="space-y-3">
              {slides.map((slide, idx) => (
                <li key={slide.id} className="card flex items-center gap-4 p-4">
                  <span className="w-6 text-center text-xs font-bold" style={{ color: 'var(--text-muted)' }} aria-label={`Posição ${idx + 1}`}>{idx + 1}</span>
                  <div className="w-24 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                    {slide.image_url ? <img src={slide.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={20} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{slide.title || 'Slide sem título'}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{slide.subtitle || '—'}</p>
                  </div>
                  <BoolBadge value={slide.is_active} yes="Ativo" no="Inativo" />
                  <RowActions canWrite={isAdmin} onEdit={() => openEdit(slide)} onDelete={() => onDelete(slide)}>
                    {isAdmin && (
                      <>
                        <IconButton label="Mover para cima" onClick={() => move(idx, -1)} disabled={idx === 0 || reorder.isPending}><ArrowUp size={14} /></IconButton>
                        <IconButton label="Mover para baixo" onClick={() => move(idx, 1)} disabled={idx === slides.length - 1 || reorder.isPending}><ArrowDown size={14} /></IconButton>
                      </>
                    )}
                  </RowActions>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {tab === 'content' && (
        <section aria-label="Textos do site">
          <p className="text-sm mb-6 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            Edite os textos abaixo e clique em <strong>Salvar textos</strong>. As alterações aparecem no site imediatamente.
          </p>
          <SiteContentForm grouped sectionLabels={SECTION_LABELS} canWrite={isAdmin} />
        </section>
      )}

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Editar slide' : 'Novo slide'}
        description="Foto, título e botão exibidos no carrossel da página inicial."
        locked={crud.save.isPending}
        footer={<FormFooter formId={formId} onCancel={close} loading={crud.save.isPending} canWrite={isAdmin} submitLabel="Salvar slide" disabled={!imageUrl} />}
      >
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset disabled={!isAdmin} className="space-y-4 min-w-0">
            <div>
              <p className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Foto do slide <span aria-hidden="true" style={{ color: 'var(--error)' }}>*</span></p>
              <input type="hidden" {...register('image_url', { required: 'Envie uma foto para o slide.' })} />
              <ImageUploader label="Foto do slide" currentUrl={imageUrl || null} folder="carousel" onUpload={(url) => setValue('image_url', url, { shouldDirty: true, shouldValidate: true })} />
              {errors.image_url && <p role="alert" className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.image_url.message}</p>}
            </div>
            <Field label="Título" required error={errors.title?.message}>
              {(p) => <input {...p} {...register('title', { required: 'Informe o título do slide.' })} className="input w-full" placeholder="Ex.: Balé e Dança" />}
            </Field>
            <Field label="Subtítulo">
              {(p) => <input {...p} {...register('subtitle')} className="input w-full" placeholder="Ex.: Arte em movimento" />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Destino do botão">
                {(p) => (
                  <select {...p} {...register('link_url')} className="input w-full">
                    {LINK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Texto do botão">
                {(p) => <input {...p} {...register('link_label')} className="input w-full" placeholder="Ex.: Ver agentes" />}
              </Field>
            </div>
            <CheckboxField label="Slide ativo" hint="Slides inativos não aparecem no site." {...register('is_active')} />
          </fieldset>
        </form>
      </Modal>
    </div>
  )
}
