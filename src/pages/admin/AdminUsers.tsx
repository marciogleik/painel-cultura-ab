import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

export function AdminUsers() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'badge-red',
    ADMIN_CULTURA: 'badge-amber',
    GESTOR: 'badge-blue',
    SERVIDOR: 'badge-slate',
    ARTISTA: 'badge-green',
    USUARIO_PUBLICO: 'badge-slate',
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Usuários</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {users?.length ?? 0} usuários cadastrados
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4">
              <div className="skeleton h-4 w-1/3 mb-2" />
              <div className="skeleton h-3 w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
          {users?.map((user: any) => (
            <div key={user.id} className="flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
                >
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {(user.full_name ?? '?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Desde {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`badge text-xs ${roleColors[user.role] ?? 'badge-slate'}`}>
                  {user.role?.replace('_', ' ')}
                </span>
                {!user.is_active && (
                  <span className="badge badge-red text-xs">Inativo</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
