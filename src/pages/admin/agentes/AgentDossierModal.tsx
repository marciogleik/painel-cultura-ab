import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  User, MapPin, Phone, FileText, Tag, Globe, ExternalLink, Download, Layers,
  MessageSquare, ShieldCheck, Building2, Clock, Copy, Check, Map, Users,
} from 'lucide-react'
import { adminDeleteAgent, adminReviewAgent, getCurriculumUrl } from '@/services/culturalAgentService'
import { calculateAge, errorMessage, formatDate, formatDateTime, formatPhone, safeUrl, whatsappLink } from '@/lib/utils'
import type { AgentAddress, CulturalAgentWithRelations } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { ReviewFooter } from './ReviewFooter'
import { STATUS_META, documentOf, personTypeLabel, protocolOf, typologyLabel, type ReviewDecision, type TypologyPaths } from './shared'

interface AgentDossierModalProps {
  agent: CulturalAgentWithRelations | null
  typologyPaths: TypologyPaths
  isAdmin: boolean
  onClose: () => void
  /** Chamado após aprovar/devolver/suspender/excluir, para recarregar lista e contadores */
  onChanged: () => void
}

type Tab = 'sintese' | 'tipologias' | 'localizacao' | 'trajetoria' | 'governanca'

const TABS: { id: Tab; label: string }[] = [
  { id: 'sintese', label: 'Ficha síntese' },
  { id: 'tipologias', label: 'Tipologias' },
  { id: 'localizacao', label: 'Localização e contatos' },
  { id: 'trajetoria', label: 'Trajetória' },
  { id: 'governanca', label: 'Governança' },
]

const DECISION_MESSAGES: Record<ReviewDecision, string> = {
  aprovado: 'Agente homologado. O cadastro já pode aparecer no mapa cultural.',
  rejeitado: 'Cadastro devolvido ao agente com o parecer para ajustes.',
  em_analise: 'Cadastro marcado como em análise.',
  suspenso: 'Cadastro suspenso. O agente foi notificado.',
}

function mapsLink(address: AgentAddress | null | undefined): string | null {
  if (!address) return null
  const parts = [
    address.street ? `${address.street}, ${address.number || 'S/N'}` : null,
    address.neighborhood,
    address.city,
    address.state,
    'Brasil',
  ].filter(Boolean)
  return parts.length > 1 ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}` : null
}

export function AgentDossierModal({ agent, typologyPaths, isAdmin, onClose, onChanged }: AgentDossierModalProps) {
  const toast = useToast()
  const confirm = useConfirm()
  const [tab, setTab] = useState<Tab>('sintese')
  const [notes, setNotes] = useState(agent?.reviewer_notes ?? '')
  const [notesError, setNotesError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const curriculum = useQuery({
    queryKey: ['curriculum-url', agent?.curriculum_url ?? ''],
    queryFn: () => getCurriculumUrl(agent?.curriculum_url),
    enabled: !!agent?.curriculum_url,
  })

  const review = useMutation({
    mutationFn: ({ decision, text }: { decision: ReviewDecision; text?: string }) => adminReviewAgent(agent!.id, decision, text),
    onSuccess: (_, vars) => {
      toast.success(DECISION_MESSAGES[vars.decision])
      onChanged()
      onClose()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: () => adminDeleteAgent(agent!.id),
    onSuccess: () => {
      toast.success('Cadastro excluído.')
      onChanged()
      onClose()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (!agent) return null

  const busy = review.isPending || remove.isPending
  const meta = STATUS_META[agent.registration_status] ?? STATUS_META.rascunho
  const address = agent.address
  const typologies = agent.typologies ?? []
  const areas = agent.areas ?? []
  const socialLinks = agent.social_links ?? []
  const memberships = agent.memberships ?? []
  const owner = memberships.find((m) => m.role === 'owner' && m.invite_status === 'accepted') ?? memberships[0]
  const age = calculateAge(agent.birth_date)
  const wa = whatsappLink(agent.phone, `Olá ${agent.display_name ?? ''}, aqui é da Secretaria Municipal de Cultura de Água Boa/MT, sobre o seu cadastro no SMIIC.`)
  const maps = mapsLink(address)
  const document = agent.person_type === 'juridica' ? agent.cnpj : agent.cpf

  async function decide(decision: ReviewDecision) {
    const text = notes.trim()
    if (decision === 'rejeitado' && !text) {
      setNotesError('Informe no parecer o que o agente deve corrigir.')
      return
    }
    setNotesError(null)
    if (decision === 'suspenso') {
      const ok = await confirm({ title: 'Suspender este cadastro?', message: 'O agente deixa de aparecer no mapa cultural até ser aprovado novamente.', danger: true, confirmLabel: 'Suspender' })
      if (!ok) return
    }
    review.mutate({ decision, text: text || undefined })
  }

  async function onDelete() {
    const ok = await confirm({
      title: `Excluir o cadastro de ${agent!.display_name || 'este agente'}?`,
      message: 'Todos os dados do agente (endereço, tipologias, membros, inscrições) serão apagados. Esta ação não pode ser desfeita.',
      danger: true,
      confirmLabel: 'Excluir definitivamente',
    })
    if (ok) remove.mutate()
  }

  async function copyDocument() {
    if (!document) return
    try {
      await navigator.clipboard.writeText(document)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      locked={busy}
      title={agent.display_name || 'Agente sem nome artístico'}
      description={`${protocolOf(agent.id)} · ${personTypeLabel(agent)}${agent.legal_name ? ` · ${agent.legal_name}` : ''}`}
      footer={
        <ReviewFooter
          status={agent.registration_status}
          canWrite={isAdmin}
          loading={busy}
          onClose={onClose}
          onDecide={decide}
          onDelete={isAdmin ? onDelete : undefined}
        />
      }
    >
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 border-2" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--accent)' }} aria-hidden="true">
            {agent.photo_url ? <img src={agent.photo_url} alt="" className="w-full h-full object-cover" /> : <User size={28} style={{ color: 'var(--text-muted)' }} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${meta.badge} font-semibold`}>{meta.label}</span>
            <span className={`badge text-xs ${agent.is_public ? 'badge-green' : 'badge-slate'}`}>{agent.is_public ? 'Público no mapa' : 'Visibilidade restrita'}</span>
            {agent.submitted_at && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Enviado em {formatDateTime(agent.submitted_at)}</span>}
          </div>
        </div>

        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <label htmlFor="agent-review-notes" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-primary)' }}>
            Parecer técnico da Secretaria
          </label>
          <textarea
            id="agent-review-notes"
            className="input w-full resize-none"
            rows={3}
            value={notes}
            readOnly={!isAdmin}
            onChange={(e) => { setNotes(e.target.value); if (notesError) setNotesError(null) }}
            placeholder={isAdmin ? 'Observações oficiais. Ao devolver para ajustes, descreva o que o agente deve corrigir.' : 'Somente administradores registram parecer.'}
            aria-invalid={notesError ? true : undefined}
            aria-describedby={notesError ? 'agent-review-notes-error' : 'agent-review-notes-hint'}
          />
          {notesError ? (
            <p id="agent-review-notes-error" role="alert" className="text-xs mt-1" style={{ color: 'var(--error)' }}>{notesError}</p>
          ) : (
            <p id="agent-review-notes-hint" className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>O parecer fica registrado no histórico e é enviado ao agente por notificação.</p>
          )}
        </div>

        <div role="tablist" aria-label="Seções do dossiê" className="flex gap-1 overflow-x-auto border-b" style={{ borderColor: 'var(--border)' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`py-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent'}`}
              style={tab === t.id ? undefined : { color: 'var(--text-secondary)' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'sintese' && (
          <div className="space-y-5">
            <Block icon={<Building2 size={15} />} title="Identificação civil e fiscal">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Fact label={agent.person_type === 'juridica' ? 'CNPJ' : 'CPF'}>
                  <span className="inline-flex items-center gap-2 font-mono">
                    {documentOf(agent)}
                    {isAdmin && document && (
                      <button type="button" onClick={copyDocument} className="p-1 rounded hover:bg-amber-500/10" aria-label={copied ? 'Documento copiado' : `Copiar ${agent.person_type === 'juridica' ? 'CNPJ' : 'CPF'}`}>
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} style={{ color: 'var(--text-muted)' }} />}
                      </button>
                    )}
                  </span>
                </Fact>
                <Fact label={agent.person_type === 'juridica' ? 'Fundação' : 'Nascimento'}>
                  {agent.birth_date ? `${formatDate(agent.birth_date)}${age != null ? ` (${age} anos)` : ''}` : 'Não informado'}
                </Fact>
                <Fact label="Gênero e raça/cor">{[agent.gender, agent.race].filter(Boolean).join(' · ') || 'Não informado'}</Fact>
                <Fact label="Titular da conta">
                  {owner?.profiles?.full_name ?? 'Não identificado'}
                  {owner?.profiles?.phone && <span className="block text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{formatPhone(owner.profiles.phone)}</span>}
                </Fact>
              </div>
            </Block>

            <Block icon={<Tag size={15} />} title={`Tipologias SMIIC (${typologies.length})`}>
              {typologies.length === 0 ? (
                <Empty>Nenhuma tipologia selecionada pelo agente.</Empty>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {typologies.map((t) => (
                    <li key={t.id} className="p-3 rounded-xl border text-xs sm:text-sm font-medium" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.25)', color: 'var(--text-primary)' }}>
                      {typologyLabel(t, typologyPaths)}
                    </li>
                  ))}
                </ul>
              )}
            </Block>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Block icon={<MapPin size={15} />} title="Endereço" action={maps && <ExtLink href={maps} icon={<Map size={12} />}>Google Maps</ExtLink>}>
                {address?.city ? (
                  <div className="space-y-0.5" style={{ color: 'var(--text-primary)' }}>
                    <p className="font-semibold">{address.street ? `${address.street}, ${address.number || 'S/N'}` : 'Logradouro não informado'}{address.complement ? ` (${address.complement})` : ''}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>Bairro: {address.neighborhood || 'não informado'}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{address.city} - {address.state}{address.cep ? ` · CEP ${address.cep}` : ''}</p>
                  </div>
                ) : (
                  <Empty>Endereço ainda não cadastrado.</Empty>
                )}
              </Block>
              <Block icon={<Phone size={15} />} title="Contato">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{agent.phone ? formatPhone(agent.phone) : 'Telefone não informado'}</span>
                  {wa && <ExtLink href={wa} icon={<MessageSquare size={12} />}>WhatsApp</ExtLink>}
                </div>
                <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Redes sociais</p>
                  {socialLinks.length === 0 ? <Empty>Nenhuma rede informada.</Empty> : (
                    <div className="flex flex-wrap gap-1.5">
                      {socialLinks.map((s) => {
                        const href = safeUrl(s.url)
                        return href ? (
                          <a key={s.id} href={href} target="_blank" rel="noopener noreferrer" className="badge badge-slate text-[11px] inline-flex items-center gap-1 hover:text-amber-500">
                            <ExternalLink size={10} /> {s.platform.toLowerCase()}{s.username ? `: ${s.username}` : ''}
                          </a>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              </Block>
            </div>

            <Block icon={<FileText size={15} />} title="Biografia">
              {agent.biography ? <p className="whitespace-pre-line leading-relaxed" style={{ color: 'var(--text-primary)' }}>{agent.biography}</p> : <Empty>Biografia não preenchida pelo agente.</Empty>}
            </Block>

            <CurriculumBlock agent={agent} url={curriculum.data ?? null} loading={curriculum.isLoading} />
          </div>
        )}

        {tab === 'tipologias' && (
          <div className="space-y-5">
            <Block icon={<Tag size={15} />} title={`Tipologias vinculadas (${typologies.length})`}>
              {typologies.length === 0 ? <Empty>Nenhuma tipologia cadastrada.</Empty> : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {typologies.map((t) => {
                    const path = typologyPaths.get(t.typology_id) ?? [t.cultural_typologies?.name ?? 'Tipologia']
                    return (
                      <li key={t.id} className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500 block mb-1">Nível {t.cultural_typologies?.level ?? path.length}</span>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{path[path.length - 1]}</p>
                        {path.length > 1 && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{path.slice(0, -1).join(' › ')}</p>}
                      </li>
                    )
                  })}
                </ul>
              )}
            </Block>
            {areas.length > 0 && (
              <Block icon={<Layers size={15} />} title={`Áreas culturais (${areas.length})`}>
                <div className="flex flex-wrap gap-2">
                  {areas.map((a) => <span key={a.id} className="badge badge-slate text-xs">{a.categories?.icon ? `${a.categories.icon} ` : ''}{a.categories?.name ?? 'Área cultural'}</span>)}
                </div>
              </Block>
            )}
          </div>
        )}

        {tab === 'localizacao' && (
          <div className="space-y-5">
            <Block icon={<MapPin size={15} />} title="Endereço completo" action={maps && <ExtLink href={maps} icon={<ExternalLink size={12} />}>Abrir no Google Maps</ExtLink>}>
              {address?.city ? (
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Fact label="Logradouro / número">{address.street ? `${address.street}, ${address.number || 'S/N'}` : 'Não informado'}</Fact>
                  <Fact label="Bairro">{address.neighborhood || 'Não informado'}</Fact>
                  <Fact label="Município / CEP">{address.city} - {address.state}{address.cep ? ` · ${address.cep}` : ''}</Fact>
                </dl>
              ) : <Empty>Nenhum endereço cadastrado.</Empty>}
            </Block>
            <Block icon={<Globe size={15} />} title={`Presença digital (${socialLinks.length})`}>
              {socialLinks.length === 0 ? <Empty>Nenhuma rede social informada.</Empty> : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {socialLinks.map((s) => {
                    const href = safeUrl(s.url)
                    return (
                      <li key={s.id} className="p-3 rounded-xl border flex items-center justify-between gap-2" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-amber-500 block">{s.platform}</span>
                          <span className="text-xs font-medium truncate block" style={{ color: 'var(--text-primary)' }}>{s.username || 'Perfil'}</span>
                        </div>
                        {href && <ExtLink href={href} icon={<ExternalLink size={12} />}>Acessar</ExtLink>}
                      </li>
                    )
                  })}
                </ul>
              )}
            </Block>
            <Block icon={<Users size={15} />} title={`Membros da conta (${memberships.length})`}>
              {memberships.length === 0 ? <Empty>Nenhum membro vinculado.</Empty> : (
                <ul className="space-y-2">
                  {memberships.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
                      <span style={{ color: 'var(--text-primary)' }}>{m.profiles?.full_name ?? 'Usuário'}{m.artist_role ? ` · ${m.artist_role}` : ''}</span>
                      <span className="badge badge-slate text-[10px]">{m.role}{m.invite_status !== 'accepted' ? ` · ${m.invite_status}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          </div>
        )}

        {tab === 'trajetoria' && (
          <div className="space-y-5">
            <Block icon={<FileText size={15} />} title="Biografia / release artístico">
              {agent.biography ? <p className="whitespace-pre-line leading-relaxed" style={{ color: 'var(--text-primary)' }}>{agent.biography}</p> : <Empty>O agente não cadastrou biografia.</Empty>}
            </Block>
            <CurriculumBlock agent={agent} url={curriculum.data ?? null} loading={curriculum.isLoading} />
          </div>
        )}

        {tab === 'governanca' && (
          <div className="space-y-5">
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Fact label="Protocolo"><span className="font-mono text-amber-500">{protocolOf(agent.id)}</span></Fact>
              <Fact label="Criado em">{formatDateTime(agent.created_at)}</Fact>
              <Fact label="Enviado para análise">{agent.submitted_at ? formatDateTime(agent.submitted_at) : 'Ainda não enviado'}</Fact>
            </dl>
            <Block icon={<ShieldCheck size={15} />} title="Aceite de termos (SMIIC / LGPD)">
              {agent.terms_accepted ? (
                <p style={{ color: 'var(--text-secondary)' }}>
                  Termos <strong style={{ color: 'var(--text-primary)' }}>{agent.terms_version || 'v1.0'}</strong> aceitos{agent.terms_accepted_at ? ` em ${formatDateTime(agent.terms_accepted_at)}` : ''}.
                </p>
              ) : <Empty>O agente ainda não aceitou os termos de uso.</Empty>}
            </Block>
            {agent.reviewed_at && (
              <Block icon={<Clock size={15} />} title="Última avaliação">
                <p style={{ color: 'var(--text-secondary)' }}>Revisado em <strong style={{ color: 'var(--text-primary)' }}>{formatDateTime(agent.reviewed_at)}</strong></p>
                {agent.reviewer_notes && <p className="mt-2 p-3 rounded-xl text-xs italic" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{agent.reviewer_notes}</p>}
              </Block>
            )}
          </div>
        )}

      </div>
    </Modal>
  )
}

function Block({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2" style={{ color: 'var(--accent)' }}>
          <span aria-hidden="true">{icon}</span>{title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
      <dt className="text-[11px] uppercase tracking-wider font-bold mb-1" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{children}</dd>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{children}</p>
}

function ExtLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1 whitespace-nowrap">
      {icon} {children}
    </a>
  )
}

function CurriculumBlock({ agent, url, loading }: { agent: CulturalAgentWithRelations; url: string | null; loading: boolean }) {
  return (
    <Block icon={<Download size={15} />} title="Currículo / portfólio (PDF)">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {agent.curriculum_url ? 'Documento anexado pelo agente para avaliação. O link é temporário (1 hora).' : 'Nenhum currículo ou portfólio anexado.'}
        </p>
        {agent.curriculum_url && (
          loading ? (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Gerando link…</span>
          ) : url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1.5"><ExternalLink size={13} /> Abrir currículo</a>
          ) : (
            <span className="badge badge-red text-xs">Não foi possível gerar o link</span>
          )
        )}
      </div>
    </Block>
  )
}
