import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BookOpen, Plus } from 'lucide-react'
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
import { SiteContentForm } from '@/components/admin/SiteContentForm'
import { ImageUploader } from '@/components/ImageUploader'

interface LibraryBook {
  id: string
  title: string
  author: string | null
  genre: string | null
  year: number | null
  isbn: string | null
  description: string | null
  cover_url: string | null
  is_available: boolean
  created_at: string
}

interface BookForm {
  title: string
  author: string
  genre: string
  year: number | null
  isbn: string
  description: string
  cover_url: string
  is_available: boolean
}

const DEFAULTS: BookForm = { title: '', author: '', genre: '', year: null, isbn: '', description: '', cover_url: '', is_available: true }

function toForm(b: LibraryBook): BookForm {
  return {
    title: b.title ?? '',
    author: b.author ?? '',
    genre: b.genre ?? '',
    year: b.year,
    isbn: b.isbn ?? '',
    description: b.description ?? '',
    cover_url: b.cover_url ?? '',
    is_available: b.is_available ?? true,
  }
}

export function AdminLibrary() {
  const { isAdmin } = useAuth()
  const confirm = useConfirm()
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LibraryBook | null>(null)

  const crud = useCrud<LibraryBook>({
    table: 'library_books',
    queryKey: ['admin-library-books'],
    orderBy: ['title', true],
    invalidate: [['library-books']],
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BookForm>({ defaultValues: DEFAULTS })
  const coverUrl = watch('cover_url')

  function openNew() { setEditing(null); reset(DEFAULTS); setOpen(true) }
  function openEdit(item: LibraryBook) { setEditing(item); reset(toForm(item)); setOpen(true) }
  function close() { setOpen(false) }

  function onSubmit(values: BookForm) {
    crud.save.mutate({ id: editing?.id, ...values }, { onSuccess: close })
  }

  async function onDelete(item: LibraryBook) {
    const ok = await confirm({ title: `Excluir "${item.title}"?`, message: 'O livro será removido do acervo exibido no site.', danger: true, confirmLabel: 'Excluir' })
    if (ok) crud.remove.mutate(item.id)
  }

  const columns: AdminColumn<LibraryBook>[] = [
    {
      key: 'title', header: 'Título',
      render: (b) => (
        <div className="flex items-center gap-3">
          {b.cover_url ? (
            <img src={b.cover_url} alt="" className="w-8 h-11 rounded object-cover flex-shrink-0" style={{ background: 'var(--bg-secondary)' }} />
          ) : (
            <div className="w-8 h-11 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-secondary)' }} aria-hidden="true"><BookOpen size={14} style={{ color: 'var(--text-muted)' }} /></div>
          )}
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{b.title}</span>
        </div>
      ),
    },
    { key: 'author', header: 'Autor(a)', render: (b) => b.author ?? '—' },
    { key: 'genre', header: 'Gênero', render: (b) => b.genre ?? '—' },
    { key: 'year', header: 'Ano', render: (b) => b.year ?? '—' },
    { key: 'available', header: 'Disponível', render: (b) => <BoolBadge value={b.is_available} /> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, align: 'right', render: (b) => <RowActions canWrite={isAdmin} onEdit={() => openEdit(b)} onDelete={() => onDelete(b)} /> },
  ]

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader icon={BookOpen} title="Biblioteca Pública" description="Informações da biblioteca exibidas no site e o acervo de livros." />

      <section aria-labelledby="library-info-title">
        <h2 id="library-info-title" className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Informações da biblioteca</h2>
        <SiteContentForm keyPrefix="library." canWrite={isAdmin} submitLabel="Salvar informações" />
      </section>

      <section aria-labelledby="library-books-title">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 id="library-books-title" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Acervo de livros</h2>
          {isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Adicionar livro</button>}
        </div>

        {crud.isLoading ? (
          <SkeletonList rows={5} />
        ) : crud.error ? (
          <ErrorState error={crud.error} onRetry={() => crud.refetch()} />
        ) : crud.items.length === 0 ? (
          <EmptyState icon={BookOpen} title="Nenhum livro cadastrado" description="Adicione livros para exibir o acervo no site." action={isAdmin && <button type="button" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Adicionar livro</button>} />
        ) : (
          <AdminTable columns={columns} rows={crud.items} caption="Acervo de livros da biblioteca" />
        )}
      </section>

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Editar livro' : 'Novo livro'}
        locked={crud.save.isPending}
        footer={<FormFooter formId={formId} onCancel={close} loading={crud.save.isPending} canWrite={isAdmin} />}
      >
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset disabled={!isAdmin} className="space-y-4 min-w-0">
            <Field label="Título" required error={errors.title?.message}>
              {(p) => <input {...p} {...register('title', { required: 'Informe o título do livro.' })} className="input w-full" />}
            </Field>
            <Field label="Autor(a)">
              {(p) => <input {...p} {...register('author')} className="input w-full" />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Gênero">
                {(p) => <input {...p} {...register('genre')} className="input w-full" />}
              </Field>
              <Field label="Ano" error={errors.year?.message}>
                {(p) => <input {...p} {...register('year', { ...asNumberOrNull, min: { value: 0, message: 'Ano inválido.' }, max: { value: 2100, message: 'Ano inválido.' } })} type="number" className="input w-full" />}
              </Field>
              <Field label="ISBN">
                {(p) => <input {...p} {...register('isbn')} className="input w-full" />}
              </Field>
            </div>
            <Field label="Descrição">
              {(p) => <textarea {...p} {...register('description')} className="input w-full" rows={2} />}
            </Field>
            <div>
              <p className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Capa</p>
              <input type="hidden" {...register('cover_url')} />
              <ImageUploader label="Capa do livro" currentUrl={coverUrl || null} folder="library" maxMb={5} onUpload={(url) => setValue('cover_url', url, { shouldDirty: true })} />
            </div>
            <CheckboxField label="Disponível para empréstimo" {...register('is_available')} />
          </fieldset>
        </form>
      </Modal>
    </div>
  )
}
