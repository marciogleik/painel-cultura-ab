import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Bell, CheckCheck, Users, Info } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const TYPE_ICON: Record<string, React.ReactNode> = {
  membership_invite: <Users size={14} className="text-violet-400" />,
  membership_accepted: <Users size={14} className="text-emerald-400" />,
  membership_rejected: <Users size={14} className="text-red-400" />,
  status_change: <CheckCheck size={14} className="text-amber-400" />,
  general: <Info size={14} className="text-blue-400" />,
}

export function NotificationBell() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data } = await supabase
        .from('agent_notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      return data ?? []
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // poll every 30s
  })

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length ?? 0

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return
      await supabase
        .from('agent_notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('agent_notifications').update({ is_read: true }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const acceptMembership = useMutation({
    mutationFn: async ({ membershipId, notifId }: { membershipId: string; notifId: string }) => {
      await supabase
        .from('agent_memberships')
        .update({ invite_status: 'accepted' })
        .eq('id', membershipId)
      await supabase.from('agent_notifications').update({ is_read: true }).eq('id', notifId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['my-agents'] })
    },
  })

  const rejectMembership = useMutation({
    mutationFn: async ({ membershipId, notifId }: { membershipId: string; notifId: string }) => {
      await supabase
        .from('agent_memberships')
        .update({ invite_status: 'rejected' })
        .eq('id', membershipId)
      await supabase.from('agent_notifications').delete().eq('id', notifId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['my-agents'] })
    },
  })

  return (
    <div ref={ref} className="relative">
      <button
        id="notification-bell"
        onClick={() => {
          setOpen((o) => !o)
        }}
        className="relative p-2 rounded-lg transition-colors hover:bg-white/10"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Notificações"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white animate-pulse"
            style={{ background: 'var(--error)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notificações {unreadCount > 0 && <span className="text-xs text-red-400">({unreadCount} novas)</span>}
            </p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs hover:opacity-70 transition-opacity"
                style={{ color: 'var(--accent)' }}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={28} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b transition-colors"
                  style={{
                    borderColor: 'var(--border)',
                    background: n.is_read ? 'transparent' : 'rgba(245,158,11,0.05)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {TYPE_ICON[n.type] ?? TYPE_ICON.general}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        {formatDateTime(n.created_at)}
                      </p>

                      {/* Convite de vínculo — botões de aceitar/rejeitar */}
                      {n.type === 'membership_invite' && n.meta?.membership_id && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => acceptMembership.mutate({
                              membershipId: n.meta.membership_id,
                              notifId: n.id,
                            })}
                            disabled={acceptMembership.isPending}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                            style={{ background: 'var(--success)', color: '#fff' }}
                          >
                            ✓ Aceitar
                          </button>
                          <button
                            onClick={() => rejectMembership.mutate({
                              membershipId: n.meta.membership_id,
                              notifId: n.id,
                            })}
                            disabled={rejectMembership.isPending}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                            style={{ background: 'var(--error)', color: '#fff' }}
                          >
                            ✗ Recusar
                          </button>
                        </div>
                      )}
                    </div>
                    {!n.is_read && n.type !== 'membership_invite' && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="text-[10px] shrink-0 hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
