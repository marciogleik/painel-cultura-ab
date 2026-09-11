import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, Calendar, ArrowRight, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { getEditais, isEditalOpen } from '@/services/editalService'
import { daysUntil, formatDateLong } from '@/lib/utils'
import type { Edital } from '@/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'

/** Colunas adicionadas por migração e ainda não refletidas em src/types. */
type PublicEdital = Edital & { document_url?: string | null; cover_url?: string | null }

const PAGE_SIZE = 10

/** Rótulo e cor do prazo: aberto (verde/vermelho se urgente), futuro (azul) ou encerrado (cinza). */
function deadlineBadge(edital: Edital): { label: string; badge: string } {
  const untilEnd = daysUntil(edital.end_date)
  const untilStart = daysUntil(edital.start_date)
  if (isEditalOpen(edital)) {
    if (untilEnd === 0) return { label: 'Último dia', badge: 'badge-red' }
    if (untilEnd !== null && untilEnd <= 7) return { label: `${untilEnd} dia${untilEnd === 1 ? '' : 's'} restante${untilEnd === 1 ? '' : 's'}`, badge: 'badge-red' }
    return { label: `${untilEnd} dias restantes`, badge: 'badge-green' }
  }
  if (untilStart !== null && untilStart > 0) {
    return { label: `Abre em ${untilStart} dia${untilStart === 1 ? '' : 's'}`, badge: 'badge-blue' }
  }
  return { label: 'Encerrado', badge: 'badge-slate' }
}

export function EditaisPublicPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['editais-public', page],
    queryFn: () => getEditais({ status: 'PUBLICADO', page, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  })

  const editais = (data?.data ?? []) as PublicEdital[]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <PageHeader
        variant="public"
        icon={FileText}
        eyebrow="Oportunidades"
        title="Editais Culturais"
        description="Oportunidades abertas pela Secretaria de Esporte, Cultura, Lazer e Eventos"
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        {isLoading ? (
          <SkeletonList rows={3} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : editais.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum edital publicado"
            description="Novos editais serão publicados em breve."
          />
        ) : (
          <div className="space-y-4">
            {editais.map((edital) => {
              const deadline = deadlineBadge(edital)
              return (
                <Link
                  key={edital.id}
                  to={`/editais/${edital.id}`}
                  className="card card-glow block overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <div className="flex flex-col sm:flex-row">
                    {edital.cover_url && (
                      <div className="sm:w-48 flex-shrink-0">
                        <img
                          src={edital.cover_url}
                          alt=""
                          className="w-full h-40 sm:h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}
                    <div className="p-6 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h2 className="text-lg font-semibold group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-snug" style={{ color: 'var(--text-primary)' }}>
                          {edital.title}
                        </h2>
                        <ArrowRight
                          aria-hidden="true"
                          className="h-5 w-5 flex-shrink-0 text-amber-500 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity mt-0.5"
                        />
                      </div>

                      <p className="text-sm mb-4 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {edital.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        {edital.categories && (
                          <span className="badge badge-amber">
                            {edital.categories.icon} {edital.categories.name}
                          </span>
                        )}
                        <span className={`badge ${deadline.badge}`}>
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {deadline.label}
                        </span>
                        <span className="badge badge-slate">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          Até {formatDateLong(edital.end_date)}
                        </span>
                        {edital.prize_value !== null && edital.prize_value > 0 && (
                          <span className="badge badge-green">
                            R$ {edital.prize_value.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <nav aria-label="Paginação" className="flex items-center justify-center gap-3 mt-10">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-secondary"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }} aria-live="polite">
              Página {page} de {data.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="btn btn-secondary"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
