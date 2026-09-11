import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAgentMembers,
  inviteMemberToAgent,
  respondAgentRequest,
  removeAgentMember,
} from '@/services/culturalAgentService'
import { Users, UserPlus, User, X, Check, Clock, Trash2, Mail, Sparkles } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useConfirm, LoadingButton } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { errorMessage } from '@/lib/utils'
import { Field } from './Field'
import { ROLE_LABELS } from './agentStatus'
import type { AgentMembership, AgentMembershipRole } from '@/types'

interface AgentMembersSectionProps {
  agentId: string
  agentName: string
  isCollective: boolean
  isManager: boolean
}

type InviteRole = Exclude<AgentMembershipRole, 'owner'>

export function AgentMembersSection({ agentId, agentName, isCollective, isManager }: AgentMembersSectionProps) {
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()

  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteRole>('member')
  const [inviteArtistRole, setInviteArtistRole] = useState('')
  const [inviteError, setInviteError] = useState('')

  const { data: members = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['agent-members', agentId],
    queryFn: () => getAgentMembers(agentId),
    enabled: !!agentId,
  })

  const acceptedMembers = members.filter((m) => m.invite_status === 'accepted')
  const pendingRequests = members.filter((m) => m.invite_status === 'requested')
  const pendingInvites = members.filter((m) => m.invite_status === 'pending')

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['agent-members', agentId] })
    qc.invalidateQueries({ queryKey: ['agent-detail', agentId] })
  }

  const closeInvite = () => {
    setInviteModalOpen(false)
    setInviteEmail('')
    setInviteArtistRole('')
    setInviteRole('member')
    setInviteError('')
  }

  const inviteMutation = useMutation({
    mutationFn: () => inviteMemberToAgent(agentId, inviteEmail.trim(), inviteRole, inviteArtistRole.trim() || undefined),
    onSuccess: () => {
      invalidate()
      toast.success('Convite enviado. O artista receberá uma notificação no sistema e por e-mail.')
      closeInvite()
    },
    onError: (err: unknown) => {
      setInviteError(errorMessage(err, 'Não foi possível enviar o convite.'))
    },
  })

  const respondRequestMutation = useMutation({
    mutationFn: ({ membershipId, accept }: { membershipId: string; accept: boolean }) =>
      respondAgentRequest(membershipId, accept),
    onSuccess: (_, variables) => {
      invalidate()
      if (variables.accept) toast.success('Solicitação aprovada. O artista agora faz parte do grupo.')
      else toast.info('Solicitação recusada.')
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Não foi possível processar a solicitação.')),
  })

  const removeMutation = useMutation({
    mutationFn: (membershipId: string) => removeAgentMember(membershipId),
    onSuccess: () => {
      invalidate()
      toast.success('Vínculo removido.')
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Não foi possível remover o vínculo.')),
  })

  async function handleRemove(m: AgentMembership) {
    const isInvite = m.invite_status === 'pending'
    const name = m.profiles?.full_name || 'este integrante'
    const ok = await confirm({
      title: isInvite ? 'Cancelar convite?' : 'Remover integrante?',
      message: isInvite
        ? 'Deseja cancelar o convite enviado para este artista?'
        : `Tem certeza que deseja remover ${name} do elenco/grupo?`,
      confirmLabel: isInvite ? 'Cancelar convite' : 'Remover',
      danger: true,
    })
    if (ok) removeMutation.mutate(m.id)
  }

  const submitInvite = (e: React.FormEvent) => {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) {
      setInviteError('Informe o e-mail do artista.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Informe um e-mail válido.')
      return
    }
    setInviteError('')
    inviteMutation.mutate()
  }

  return (
    <section className="card p-5 mb-4" style={{ border: '1px solid var(--border)' }} aria-labelledby="members-title">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Users size={16} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <div>
            <h3 id="members-title" className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              {isCollective ? 'Elenco e Integrantes da Companhia' : 'Membros e Colaboradores'}
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isCollective
                ? 'Artistas, dançarinos, atores e técnicos vinculados ao grupo.'
                : 'Pessoas autorizadas a colaborar neste agente cultural.'}
            </p>
          </div>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow"
          >
            <UserPlus size={14} aria-hidden="true" />
            <span>Convidar por e-mail</span>
          </button>
        )}
      </div>

      {isLoading && <SkeletonList rows={2} />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}

      {/* 1. Solicitações de entrada */}
      {!isLoading && isManager && pendingRequests.length > 0 && (
        <div
          className="mb-5 p-4 rounded-xl border"
          style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'var(--accent)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-amber-500" aria-hidden="true" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Solicitações de Entrada ({pendingRequests.length})
            </h4>
            <span className="badge badge-amber text-[10px] ml-auto">Requer sua aprovação</span>
          </div>

          <ul className="space-y-2.5 list-none p-0 m-0">
            {pendingRequests.map((req) => (
              <li
                key={req.id}
                className="p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <Avatar url={req.profiles?.avatar_url} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {req.profiles?.full_name || 'Artista'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-xs mt-0.5">
                      {req.artist_role && <span className="badge badge-amber text-[10px]">{req.artist_role}</span>}
                      {req.profiles?.phone && (
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Tel: {req.profiles.phone}</span>
                      )}
                    </div>
                    {req.message && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--text-secondary)' }}>“{req.message}”</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <LoadingButton
                    type="button"
                    onClick={() => respondRequestMutation.mutate({ membershipId: req.id, accept: true })}
                    loading={respondRequestMutation.isPending && respondRequestMutation.variables?.membershipId === req.id && respondRequestMutation.variables.accept}
                    disabled={respondRequestMutation.isPending}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Check size={14} aria-hidden="true" />
                    <span>Aprovar</span>
                  </LoadingButton>
                  <LoadingButton
                    type="button"
                    onClick={() => respondRequestMutation.mutate({ membershipId: req.id, accept: false })}
                    loading={respondRequestMutation.isPending && respondRequestMutation.variables?.membershipId === req.id && !respondRequestMutation.variables.accept}
                    disabled={respondRequestMutation.isPending}
                    className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <X size={14} aria-hidden="true" />
                    <span>Recusar</span>
                  </LoadingButton>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. Convites aguardando aceite */}
      {!isLoading && isManager && pendingInvites.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <Clock size={12} aria-hidden="true" />
            <span>Convites enviados aguardando resposta ({pendingInvites.length})</span>
          </h4>
          <ul className="space-y-1.5 list-none p-0 m-0">
            {pendingInvites.map((inv) => (
              <li
                key={inv.id}
                className="p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs"
                style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Mail size={14} className="text-amber-500 flex-shrink-0" aria-hidden="true" />
                  <div className="truncate">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {inv.profiles?.full_name || 'Usuário convidado'}
                    </span>
                    {inv.artist_role && (
                      <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {inv.artist_role}
                      </span>
                    )}
                    <span className="ml-2" style={{ color: 'var(--text-muted)' }}>({ROLE_LABELS[inv.role]})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-500 font-medium">Aguardando aceite</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(inv)}
                    disabled={removeMutation.isPending}
                    className="p-1 rounded transition-colors cursor-pointer hover:text-red-400"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label={`Cancelar convite de ${inv.profiles?.full_name || 'usuário'}`}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Integrantes ativos */}
      {!isLoading && !isError && (
        acceptedMembers.length === 0 ? (
          <div className="py-6 text-center rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <Users size={28} className="mx-auto mb-2 opacity-40" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Nenhum integrante vinculado ainda.
            </p>
            {isManager && (
              <button
                type="button"
                onClick={() => setInviteModalOpen(true)}
                className="mt-2 text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
              >
                + Convidar o primeiro artista
              </button>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 list-none p-0 m-0">
            {acceptedMembers.map((member) => (
              <li
                key={member.id}
                className="p-3 rounded-xl flex items-center justify-between gap-3 border"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar url={member.profiles?.avatar_url} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {member.profiles?.full_name || 'Integrante'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {member.artist_role && (
                        <span className="text-[10px] font-semibold text-amber-500 px-1.5 rounded bg-amber-500/10">
                          {member.artist_role}
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {ROLE_LABELS[member.role]}
                      </span>
                    </div>
                  </div>
                </div>

                {isManager && member.role !== 'owner' && (
                  <button
                    type="button"
                    onClick={() => handleRemove(member)}
                    disabled={removeMutation.isPending}
                    className="p-1.5 rounded-lg hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex-shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label={`Remover ${member.profiles?.full_name || 'integrante'} do grupo`}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )
      )}

      {/* Modal: convidar por e-mail */}
      <Modal
        open={inviteModalOpen}
        onClose={closeInvite}
        locked={inviteMutation.isPending}
        size="sm"
        title="Convidar artista"
        description={
          <>O artista receberá um convite no painel da plataforma e uma notificação por e-mail para integrar <strong>{agentName}</strong>.</>
        }
        footer={
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={closeInvite} disabled={inviteMutation.isPending} className="btn btn-secondary text-xs px-4">
              Cancelar
            </button>
            <LoadingButton type="submit" form="invite-member-form" loading={inviteMutation.isPending} className="btn btn-primary text-xs px-4">
              <UserPlus size={14} aria-hidden="true" />
              Enviar convite
            </LoadingButton>
          </div>
        }
      >
        <form id="invite-member-form" onSubmit={submitInvite} className="space-y-4" noValidate>
          <Field
            label="E-mail do artista"
            required
            error={inviteError}
            hint="Informe o mesmo e-mail que o artista usa para entrar na plataforma."
          >
            <input
              type="email"
              autoComplete="email"
              placeholder="artista@email.com"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteError('') }}
              className={`input text-sm ${inviteError ? 'input-error' : ''}`}
              autoFocus
            />
          </Field>

          <Field label="Função / papel artístico no grupo" optional>
            <input
              type="text"
              placeholder="Ex.: Atriz, Bailarino, Músico, Cenógrafo"
              value={inviteArtistRole}
              maxLength={80}
              onChange={(e) => setInviteArtistRole(e.target.value)}
              className="input text-sm"
            />
          </Field>

          <Field label="Nível de permissão">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value === 'admin' ? 'admin' : e.target.value === 'viewer' ? 'viewer' : 'member')}
              className="input text-sm"
            >
              <option value="member">{ROLE_LABELS.member} — participa do elenco/grupo</option>
              <option value="admin">{ROLE_LABELS.admin} — gerencia integrantes e cadastro</option>
              <option value="viewer">{ROLE_LABELS.viewer} — apenas visualiza</option>
            </select>
          </Field>
        </form>
      </Modal>
    </section>
  )
}

function Avatar({ url }: { url?: string | null }) {
  return (
    <div
      className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <User size={18} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
      )}
    </div>
  )
}
