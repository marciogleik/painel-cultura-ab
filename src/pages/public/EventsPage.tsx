import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, MapPin, Clock, Ticket } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sanitizeSearch, safeUrl, formatDateTime, parseDate } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonGrid } from '@/components/ui/Spinner'

type EventType = 'show' | 'peca_teatro' | 'exposicao' | 'festival' | 'oficina' | 'feira' | 'outro'

interface CulturalEvent {
  id: string
  title: string
  type: EventType | null
  description: string | null
  location: string | null
  start_date: string
  end_date: string | null
  is_free: boolean
  price: number | null
  ticket_link: string | null
  cover_url: string | null
}

const TYPE_LABELS: Record<EventType, string> = {
  show: 'Show',
  peca_teatro: 'Peça de Teatro',
  exposicao: 'Exposição',
  festival: 'Festival',
  oficina: 'Oficina',
  feira: 'Feira',
  outro: 'Evento',
}

function priceLabel(event: CulturalEvent): string {
  if (event.is_free || !event.price) return 'Gratuito'
  return `R$ ${event.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function EventCard({ event, past }: { event: CulturalEvent; past?: boolean }) {
  const ticket = safeUrl(event.ticket_link)
  return (
    <article className={`card group overflow-hidden transition-all hover:-translate-y-1 ${past ? 'opacity-80' : ''}`}>
      <div className="aspect-video overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
        {event.cover_url ? (
          <img
            src={event.cover_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar size={40} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-2 mb-2">
          {event.type && <span className="badge badge-blue">{TYPE_LABELS[event.type] ?? event.type}</span>}
          <span className={`badge ${event.is_free || !event.price ? 'badge-green' : 'badge-amber'}`}>{priceLabel(event)}</span>
          {past && <span className="badge badge-slate">Realizado</span>}
        </div>
        <h3 className="font-bold text-base leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>{event.title}</h3>
        <ul className="space-y-1 text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex items-center gap-2">
            <Clock size={14} className="flex-shrink-0" aria-hidden="true" />
            <time dateTime={event.start_date}>{formatDateTime(event.start_date)}</time>
            {event.end_date && (
              <>
                <span aria-hidden="true">–</span>
                <time dateTime={event.end_date}>{formatDateTime(event.end_date)}</time>
              </>
            )}
          </li>
          {event.location && (
            <li className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{event.location}</span>
            </li>
          )}
        </ul>
        {event.description && (
          <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>
        )}
        {ticket && !past && (
          <a href={ticket} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm mt-4 w-full justify-center">
            <Ticket size={14} aria-hidden="true" />
            Ingressos / mais informações
          </a>
        )}
      </div>
    </article>
  )
}

export function EventsPage() {
  const [search, setSearch] = useState('')

  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['cultural_events', search],
    queryFn: async () => {
      let q = supabase
        .from('cultural_events')
        .select('id, title, type, description, location, start_date, end_date, is_free, price, ticket_link, cover_url')
        .eq('is_active', true)
        .order('start_date', { ascending: true })
      const term = sanitizeSearch(search)
      if (term) q = q.ilike('title', `%${term}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as CulturalEvent[]
    },
    placeholderData: (prev) => prev,
  })

  const { upcoming, past } = useMemo(() => {
    const now = Date.now()
    const upcoming: CulturalEvent[] = []
    const past: CulturalEvent[] = []
    for (const ev of items ?? []) {
      const end = parseDate(ev.end_date ?? ev.start_date)
      if (end && end.getTime() < now) past.push(ev)
      else upcoming.push(ev)
    }
    // Já realizados: os mais recentes primeiro
    past.reverse()
    return { upcoming, past }
  }, [items])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <PageHeader
        variant="public"
        icon={Calendar}
        eyebrow="Agenda cultural"
        title="Eventos Culturais"
        description="Shows, peças, festivais e exposições em Água Boa"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <SearchInput
          className="mb-8 max-w-md"
          value={search}
          onChange={setSearch}
          label="Buscar evento"
          placeholder="Buscar por título..."
        />

        {isLoading ? (
          <SkeletonGrid items={6} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (items?.length ?? 0) === 0 ? (
          search ? (
            <EmptyState
              icon={Calendar}
              title="Nenhum evento encontrado"
              description={`Não encontramos resultados para "${search}".`}
              action={<button type="button" className="btn btn-secondary" onClick={() => setSearch('')}>Limpar busca</button>}
            />
          ) : (
            <EmptyState
              icon={Calendar}
              title="Nenhum evento cadastrado ainda"
              description="Em breve a agenda cultural do município estará aqui."
            />
          )
        ) : (
          <>
            <section aria-labelledby="proximos-eventos">
              <h2 id="proximos-eventos" className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Próximos eventos
              </h2>
              {upcoming.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcoming.map((ev) => <EventCard key={ev.id} event={ev} />)}
                </div>
              ) : (
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Nenhum evento programado no momento.
                </p>
              )}
            </section>

            {past.length > 0 && (
              <section aria-labelledby="eventos-realizados" className="mt-12">
                <h2 id="eventos-realizados" className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Já realizados
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {past.map((ev) => <EventCard key={ev.id} event={ev} past />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
