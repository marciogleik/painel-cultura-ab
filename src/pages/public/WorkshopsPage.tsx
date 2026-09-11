import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Wrench, ClipboardList, Clock, MapPin, Users, UserRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sanitizeSearch } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonGrid } from '@/components/ui/Spinner'

type TargetAudience = 'crianca' | 'adolescente' | 'adulto' | 'todos'

interface CulturalWorkshop {
  id: string
  title: string
  category: string | null
  description: string | null
  instructor: string | null
  location: string | null
  schedule: string | null
  duration: string | null
  is_free: boolean
  price: number | null
  vacancies: number | null
  target_audience: TargetAudience | null
  cover_url: string | null
}

const AUDIENCE_LABELS: Record<TargetAudience, string> = {
  crianca: 'Crianças',
  adolescente: 'Adolescentes',
  adulto: 'Adultos',
  todos: 'Todos os públicos',
}

function priceLabel(w: CulturalWorkshop): string {
  if (w.is_free || !w.price) return 'Gratuito'
  return `R$ ${w.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

export function WorkshopsPage() {
  const [search, setSearch] = useState('')

  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['cultural_workshops', search],
    queryFn: async () => {
      let q = supabase
        .from('cultural_workshops')
        .select('id, title, category, description, instructor, location, schedule, duration, is_free, price, vacancies, target_audience, cover_url')
        .eq('is_active', true)
        .order('title')
      const term = sanitizeSearch(search)
      if (term) q = q.or(`title.ilike.%${term}%,instructor.ilike.%${term}%,category.ilike.%${term}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as CulturalWorkshop[]
    },
    placeholderData: (prev) => prev,
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <PageHeader
        variant="public"
        icon={Wrench}
        eyebrow="Formação e capacitação"
        title="Oficinas Culturais"
        description="Cursos, workshops e capacitações em arte e cultura"
        actions={
          <Link to="/oficinas/matricula" className="btn btn-primary shrink-0">
            <ClipboardList size={16} aria-hidden="true" /> Ficha de Matrícula
          </Link>
        }
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <SearchInput
          className="mb-8 max-w-md"
          value={search}
          onChange={setSearch}
          label="Buscar oficina"
          placeholder="Buscar por título, instrutor ou categoria..."
        />

        {isLoading ? (
          <SkeletonGrid items={6} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : items && items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <article key={item.id} className="card group overflow-hidden flex flex-col transition-all hover:-translate-y-1">
                <div className="aspect-video overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                  {item.cover_url ? (
                    <img
                      src={item.cover_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Wrench size={40} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {item.category && <span className="badge badge-blue">{item.category}</span>}
                    <span className={`badge ${item.is_free || !item.price ? 'badge-green' : 'badge-amber'}`}>{priceLabel(item)}</span>
                    {item.target_audience && (
                      <span className="badge badge-slate">{AUDIENCE_LABELS[item.target_audience] ?? item.target_audience}</span>
                    )}
                  </div>
                  <h2 className="font-bold text-base leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>{item.title}</h2>
                  <ul className="space-y-1 text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {item.instructor && (
                      <li className="flex items-center gap-2">
                        <UserRound size={14} className="flex-shrink-0" aria-hidden="true" />
                        <span>{item.instructor}</span>
                      </li>
                    )}
                    {item.schedule && (
                      <li className="flex items-start gap-2">
                        <Clock size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span>{item.schedule}{item.duration ? ` · ${item.duration}` : ''}</span>
                      </li>
                    )}
                    {item.location && (
                      <li className="flex items-start gap-2">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span>{item.location}</span>
                      </li>
                    )}
                    {item.vacancies !== null && (
                      <li className="flex items-center gap-2">
                        <Users size={14} className="flex-shrink-0" aria-hidden="true" />
                        <span>{item.vacancies > 0 ? `${item.vacancies} vagas` : 'Vagas esgotadas'}</span>
                      </li>
                    )}
                  </ul>
                  {item.description && (
                    <p className="text-sm line-clamp-2 mb-4" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                  )}
                  <Link
                    to={`/oficinas/${item.id}/matricula`}
                    className="btn btn-primary w-full text-sm py-2 justify-center mt-auto"
                    aria-label={`Ficha de matrícula: ${item.title}`}
                  >
                    <ClipboardList size={14} aria-hidden="true" /> Ficha de Matrícula
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : search ? (
          <EmptyState
            icon={Wrench}
            title="Nenhuma oficina encontrada"
            description={`Não encontramos resultados para "${search}".`}
            action={<button type="button" className="btn btn-secondary" onClick={() => setSearch('')}>Limpar busca</button>}
          />
        ) : (
          <EmptyState
            icon={Wrench}
            title="Nenhuma oficina cadastrada ainda"
            description="Em breve as oficinas e escolinhas do município estarão aqui."
          />
        )}
      </div>
    </div>
  )
}
