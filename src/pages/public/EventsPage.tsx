import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Calendar, Search } from 'lucide-react'
import { useState } from 'react'

export function EventsPage() {
  const [search, setSearch] = useState('')

  const { data: items, isLoading } = useQuery({
    queryKey: ['cultural_events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cultural_events')
        .select('id, title, type, description, location, start_date, end_date, is_free, cover_url')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const filtered = items?.filter((item: any) =>
    item.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div style={{ background: 'var(--bg-inst-header)', borderBottom: '3px solid var(--accent)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={32} style={{ color: 'var(--accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-inst-title)' }}>Eventos Culturais</h1>
          </div>
          <p style={{ color: 'var(--text-inst-subtitle)' }}>Shows, peças, festivais e exposições em Água Boa</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="input pl-10 w-full" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border animate-pulse" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', height: 240 }} />
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item: any) => (
              <div key={item.id} className="group rounded-2xl overflow-hidden border transition-all hover:shadow-lg hover:-translate-y-1" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="aspect-video overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                  {item.cover_url ?? item.photo_url ? (
                    <img src={item.cover_url ?? item.photo_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar size={40} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-base leading-snug mb-1" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                  {item.location && <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{item.location}</p>}
                  {item.description && <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Calendar size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhum item cadastrado ainda</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Em breve novidades aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}
