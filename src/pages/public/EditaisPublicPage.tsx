import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getEditais } from '@/services/editalService'
import { FileText, Calendar, ArrowRight, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function EditaisPublicPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['editais-public'],
    queryFn: () => getEditais({ status: 'PUBLICADO', pageSize: 20 }),
  })



  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Editais Culturais</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Oportunidades abertas pela Secretaria Municipal de Cultura
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6">
              <div className="skeleton h-6 w-2/3 mb-3" />
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nenhum edital aberto</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Novos editais serão publicados em breve.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((edital) => {
            const daysLeft = Math.ceil(
              (new Date(edital.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
            const isUrgent = daysLeft <= 7

            return (
              <Link
                key={edital.id}
                to={`/editais/${edital.id}`}
                className="card card-glow block p-6 group"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-amber-400 transition-colors leading-snug">
                    {edital.title}
                  </h2>
                  <ArrowRight className="h-5 w-5 flex-shrink-0 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </div>

                <p
                  className="text-sm mb-4 line-clamp-2 leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {edital.description}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {(edital as any).categories && (
                    <span className="badge badge-amber text-xs">
                      {(edital as any).categories.icon} {(edital as any).categories.name}
                    </span>
                  )}
                  <span className={`badge text-xs flex items-center gap-1 ${isUrgent ? 'badge-red' : 'badge-slate'}`}>
                    <Clock className="h-3 w-3" />
                    {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Encerrado'}
                  </span>
                  <span className="badge badge-slate text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Até {formatDate(edital.end_date)}
                  </span>
                  {edital.prize_value && (
                    <span className="badge badge-green text-xs">
                      R$ {edital.prize_value.toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
