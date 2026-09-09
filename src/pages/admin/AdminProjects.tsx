import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { GraduationCap, Plus, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ImageUploader } from '@/components/ImageUploader'

export function AdminProjects() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [coverUrl, setCoverUrl] = useState<string>('')
  const { register, handleSubmit, reset } = useForm()

  const { data: items, isLoading } = useQuery({
    queryKey: ['cultural_projects'],
    queryFn: async () => {
      const { data } = await supabase.from('cultural_projects').select('*').order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, cover_url: coverUrl || null }
      if (editing) {
        await supabase.from('cultural_projects').update(payload).eq('id', editing.id)
      } else {
        await supabase.from('cultural_projects').insert(payload)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cultural_projects'] }); setModalOpen(false); setEditing(null); setCoverUrl(''); reset() },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('cultural_projects').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cultural_projects'] }),
  })

  const STATUS_LABELS: Record<string, string> = {
    em_andamento: 'Em Andamento', concluido: 'Concluído', planejamento: 'Planejamento', suspenso: 'Suspenso',
  }

  function openEdit(item: any) { setEditing(item); reset(item); setCoverUrl(item.cover_url ?? ''); setModalOpen(true) }
  function openNew() { setEditing(null); reset({}); setCoverUrl(''); setModalOpen(true) }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Projetos Culturais</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Gerenciar projetos culturais do município</p>
        </div>
        <button onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo</button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />)}</div>
      ) : items && items.length > 0 ? (
        <div className="rounded-2xl border overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full">
            <thead style={{ background: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Título</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {items.map((item: any) => (
                <tr key={item.id} style={{ background: 'var(--bg-card)' }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{STATUS_LABELS[item.status] ?? item.status}</td>
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
          <GraduationCap size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-primary)' }}>Nenhum projeto cadastrado</p>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editing ? 'Editar' : 'Novo'} Projeto</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
              <div><label className="label">Título *</label><input {...register('title', { required: true })} className="input w-full" /></div>
              <div>
                <label className="label">Status</label>
                <select {...register('status')} className="input w-full">
                  <option value="planejamento">Planejamento</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="suspenso">Suspenso</option>
                </select>
              </div>
              <div><label className="label">Descrição</label><textarea {...register('description')} className="input w-full" rows={3} /></div>
              <div><label className="label">Coordenador</label><input {...register('coordinator')} className="input w-full" /></div>
              <div><label className="label">Contato</label><input {...register('contact')} className="input w-full" /></div>
              <div><label className="label">Parceiros</label><input {...register('partners')} className="input w-full" /></div>
              <div>
                <label className="label">Foto de Capa</label>
                <ImageUploader
                  currentUrl={editing?.cover_url}
                  onUpload={url => setCoverUrl(url)}
                  folder="projects"
                  maxMb={10}
                />
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
