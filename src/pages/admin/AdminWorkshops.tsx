import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Wrench, Plus, Pencil, Trash2, X, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ImageUploader } from '@/components/ImageUploader'

export function AdminWorkshops() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string>('')
  const { register, handleSubmit, reset } = useForm()

  const { data: items, isLoading } = useQuery({
    queryKey: ['cultural_workshops'],
    queryFn: async () => {
      const { data } = await supabase.from('cultural_workshops').select('*').order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, cover_url: coverUrl || null }
      if (editing) {
        const { error } = await supabase.from('cultural_workshops').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('cultural_workshops').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cultural_workshops'] })
      setModalOpen(false)
      setEditing(null)
      setErrorMsg(null)
      setCoverUrl('')
      reset()
    },
    onError: (err: any) => {
      setErrorMsg(err?.message ?? 'Erro ao salvar oficina. Tente novamente.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cultural_workshops').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cultural_workshops'] }),
    onError: (err: any) => alert('Erro ao excluir: ' + (err?.message ?? 'Tente novamente.')),
  })

  function openEdit(item: any) { setEditing(item); reset(item); setCoverUrl(item.cover_url ?? ''); setErrorMsg(null); setModalOpen(true) }
  function openNew() { setEditing(null); reset({}); setCoverUrl(''); setErrorMsg(null); setModalOpen(true) }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Oficinas Culturais</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Gerenciar oficinas, cursos e workshops</p>
        </div>
        <button onClick={openNew} className="btn btn-primary"><Plus size={16} /> Nova Oficina</button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />)}</div>
      ) : items && items.length > 0 ? (
        <div className="rounded-2xl border overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full">
            <thead style={{ background: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Título</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Instrutor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Gratuita</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {items.map((item: any) => (
                <tr key={item.id} style={{ background: 'var(--bg-card)' }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{item.instructor ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.is_free ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {item.is_free ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(item.id) }} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
          <Wrench size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-primary)' }}>Nenhuma oficina cadastrada</p>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editing ? 'Editar' : 'Nova'} Oficina</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 text-sm">
                <AlertCircle size={15} className="flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
              <div><label className="label">Título *</label><input {...register('title', { required: true })} className="input w-full" /></div>
              <div><label className="label">Categoria</label><input {...register('category')} className="input w-full" placeholder="Ex: Música, Teatro, Artesanato" /></div>
              <div><label className="label">Descrição</label><textarea {...register('description')} className="input w-full" rows={3} /></div>
              <div><label className="label">Instrutor</label><input {...register('instructor')} className="input w-full" /></div>
              <div><label className="label">Local</label><input {...register('location')} className="input w-full" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Data de Início</label><input {...register('start_date')} type="datetime-local" className="input w-full" /></div>
                <div><label className="label">Horário / Dias</label><input {...register('schedule')} className="input w-full" placeholder="Ex: Sábados 9h-12h" /></div>
              </div>
              <div><label className="label">Duração</label><input {...register('duration')} className="input w-full" placeholder="Ex: 8 horas" /></div>
              <div><label className="label">Vagas</label><input {...register('vacancies', { valueAsNumber: true })} type="number" className="input w-full" /></div>
              <div><label className="label">Contato</label><input {...register('contact')} className="input w-full" /></div>
              <div>
                <label className="label">Foto de Capa</label>
                <ImageUploader
                  currentUrl={editing?.cover_url}
                  onUpload={url => setCoverUrl(url)}
                  folder="workshops"
                  maxMb={10}
                />
              </div>
              <div className="flex items-center gap-2">
                <input {...register('is_free')} type="checkbox" id="ws_free" defaultChecked />
                <label htmlFor="ws_free" style={{ color: 'var(--text-primary)' }}>Oficina gratuita</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={mutation.isPending} className="btn btn-primary flex-1">{mutation.isPending ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
