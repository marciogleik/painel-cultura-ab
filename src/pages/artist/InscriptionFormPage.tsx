import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getEditalById, createInscription } from '@/services/editalService'
import { getMyArtistProfile } from '@/services/artistService'
import { useAuth } from '@/contexts/AuthContext'
import { FileText, Send, ArrowLeft } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function InscriptionFormPage() {
  const { editalId } = useParams<{ editalId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState(false)

  const { data: edital } = useQuery({
    queryKey: ['edital', editalId],
    queryFn: () => getEditalById(editalId!),
    enabled: !!editalId,
  })

  const { data: artist } = useQuery({
    queryKey: ['my-artist', user?.id],
    queryFn: () => getMyArtistProfile(user!.id),
    enabled: !!user,
  })

  const mutation = useMutation({
    mutationFn: () => createInscription(editalId!, artist!.id, notes || undefined),
    onSuccess: () => setSuccess(true),
  })

  if (success) {
    return (
      <div className="animate-fade-in max-w-lg mx-auto text-center py-16">
        <div className="card p-10">
          <div className="mx-auto mb-4 h-16 w-16 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Inscrição realizada!</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Sua inscrição para <strong className="text-slate-900 dark:text-white">{edital?.title}</strong> foi enviada.
            Você pode acompanhar o status no painel.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/painel/inscricoes')} className="btn btn-primary w-full justify-center">
              Ver minhas inscrições
            </button>
            <Link to="/editais" className="btn btn-secondary w-full justify-center">
              Ver outros editais
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-lg">
      <Link to={`/editais/${editalId}`} className="inline-flex items-center gap-2 text-sm mb-6 hover:text-amber-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="h-4 w-4" />
        Voltar ao edital
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Nova Inscrição</h1>

      {!artist ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-900 dark:text-white mb-4">Você precisa cadastrar seu Agente Cultural no SMIIC antes de se inscrever.</p>
          <Link to="/painel/agentes/cadastrar" className="btn btn-primary">Cadastrar Agente Cultural</Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Edital summary */}
          {edital && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{edital.title}</h2>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Prazo: {formatDate(edital.end_date)}
              </p>
            </div>
          )}

          {/* Artist info */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Você está se inscrevendo como:</h3>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
              >
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {(artist.artistic_name ?? '?')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{artist.artistic_name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {artist.city} - {artist.state}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Carta de apresentação / Observações
              <span className="font-normal ml-2" style={{ color: 'var(--text-muted)' }}>(opcional)</span>
            </label>
            <textarea
              className="input"
              rows={5}
              placeholder="Conte por que você quer participar deste edital, projetos relevantes, expectativas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {mutation.isError && (
            <div className="p-3 rounded-lg text-sm text-red-400 border border-red-500/20 bg-red-500/5">
              Erro ao enviar inscrição. Verifique se você já não está inscrito neste edital.
            </div>
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn btn-primary w-full justify-center py-3"
          >
            {mutation.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {mutation.isPending ? 'Enviando...' : 'Confirmar Inscrição'}
          </button>
        </div>
      )}
    </div>
  )
}
