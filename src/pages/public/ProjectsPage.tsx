import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GraduationCap, Calendar, UserRound, Globe, Handshake } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sanitizeSearch, safeUrl, formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonGrid } from '@/components/ui/Spinner'

type ProjectStatus = 'em_andamento' | 'concluido' | 'planejamento' | 'suspenso'

interface CulturalProject {
  id: string
  title: string
  status: ProjectStatus
  description: string | null
  coordinator: string | null
  website: string | null
  partners: string | null
  start_date: string | null
  end_date: string | null
  cover_url: string | null
}

const STATUS: Record<ProjectStatus, { label: string; badge: string }> = {
  em_andamento: { label: 'Em andamento', badge: 'badge-green' },
  concluido: { label: 'Concluído', badge: 'badge-slate' },
  planejamento: { label: 'Em planejamento', badge: 'badge-blue' },
  suspenso: { label: 'Suspenso', badge: 'badge-red' },
}

export function ProjectsPage() {
  const [search, setSearch] = useState('')

  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['cultural_projects', search],
    queryFn: async () => {
      let q = supabase
        .from('cultural_projects')
        .select('id, title, status, description, coordinator, website, partners, start_date, end_date, cover_url')
        .eq('is_public', true)
        .order('start_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      const term = sanitizeSearch(search)
      if (term) q = q.ilike('title', `%${term}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as CulturalProject[]
    },
    placeholderData: (prev) => prev,
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <PageHeader
        variant="public"
        icon={GraduationCap}
        eyebrow="Políticas culturais"
        title="Projetos Culturais"
        description="Iniciativas e programas culturais do município"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <SearchInput
          className="mb-8 max-w-md"
          value={search}
          onChange={setSearch}
          label="Buscar projeto"
          placeholder="Buscar por título..."
        />

        {isLoading ? (
          <SkeletonGrid items={6} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : items && items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const status = STATUS[item.status] ?? { label: item.status, badge: 'badge-slate' }
              const site = safeUrl(item.website)
              return (
                <article key={item.id} className="card group overflow-hidden transition-all hover:-translate-y-1">
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
                        <GraduationCap size={40} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <span className={`badge ${status.badge} mb-2`}>{status.label}</span>
                    <h2 className="font-bold text-base leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>{item.title}</h2>
                    <ul className="space-y-1 text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                      {(item.start_date || item.end_date) && (
                        <li className="flex items-center gap-2">
                          <Calendar size={14} className="flex-shrink-0" aria-hidden="true" />
                          <span>
                            {item.start_date ? formatDate(item.start_date) : '—'}
                            {item.end_date ? ` até ${formatDate(item.end_date)}` : ''}
                          </span>
                        </li>
                      )}
                      {item.coordinator && (
                        <li className="flex items-center gap-2">
                          <UserRound size={14} className="flex-shrink-0" aria-hidden="true" />
                          <span>{item.coordinator}</span>
                        </li>
                      )}
                      {item.partners && (
                        <li className="flex items-start gap-2">
                          <Handshake size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <span>{item.partners}</span>
                        </li>
                      )}
                      {site && (
                        <li className="flex items-center gap-2">
                          <Globe size={14} className="flex-shrink-0" aria-hidden="true" />
                          <a href={site} target="_blank" rel="noopener noreferrer" className="hover:underline truncate" style={{ color: 'var(--accent)' }}>
                            {site.replace(/^https?:\/\//, '')}
                          </a>
                        </li>
                      )}
                    </ul>
                    {item.description && (
                      <p className="text-sm line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : search ? (
          <EmptyState
            icon={GraduationCap}
            title="Nenhum projeto encontrado"
            description={`Não encontramos resultados para "${search}".`}
            action={<button type="button" className="btn btn-secondary" onClick={() => setSearch('')}>Limpar busca</button>}
          />
        ) : (
          <EmptyState
            icon={GraduationCap}
            title="Nenhum projeto cadastrado ainda"
            description="Em breve os projetos culturais do município estarão aqui."
          />
        )}
      </div>
    </div>
  )
}
