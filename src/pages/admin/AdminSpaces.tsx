import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Building2, Plus, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ImageUploader } from '@/components/ImageUploader'

export function AdminSpaces() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [photoUrl, setPhotoUrl] = useState<string>('')
  const { register, handleSubmit, reset } = useForm()

  const { data: items, isLoading } = useQuery({
    queryKey: ['cultural_spaces'],
    queryFn: async () => {
      const { data } = await supabase.from('cultural_spaces').select('*').order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, photo_url: photoUrl || null }
      if (editing) {
        await supabase.from('cultural_spaces').update(payload).eq('id', editing.id)
      } else {
        await supabase.from('cultural_spaces').insert(payload)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cultural_spaces'] }); setModalOpen(false); setEditing(null); setPhotoUrl(''); reset() },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('cultural_spaces').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cultural_spaces'] }),
  })

  function openEdit(item: any) { setEditing(item); reset(item); setPhotoUrl(item.photo_url ?? ''); setModalOpen(true) }
  function openNew() { setEditing(null); reset({}); setPhotoUrl(''); setModalOpen(true) }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Espaços Culturais</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Gerenciar espaços culturais do município</p>
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
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {items.map((item: any) => (
                <tr key={item.id} style={{ background: 'var(--bg-card)' }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{item.type ?? '—'}</td>
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
          <Building2 size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-primary)' }}>Nenhum espaço cultural cadastrado</p>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editing ? 'Editar' : 'Novo'} Espaço Cultural</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
              <div><label className="label">Nome *</label><input {...register('name', { required: true })} className="input w-full" /></div>
              <div>
                <label className="label">Tipo</label>
                <select {...register('type')} className="input w-full">
                  <option value="teatro">Teatro</option>
                  <option value="museu">Museu</option>
                  <option value="biblioteca">Biblioteca</option>
                  <option value="centro_cultural">Centro Cultural</option>
                  <option value="galeria">Galeria</option>
                  <option value="espaco_publico">Espaço Público</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div><label className="label">Endereço</label><input {...register('address')} className="input w-full" /></div>
              <div><label className="label">Descrição</label><textarea {...register('description')} className="input w-full" rows={3} /></div>
              <div><label className="label">Telefone</label><input {...register('phone')} className="input w-full" /></div>
              <div><label className="label">Site</label><input {...register('website')} className="input w-full" /></div>
              <div><label className="label">Capacidade</label><input {...register('capacity', { valueAsNumber: true })} type="number" className="input w-full" /></div>
              <div>
                <label className="label">Foto do Espaço</label>
                <ImageUploader
                  currentUrl={editing?.photo_url}
                  onUpload={url => setPhotoUrl(url)}
                  folder="spaces"
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
