import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, MapPin, Phone, Globe, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sanitizeSearch, safeUrl, formatPhone } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonGrid } from '@/components/ui/Spinner'

type SpaceType = 'teatro' | 'museu' | 'biblioteca' | 'centro_cultural' | 'galeria' | 'sala_ensaio' | 'espaco_publico' | 'outro'

interface CulturalSpace {
  id: string
  name: string
  type: SpaceType | null
  description: string | null
  address: string | null
  phone: string | null
  website: string | null
  capacity: number | null
  photo_url: string | null
}

const TYPE_LABELS: Record<SpaceType, string> = {
  teatro: 'Teatro',
  museu: 'Museu',
  biblioteca: 'Biblioteca',
  centro_cultural: 'Centro Cultural',
  galeria: 'Galeria',
  sala_ensaio: 'Sala de Ensaio',
  espaco_publico: 'Espaço Público',
  outro: 'Espaço Cultural',
}

export function SpacesPage() {
  const [search, setSearch] = useState('')

  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['cultural_spaces', search],
    queryFn: async () => {
      let q = supabase
        .from('cultural_spaces')
        .select('id, name, type, description, address, phone, website, capacity, photo_url')
        .eq('is_active', true)
        .order('name')
      const term = sanitizeSearch(search)
      if (term) q = q.ilike('name', `%${term}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as CulturalSpace[]
    },
    placeholderData: (prev) => prev,
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <PageHeader
        variant="public"
        icon={Building2}
        eyebrow="Mapa cultural"
        title="Espaços Culturais"
        description="Teatros, museus, centros culturais e espaços de arte de Água Boa"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <SearchInput
          className="mb-8 max-w-md"
          value={search}
          onChange={setSearch}
          label="Buscar espaço cultural"
          placeholder="Buscar por nome..."
        />

        {isLoading ? (
          <SkeletonGrid items={6} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : items && items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const site = safeUrl(item.website)
              return (
                <article key={item.id} className="card group overflow-hidden transition-all hover:-translate-y-1">
                  <div className="aspect-video overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 size={40} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    {item.type && <span className="badge badge-blue mb-2">{TYPE_LABELS[item.type] ?? item.type}</span>}
                    <h2 className="font-bold text-base leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>{item.name}</h2>
                    {item.description && (
                      <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                    )}
                    <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {item.address && (
                        <li className="flex items-start gap-2">
                          <MapPin size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <span>{item.address}</span>
                        </li>
                      )}
                      {item.phone && (
                        <li className="flex items-center gap-2">
                          <Phone size={14} className="flex-shrink-0" aria-hidden="true" />
                          <a href={`tel:${item.phone.replace(/\D/g, '')}`} className="hover:underline">{formatPhone(item.phone)}</a>
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
                      {item.capacity !== null && item.capacity > 0 && (
                        <li className="flex items-center gap-2">
                          <Users size={14} className="flex-shrink-0" aria-hidden="true" />
                          <span>Capacidade: {item.capacity.toLocaleString('pt-BR')} pessoas</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </article>
              )
            })}
          </div>
        ) : search ? (
          <EmptyState
            icon={Building2}
            title="Nenhum espaço encontrado"
            description={`Não encontramos resultados para "${search}".`}
            action={<button type="button" className="btn btn-secondary" onClick={() => setSearch('')}>Limpar busca</button>}
          />
        ) : (
          <EmptyState
            icon={Building2}
            title="Nenhum espaço cadastrado ainda"
            description="Em breve os espaços culturais do município estarão aqui."
          />
        )}
      </div>
    </div>
  )
}
