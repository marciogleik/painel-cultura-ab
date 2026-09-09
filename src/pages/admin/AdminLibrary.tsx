import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BookOpen, Plus, Pencil, Trash2, X, Save } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

export function AdminLibrary() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const { register, handleSubmit, reset } = useForm()
  const { register: regContent, handleSubmit: handleContent } = useForm()

  const { data: books } = useQuery({
    queryKey: ['admin-library-books'],
    queryFn: async () => {
      const { data } = await supabase.from('library_books').select('*').order('title')
      return data ?? []
    },
  })

  const { data: content } = useQuery({
    queryKey: ['library-content-admin'],
    queryFn: async () => {
      const { data } = await supabase.from('site_content').select('*').like('key', 'library.%')
      return data ?? []
    },
  })

  const contentMutation = useMutation({
    mutationFn: async (data: any) => {
      for (const [key, value] of Object.entries(data)) {
        await supabase.from('site_content').upsert({ key, value: value as string, label: key, type: 'text', section: 'biblioteca' }, { onConflict: 'key' })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library-content-admin'] }),
  })

  const bookMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        await supabase.from('library_books').update(data).eq('id', editing.id)
      } else {
        await supabase.from('library_books').insert(data)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-library-books'] }); setModalOpen(false); setEditing(null); reset() },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => supabase.from('library_books').delete().eq('id', id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-library-books'] }),
  })

  return (
    <div className="animate-fade-in space-y-8">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Biblioteca Pública</h1>

      {/* Informações editáveis */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Informações da Biblioteca</h2>
        <form onSubmit={handleContent(data => contentMutation.mutate(data))} className="space-y-4">
          {content?.map((c: any) => (
            <div key={c.key}>
              <label className="label">{c.label}</label>
              <input
                defaultValue={c.value ?? ''}
                {...regContent(c.key)}
                className="input w-full"
              />
            </div>
          ))}
          <button type="submit" disabled={contentMutation.isPending} className="btn btn-primary">
            <Save size={16} /> {contentMutation.isPending ? 'Salvando...' : 'Salvar informações'}
          </button>
        </form>
      </div>

      {/* Acervo */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Acervo de Livros</h2>
          <button onClick={() => { setEditing(null); reset({}); setModalOpen(true) }} className="btn btn-primary">
            <Plus size={16} /> Adicionar Livro
          </button>
        </div>

        {books && books.length > 0 ? (
          <div className="rounded-2xl border overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full">
              <thead style={{ background: 'var(--bg-secondary)' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Título</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Autor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Disponível</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {books.map((book: any) => (
                  <tr key={book.id} style={{ background: 'var(--bg-card)' }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{book.title}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{book.author ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${book.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {book.is_available ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditing(book); reset(book); setModalOpen(true) }} className="p-1.5 rounded text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
                        <button onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(book.id) }} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <BookOpen size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-primary)' }}>Nenhum livro cadastrado</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editing ? 'Editar Livro' : 'Novo Livro'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(data => bookMutation.mutate(data))} className="space-y-4">
              <div><label className="label">Título *</label><input {...register('title', { required: true })} className="input w-full" /></div>
              <div><label className="label">Autor</label><input {...register('author')} className="input w-full" /></div>
              <div><label className="label">Gênero</label><input {...register('genre')} className="input w-full" /></div>
              <div><label className="label">Ano</label><input {...register('year', { valueAsNumber: true })} type="number" className="input w-full" /></div>
              <div><label className="label">ISBN</label><input {...register('isbn')} className="input w-full" /></div>
              <div><label className="label">Descrição</label><textarea {...register('description')} className="input w-full" rows={2} /></div>
              <div className="flex items-center gap-2"><input {...register('is_available')} type="checkbox" id="avail" defaultChecked /><label htmlFor="avail" style={{ color: 'var(--text-primary)' }}>Disponível</label></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={bookMutation.isPending} className="btn btn-primary flex-1">{bookMutation.isPending ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
