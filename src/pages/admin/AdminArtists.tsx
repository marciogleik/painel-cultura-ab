import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Star, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AdminArtists() {
  const { data: artists, isLoading } = useQuery({
    queryKey: ['admin-artists'],
    queryFn: async () => {
      const { data } = await supabase
        .from('artists')
        .select('*, profiles(full_name, phone), categories(name, icon), subcategories(name)')
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Artistas Cadastrados</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {artists?.length ?? 0} artistas no banco de talentos
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4">
              <div className="flex gap-3">
                <div className="skeleton h-12 w-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {artists?.map((artist: any) => (
            <div key={artist.id} className="card p-4">
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
                >
                  {artist.photo_url ? (
                    <img src={artist.photo_url} className="h-12 w-12 rounded-full object-cover" alt="" />
                  ) : (
                    <span className="font-bold text-slate-900 dark:text-white">
                      {(artist.artistic_name ?? artist.profiles?.full_name ?? '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {artist.artistic_name ?? artist.profiles?.full_name}
                    </p>
                    {artist.is_verified && <Star className="h-3.5 w-3.5 text-amber-400 fill-current flex-shrink-0" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {artist.categories && (
                      <span className="badge badge-amber text-xs">{artist.categories.icon} {artist.categories.name}</span>
                    )}
                    <span className={`badge text-xs ${artist.status === 'ATIVO' ? 'badge-green' : 'badge-slate'}`}>
                      {artist.status}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <MapPin size={10} />
                      {artist.city}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/artistas/${artist.id}`}
                  target="_blank"
                  className="btn btn-ghost text-xs"
                >
                  Ver perfil
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
