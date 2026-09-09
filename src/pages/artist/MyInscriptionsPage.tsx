import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getMyArtistProfile } from '@/services/artistService'
import { getMyInscriptions } from '@/services/editalService'
import { FileText, Clock, CheckCircle, XCircle, ArrowRight, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { InscriptionStatus } from '@/types'

const statusConfig: Record<InscriptionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ABERTO: { label: 'Enviada', color: 'badge-blue', icon: <FileText size={12} /> },
  EM_ANALISE: { label: 'Em análise', color: 'badge-amber', icon: <Clock size={12} /> },
  APROVADO: { label: 'Aprovada', color: 'badge-green', icon: <CheckCircle size={12} /> },
  REPROVADO: { label: 'Reprovada', color: 'badge-red', icon: <XCircle size={12} /> },
  FINALIZADO: { label: 'Finalizado', color: 'badge-slate', icon: <AlertCircle size={12} /> },
}

export function MyInscriptionsPage() {
  const { user } = useAuth()

  const { data: artist } = useQuery({
    queryKey: ['my-artist', user?.id],
    queryFn: () => getMyArtistProfile(user!.id),
    enabled: !!user,
  })

  const { data: inscriptions, isLoading } = useQuery({
    queryKey: ['my-inscriptions', artist?.id],
    queryFn: () => getMyInscriptions(artist!.id),
    enabled: !!artist,
  })

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Minhas Inscrições</h1>
        <Link to="/editais" className="btn btn-primary text-sm">
          <FileText className="h-4 w-4" />
          Ver editais abertos
        </Link>
      </div>

      {!artist ? (
        <div className="card p-12 text-center">
          <FileText className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Cadastre seu Agente Cultural</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Você precisa cadastrar seu Agente Cultural no SMIIC para se inscrever em editais.
          </p>
          <Link to="/painel/agentes/cadastrar" className="btn btn-primary">Cadastrar Agente Cultural</Link>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="card p-5">
              <div className="skeleton h-5 w-2/3 mb-3" />
              <div className="skeleton h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : inscriptions?.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nenhuma inscrição ainda</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Encontre editais culturais abertos e faça sua inscrição.
          </p>
          <Link to="/editais" className="btn btn-primary">Ver editais disponíveis</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {inscriptions?.map((inscription) => {
            const edital = (inscription as any).editais
            const statusInfo = statusConfig[inscription.status]
            return (
              <div key={inscription.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`badge ${statusInfo.color} text-xs flex items-center gap-1`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                      {edital?.categories && (
                        <span className="badge badge-slate text-xs">
                          {edital.categories.icon} {edital.categories.name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                      {edital?.title ?? 'Edital'}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Inscrito em {formatDate(inscription.submitted_at)}
                      {inscription.reviewed_at && ` · Revisado em ${formatDate(inscription.reviewed_at)}`}
                    </p>
                    {inscription.reviewer_notes && (
                      <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        <p className="font-medium text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          Observações da comissão:
                        </p>
                        {inscription.reviewer_notes}
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/editais/${inscription.edital_id}`}
                    className="btn btn-ghost text-xs flex-shrink-0"
                  >
                    Ver edital
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
