import { useState, useRef, useEffect, useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Users, Info, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { errorMessage, formatDateTime } from '@/lib/utils'
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  respondAgentRequest,
  respondToInvite,
} from '@/services/culturalAgentService'
import type { AgentNotification } from '@/types'

type NotificationType = AgentNotification['type']

const TYPE_ICON: Record<NotificationType, ReactNode> = {
  membership_invite: <Users size={14} className="text-violet-400" aria-hidden="true" />,
  membership_request: <Users size={14} className="text-amber-400" aria-hidden="true" />,
  membership_accepted: <Users size={14} className="text-emerald-400" aria-hidden="true" />,
  membership_rejected: <Users size={14} className="text-red-400" aria-hidden="true" />,
  status_change: <CheckCheck size={14} className="text-amber-400" aria-hidden="true" />,
  general: <Info size={14} className="text-blue-400" aria-hidden="true" />,
}

interface RespondVars {
  membershipId: string
  notifId: string
  type: NotificationType
  accept: boolean
}

/** Convite ou solicitação de vínculo ainda pendente de resposta */
function isActionable(n: AgentNotification): n is AgentNotification & { meta: { membership_id: string } } {
  return (n.type === 'membership_invite' || n.type === 'membership_request') && !!n.meta?.membership_id && !n.is_read
}

export function NotificationBell() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  // Fecha ao clicar fora ou com Esc
  useEffect(() => {
    if (!open) return
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onClickOut)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOut)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getMyNotifications(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
  const notifications = notificationsQuery.data ?? []
  const unreadCount = notifications.filter((n) => !n.is_read).length

  function invalidate(membership = false) {
    qc.invalidateQueries({ queryKey: ['notifications'] })
    if (membership) {
      qc.invalidateQueries({ queryKey: ['my-agents'] })
      qc.invalidateQueries({ queryKey: ['agent-detail'] })
      qc.invalidateQueries({ queryKey: ['agent-members'] })
    }
  }

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(errorMessage(err, 'Não foi possível marcar as notificações como lidas.')),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(errorMessage(err, 'Não foi possível marcar a notificação como lida.')),
  })

  const respond = useMutation({
    mutationFn: async ({ membershipId, notifId, type, accept }: RespondVars) => {
      if (type === 'membership_request') {
        await respondAgentRequest(membershipId, accept)
      } else {
        await respondToInvite(membershipId, accept)
      }
      await markNotificationRead(notifId)
    },
    onSuccess: (_data, vars) => {
      invalidate(true)
      if (vars.type === 'membership_request') {
        toast.success(vars.accept ? 'Solicitação aprovada.' : 'Solicitação recusada.')
      } else {
        toast.success(vars.accept ? 'Convite aceito. Você agora faz parte do agente.' : 'Convite recusado.')
      }
    },
    onError: (err) => toast.error(errorMessage(err, 'Não foi possível responder ao convite.')),
  })

  const bellLabel = unreadCount > 0
    ? `Notificações, ${unreadCount === 1 ? '1 nova' : `${unreadCount} novas`}`
    : 'Notificações'

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        id="notification-bell"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
        style={{ color: 'var(--text-secondary)' }}
        aria-label={bellLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white animate-pulse"
            style={{ background: 'var(--error)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 lg:right-auto lg:-left-4 top-10 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
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
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs hover:opacity-70 transition-opacity disabled:opacity-50"
                style={{ color: 'var(--accent)' }}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notificationsQuery.isLoading ? (
              <div className="p-4 space-y-3" aria-busy="true">
                <div className="skeleton h-12 rounded-lg" />
                <div className="skeleton h-12 rounded-lg" />
              </div>
            ) : notificationsQuery.isError ? (
              <div className="py-8 px-4 text-center" role="alert">
                <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                  {errorMessage(notificationsQuery.error, 'Não foi possível carregar as notificações.')}
                </p>
                <button type="button" onClick={() => notificationsQuery.refetch()} className="btn btn-secondary text-xs">
                  Tentar novamente
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={28} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma notificação</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const actionable = isActionable(n)
                  const agentId = n.meta?.agent_id
                  const pendingThis = respond.isPending && respond.variables?.notifId === n.id
                  return (
                    <li
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

                          {actionable && (
                            <div className="flex gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => respond.mutate({ membershipId: n.meta.membership_id, notifId: n.id, type: n.type, accept: true })}
                                disabled={respond.isPending}
                                aria-busy={pendingThis}
                                className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50"
                                style={{ background: 'var(--success)', color: '#fff' }}
                              >
                                {n.type === 'membership_request' ? 'Aprovar' : 'Aceitar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => respond.mutate({ membershipId: n.meta.membership_id, notifId: n.id, type: n.type, accept: false })}
                                disabled={respond.isPending}
                                aria-busy={pendingThis}
                                className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50"
                                style={{ background: 'var(--error)', color: '#fff' }}
                              >
                                Recusar
                              </button>
                            </div>
                          )}

                          {agentId && !actionable && (
                            <Link
                              to={`/painel/agentes/${agentId}`}
                              onClick={() => {
                                setOpen(false)
                                if (!n.is_read) markRead.mutate(n.id)
                              }}
                              className="inline-flex items-center gap-1 text-xs mt-2 font-medium hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--accent)' }}
                            >
                              Ver agente
                              <ArrowRight size={12} aria-hidden="true" />
                            </Link>
                          )}
                        </div>
                        {!n.is_read && !actionable && (
                          <button
                            type="button"
                            onClick={() => markRead.mutate(n.id)}
                            disabled={markRead.isPending}
                            aria-label={`Marcar "${n.title}" como lida`}
                            className="shrink-0 p-1 rounded hover:opacity-70 disabled:opacity-50"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <CheckCheck size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
