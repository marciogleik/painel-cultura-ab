import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FileText, Plus, Calendar, Pencil, Trash2, X, Send, ChevronDown, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ImageUploader } from '@/components/ImageUploader'
import { FileUploader } from '@/components/FileUploader'

type EditalStatus = 'RASCUNHO' | 'PUBLICADO' | 'ENCERRADO' | 'CANCELADO'

interface EditalFormData {
  title: string
  description: string
  requirements: string
  category_id: string
  status: EditalStatus
  start_date: string
  end_date: string
  total_slots: number | ''
  prize_value: number | ''
}

const STATUS_COLORS: Record<string, string> = {
  RASCUNHO: 'badge-slate',
  PUBLICADO: 'badge-green',
  ENCERRADO: 'badge-amber',
  CANCELADO: 'badge-red',
}

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  PUBLICADO: 'Publicado',
  ENCERRADO: 'Encerrado',
  CANCELADO: 'Cancelado',
}

export function AdminEditais() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string>('')
  const [documentUrl, setDocumentUrl] = useState<string>('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditalFormData>()

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: editais, isLoading } = useQuery({
    queryKey: ['admin-editais'],
    queryFn: async () => {
      const { data } = await supabase
        .from('editais')
        .select('*, categories(name, icon), profiles(full_name)')
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, icon')
        .eq('is_active', true)
        .order('sort_order')
      return data ?? []
    },
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (formData: EditalFormData) => {
      const payload = {
        ...formData,
        total_slots: formData.total_slots === '' ? null : Number(formData.total_slots),
        prize_value: formData.prize_value === '' ? null : Number(formData.prize_value),
        category_id: formData.category_id || null,
        cover_url: coverUrl || null,
        document_url: documentUrl || null,
        published_at:
          formData.status === 'PUBLICADO' && (!editing || editing.status !== 'PUBLICADO')
            ? new Date().toISOString()
            : editing?.published_at ?? null,
      }

      if (editing) {
        const { error } = await supabase.from('editais').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('editais').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-editais'] })
      closeModal()
    },
    onError: (err: any) => {
      setErrorMsg(err?.message ?? 'Erro ao salvar edital.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('editais').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-editais'] }),
    onError: (err: any) => alert('Erro ao excluir: ' + (err?.message ?? 'Tente novamente.')),
  })

  // ── Helpers ───────────────────────────────────────────────────────────────
  function openNew() {
    setEditing(null)
    setCoverUrl('')
    setDocumentUrl('')
    reset({
      title: '',
      description: '',
      requirements: '',
      category_id: '',
      status: 'RASCUNHO',
      start_date: '',
      end_date: '',
      total_slots: '',
      prize_value: '',
    })
    setErrorMsg(null)
    setModalOpen(true)
  }

  function openEdit(edital: any) {
    setEditing(edital)
    setCoverUrl(edital.cover_url ?? '')
    setDocumentUrl(edital.document_url ?? '')
    reset({
      title: edital.title ?? '',
      description: edital.description ?? '',
      requirements: edital.requirements ?? '',
      category_id: edital.category_id ?? '',
      status: edital.status ?? 'RASCUNHO',
      start_date: edital.start_date ?? '',
      end_date: edital.end_date ?? '',
      total_slots: edital.total_slots ?? '',
      prize_value: edital.prize_value ?? '',
    })
    setErrorMsg(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setErrorMsg(null)
    setCoverUrl('')
    setDocumentUrl('')
    reset()
  }

  function confirmDelete(edital: any) {
    if (confirm(`Excluir o edital "${edital.title}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(edital.id)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Editais
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Gerenciar editais públicos, chamadas e concursos
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary">
          <Plus size={16} /> Novo Edital
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5">
              <div className="skeleton h-4 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {editais?.map((edital: any) => (
            <div key={edital.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                {/* Cover thumb */}
                {edital.cover_url && (
                  <img
                    src={edital.cover_url}
                    alt={edital.title}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`badge text-xs ${STATUS_COLORS[edital.status] ?? 'badge-slate'}`}>
                      {STATUS_LABELS[edital.status] ?? edital.status}
                    </span>
                    {edital.categories && (
                      <span className="badge badge-amber text-xs">
                        {edital.categories.icon} {edital.categories.name}
                      </span>
                    )}
                    {edital.document_url && (
                      <a
                        href={edital.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="badge text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <Download size={10} /> Documento
                      </a>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {edital.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(edital.start_date)} – {formatDate(edital.end_date)}
                    </span>
                    {edital.prize_value && (
                      <span>R$ {Number(edital.prize_value).toLocaleString('pt-BR')}</span>
                    )}
                    {edital.total_slots && (
                      <span>{edital.total_slots} vagas</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {edital.status === 'RASCUNHO' && (
                    <button
                      onClick={() => openEdit(edital)}
                      title="Publicar"
                      className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(edital)}
                    title="Editar"
                    className="p-1.5 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => confirmDelete(edital)}
                    title="Excluir"
                    className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {editais?.length === 0 && (
            <div className="card p-12 text-center">
              <FileText
                className="mx-auto h-12 w-12 mb-3"
                style={{ color: 'var(--text-muted)' }}
              />
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Nenhum edital criado ainda
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Clique em "Novo Edital" para criar o primeiro.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editing ? 'Editar Edital' : 'Novo Edital'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 text-sm">
                {errorMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(data => saveMutation.mutate(data))} className="space-y-4">
              {/* Imagem de Capa */}
              <div>
                <label className="label">Imagem de Capa</label>
                <ImageUploader
                  currentUrl={editing?.cover_url}
                  onUpload={url => setCoverUrl(url)}
                  folder="editais"
                  maxMb={10}
                />
              </div>

              {/* Título */}
              <div>
                <label className="label">Título *</label>
                <input
                  {...register('title', { required: 'Título é obrigatório' })}
                  className="input w-full"
                  placeholder="Ex: Edital de Fomento à Cultura 2026"
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>

              {/* Categoria e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Categoria</label>
                  <div className="relative">
                    <select {...register('category_id')} className="input w-full appearance-none pr-8">
                      <option value="">Sem categoria</option>
                      {categories?.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
                <div>
                  <label className="label">Status *</label>
                  <div className="relative">
                    <select
                      {...register('status', { required: true })}
                      className="input w-full appearance-none pr-8"
                    >
                      <option value="RASCUNHO">Rascunho</option>
                      <option value="PUBLICADO">Publicado</option>
                      <option value="ENCERRADO">Encerrado</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Data de Início *</label>
                  <input
                    type="date"
                    {...register('start_date', { required: 'Data de início obrigatória' })}
                    className="input w-full"
                  />
                  {errors.start_date && (
                    <p className="text-xs text-red-500 mt-1">{errors.start_date.message}</p>
                  )}
                </div>
                <div>
                  <label className="label">Data de Encerramento *</label>
                  <input
                    type="date"
                    {...register('end_date', { required: 'Data de encerramento obrigatória' })}
                    className="input w-full"
                  />
                  {errors.end_date && (
                    <p className="text-xs text-red-500 mt-1">{errors.end_date.message}</p>
                  )}
                </div>
              </div>

              {/* Vagas e Premiação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Total de Vagas</label>
                  <input
                    type="number"
                    min={0}
                    {...register('total_slots')}
                    className="input w-full"
                    placeholder="Ex: 30"
                  />
                </div>
                <div>
                  <label className="label">Valor da Premiação (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    {...register('prize_value')}
                    className="input w-full"
                    placeholder="Ex: 5000.00"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="label">Descrição *</label>
                <textarea
                  {...register('description', { required: 'Descrição é obrigatória' })}
                  className="input w-full"
                  rows={4}
                  placeholder="Descreva o objetivo e detalhes do edital..."
                />
                {errors.description && (
                  <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Requisitos */}
              <div>
                <label className="label">Requisitos / Critérios de Participação</label>
                <textarea
                  {...register('requirements')}
                  className="input w-full"
                  rows={3}
                  placeholder="Liste os requisitos para participação..."
                />
              </div>

              {/* Documento Oficial */}
              <div>
                <label className="label">Documento Oficial (PDF/DOC)</label>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  Anexe o edital completo, regulamento ou edital em PDF para download público.
                </p>
                <FileUploader
                  currentUrl={editing?.document_url}
                  onUpload={url => setDocumentUrl(url)}
                  folder="editais/docs"
                  maxMb={20}
                  label="Clique para anexar o documento do edital"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="btn btn-primary flex-1"
                >
                  {saveMutation.isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar Edital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
