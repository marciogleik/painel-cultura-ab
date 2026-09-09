import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Flag, Plus, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

export function AdminSymbols() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const { register, handleSubmit, reset } = useForm()

  const { data: symbols } = useQuery({
    queryKey: ['admin-symbols'],
    queryFn: async () => {
      const { data } = await supabase.from('municipal_symbols').select('*').order('sort_order')
      return data ?? []
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) await supabase.from('municipal_symbols').update(data).eq('id', editing.id)
      else await supabase.from('municipal_symbols').insert(data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-symbols'] }); setModalOpen(false); setEditing(null); reset() },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => supabase.from('municipal_symbols').delete().eq('id', id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-symbols'] }),
  })

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Símbolos Municipais</h1>
        <button onClick={() => { setEditing(null); reset({}); setModalOpen(true) }} className="btn btn-primary"><Plus size={16} /> Novo</button>
      </div>

      <div className="space-y-4">
        {symbols?.map((symbol: any) => (
          <div key={symbol.id} className="flex items-start gap-4 p-4 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {symbol.image_url && <img src={symbol.image_url} alt={symbol.title} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{symbol.title}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{symbol.type} · {symbol.description}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => { setEditing(symbol); reset(symbol); setModalOpen(true) }} className="p-1.5 rounded text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
              <button onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(symbol.id) }} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {!symbols?.length && (
          <div className="text-center py-12 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <Flag size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-primary)' }}>Nenhum símbolo cadastrado</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editing ? 'Editar' : 'Novo'} Símbolo</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
              <div><label className="label">Título *</label><input {...register('title', { required: true })} className="input w-full" /></div>
              <div><label className="label">Tipo</label>
                <select {...register('type')} className="input w-full">
                  <option value="bandeira">Bandeira</option><option value="brasao">Brasão</option>
                  <option value="hino">Hino</option><option value="patrimonio">Patrimônio</option><option value="outro">Outro</option>
                </select>
              </div>
              <div><label className="label">Descrição</label><input {...register('description')} className="input w-full" /></div>
              <div><label className="label">Conteúdo (HTML permitido)</label><textarea {...register('content_html')} className="input w-full" rows={5} /></div>
              <div><label className="label">URL da Imagem</label><input {...register('image_url')} className="input w-full" /></div>
              <div><label className="label">URL do Áudio (Hino)</label><input {...register('audio_url')} className="input w-full" /></div>
              <div><label className="label">Ordem</label><input {...register('sort_order', { valueAsNumber: true })} type="number" className="input w-full" /></div>
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
