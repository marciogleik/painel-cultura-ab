import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { updateInscriptionStatus } from '@/services/editalService'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

export function AdminInscriptions() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<string>('EM_ANALISE')

  const { data: inscriptions, isLoading } = useQuery({
    queryKey: ['all-inscriptions', filter],
    queryFn: async () => {
      let query = supabase
        .from('inscriptions')
        .select('*, editais(title), artists(artistic_name, profiles(full_name, phone))')
        .order('submitted_at', { ascending: false })

      if (filter !== 'ALL') query = query.eq('status', filter)

      const { data } = await query
      return data ?? []
    },
  })

  const mutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      await updateInscriptionStatus(id, status, notes)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-inscriptions'] }),
  })

  const statusOptions = [
    { value: 'EM_ANALISE', label: 'Em análise' },
    { value: 'ABERTO', label: 'Enviadas' },
    { value: 'APROVADO', label: 'Aprovadas' },
    { value: 'REPROVADO', label: 'Reprovadas' },
    { value: 'ALL', label: 'Todas' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inscrições em Editais</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {statusOptions.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`badge cursor-pointer transition-all ${filter === value ? 'badge-amber' : 'badge-slate'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card p-5"><div className="skeleton h-4 w-full" /></div>)}
        </div>
      ) : (
        <div className="space-y-3">
          {inscriptions?.map((ins: any) => (
            <div key={ins.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">
                    {ins.artists?.artistic_name ?? ins.artists?.profiles?.full_name}
                  </p>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    {ins.editais?.title} · {formatDate(ins.submitted_at)}
                  </p>
                  <span className={`badge text-xs ${
                    ins.status === 'APROVADO' ? 'badge-green' :
                    ins.status === 'REPROVADO' ? 'badge-red' :
                    ins.status === 'EM_ANALISE' ? 'badge-amber' : 'badge-slate'
                  }`}>
                    {ins.status}
                  </span>
                </div>
                {(ins.status === 'ABERTO' || ins.status === 'EM_ANALISE') && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => mutation.mutate({ id: ins.id, status: 'EM_ANALISE' })}
                      disabled={ins.status === 'EM_ANALISE' || mutation.isPending}
                      className="btn btn-secondary text-xs py-1.5"
                    >
                      <Clock size={14} /> Analisar
                    </button>
                    <button
                      onClick={() => mutation.mutate({ id: ins.id, status: 'APROVADO' })}
                      disabled={mutation.isPending}
                      className="btn btn-primary text-xs py-1.5"
                    >
                      <CheckCircle size={14} /> Aprovar
                    </button>
                    <button
                      onClick={() => mutation.mutate({ id: ins.id, status: 'REPROVADO' })}
                      disabled={mutation.isPending}
                      className="btn btn-danger text-xs py-1.5"
                    >
                      <XCircle size={14} /> Reprovar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {inscriptions?.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma inscrição encontrada</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
