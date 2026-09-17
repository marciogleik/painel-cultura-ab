import { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, User, MapPin, Globe, Tag, BarChart2, FileText, Upload, Eye, EyeOff,
  Loader2, Camera, Trash2, Pencil, Undo2, ExternalLink, Send, Info, Calendar,
} from 'lucide-react'
import {
  getAgentById,
  calculateCompletion,
  uploadAgentCurriculum,
  updateAgentCurriculum,
  removeAgentCurriculum,
  getCurriculumUrl,
  uploadAgentPhoto,
  deleteAgentPhoto,
  withdrawAgent,
  setAgentVisibility,
  getTypologyTree,
  flattenTypologyTree,
} from '@/services/culturalAgentService'
import { OFFICIAL_SMIIC_TYPOLOGIES } from '@/data/smiicTypologies'
import { useToast } from '@/components/ui/Toast'
import { useConfirm, LoadingButton } from '@/components/ui/ConfirmDialog'
import { ErrorState } from '@/components/ui/EmptyState'
import { useAuth } from '@/contexts/AuthContext'
import { useMyAgents } from '@/hooks/useMyAgent'
import { errorMessage, formatDateTime, formatCEP, safeUrl } from '@/lib/utils'
import type { AgentOnboardingStep } from '@/types'
import { AgentMembersSection } from './AgentMembersSection'
import { AGENT_STATUS, EDITABLE_STATUSES, ROLE_LABELS, SUBMITTABLE_STATUSES } from './agentStatus'

const MISSING_LABELS: Record<AgentOnboardingStep, string> = {
  dados_basicos: 'dados básicos (nome e documento)',
  foto: 'foto',
  tipologia: 'tipologia',
  endereco: 'endereço',
  redes_sociais: 'redes sociais',
  apresentacao: 'apresentação (mín. 50 caracteres)',
}

const MAX_FILE = 5 * 1024 * 1024
const CV_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

/** Nome do arquivo a partir do caminho gravado no bucket (ou URL legada). */
function fileNameFromPath(path: string | null | undefined): string {
  if (!path) return ''
  try {
    const clean = path.split('?')[0]
    return decodeURIComponent(clean.slice(clean.lastIndexOf('/') + 1)) || 'currículo'
  } catch {
    return 'currículo'
  }
}

export function AgentDetailPage() {
  const { user, isStaff } = useAuth()
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const { agents: myAgents } = useMyAgents()

  const cvInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState('')
  const [cvError, setCvError] = useState('')
  /** Nome original do último currículo enviado nesta sessão (o bucket guarda um nome gerado) */
  const [cvOriginalName, setCvOriginalName] = useState<string | null>(null)

  const agentQuery = useQuery({
    queryKey: ['agent-detail', id],
    queryFn: () => getAgentById(id!),
    enabled: !!id,
  })
  const agent = agentQuery.data ?? null

  const { data: tree = OFFICIAL_SMIIC_TYPOLOGIES } = useQuery({
    queryKey: ['typology-tree', 'agent'],
    queryFn: () => getTypologyTree('agent'),
    placeholderData: OFFICIAL_SMIIC_TYPOLOGIES,
    staleTime: 10 * 60_000,
  })
  const typologyMap = useMemo(() => flattenTypologyTree(tree), [tree])

  const curriculumPath = agent?.curriculum_url ?? null
  const cvUrlQuery = useQuery({
    queryKey: ['curriculum-url', curriculumPath],
    queryFn: () => getCurriculumUrl(curriculumPath),
    enabled: !!curriculumPath,
    staleTime: 50 * 60_000, // URL assinada vale 1h
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['agent-detail', id] })
    qc.invalidateQueries({ queryKey: ['my-agents'] })
    qc.invalidateQueries({ queryKey: ['home-featured-agents'] })
  }

  const photoMutation = useMutation({
    mutationFn: (file: File) => uploadAgentPhoto(agent!.id, file, agent!.photo_url),
    onSuccess: () => { invalidate(); setPhotoError(''); toast.success('Foto de perfil atualizada.') },
    onError: (err: unknown) => { const m = errorMessage(err, 'Não foi possível enviar a foto.'); setPhotoError(m); toast.error(m) },
    onSettled: () => { if (photoInputRef.current) photoInputRef.current.value = '' },
  })

  const removePhotoMutation = useMutation({
    mutationFn: () => deleteAgentPhoto(agent!.id, agent!.photo_url),
    onSuccess: () => { invalidate(); toast.success('Foto removida.') },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Não foi possível remover a foto.')),
  })

  const cvUploadMutation = useMutation({
    mutationFn: (file: File) => uploadAgentCurriculum(agent!.id, file, agent!.show_curriculum, agent!.curriculum_url),
    onSuccess: (_, file) => { invalidate(); setCvError(''); setCvOriginalName(file.name); toast.success('Currículo enviado.') },
    onError: (err: unknown) => { const m = errorMessage(err, 'Não foi possível enviar o currículo.'); setCvError(m); toast.error(m) },
    onSettled: () => { if (cvInputRef.current) cvInputRef.current.value = '' },
  })

  const cvVisibilityMutation = useMutation({
    mutationFn: (show: boolean) => updateAgentCurriculum(agent!.id, show),
    onSuccess: (_, show) => { invalidate(); toast.success(show ? 'Currículo visível no perfil público.' : 'Currículo oculto do perfil público.') },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Não foi possível alterar a visibilidade do currículo.')),
  })

  const cvRemoveMutation = useMutation({
    mutationFn: () => removeAgentCurriculum(agent!.id, agent!.curriculum_url),
    onSuccess: () => { invalidate(); setCvOriginalName(null); toast.success('Currículo removido.') },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Não foi possível remover o currículo.')),
  })

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawAgent(agent!.id),
    onSuccess: () => { invalidate(); toast.success('Envio retirado. O cadastro voltou para rascunho.') },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Não foi possível retirar o envio.')),
  })

  const visibilityMutation = useMutation({
    mutationFn: (isPublic: boolean) => setAgentVisibility(agent!.id, isPublic),
    onSuccess: (_, isPublic) => { invalidate(); toast.success(isPublic ? 'Perfil visível no Mapa Cultural.' : 'Perfil oculto do Mapa Cultural.') },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Não foi possível alterar a visibilidade.')),
  })

  // ---- Guardas ----
  if (agentQuery.isPending) {
    return (
      <div className="animate-fade-in space-y-4 max-w-2xl mx-auto" aria-busy="true">
        <div className="skeleton h-8 w-40 rounded" />
        <div className="skeleton h-36 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
    )
  }

  if (agentQuery.isError) {
    return (
      <div className="max-w-2xl mx-auto">
        <ErrorState error={agentQuery.error} onRetry={() => agentQuery.refetch()} />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="text-center py-20">
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Agente não encontrado ou sem permissão de acesso.</p>
        <Link to="/painel/agentes" className="btn btn-secondary">Voltar</Link>
      </div>
    )
  }

  // ---- Derivados ----
  const status = AGENT_STATUS[agent.registration_status]
  const completion = calculateCompletion(agent)
  const membershipRole = myAgents.find((a) => a.id === agent.id)?.membership_role
  const isManager = isStaff || agent.created_by === user?.id || membershipRole === 'owner' || membershipRole === 'admin'
  const canEdit = isManager && EDITABLE_STATUSES.includes(agent.registration_status)
  const canSubmit = isManager && SUBMITTABLE_STATUSES.includes(agent.registration_status)
  const canWithdraw = isManager && agent.registration_status === 'enviado'
  const isApproved = agent.registration_status === 'aprovado'
  const address = agent.address ?? null
  const typologies = agent.typologies ?? []
  const socialLinks = agent.social_links ?? []
  const cvName = cvOriginalName ?? fileNameFromPath(agent.curriculum_url)

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      const m = 'Selecione um arquivo de imagem (JPG, PNG ou WebP).'
      setPhotoError(m); toast.error(m); e.target.value = ''
      return
    }
    if (file.size > MAX_FILE) {
      const m = 'A foto deve ter no máximo 5 MB.'
      setPhotoError(m); toast.error(m); e.target.value = ''
      return
    }
    photoMutation.mutate(file)
  }

  const handleRemovePhoto = async () => {
    const ok = await confirm({
      title: 'Remover foto do perfil?',
      message: 'A foto atual será apagada. Você pode enviar outra a qualquer momento.',
      confirmLabel: 'Remover',
      danger: true,
    })
    if (ok) removePhotoMutation.mutate()
  }

  const handleCvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!CV_TYPES.includes(file.type) && !/\.(pdf|docx?)$/i.test(file.name)) {
      setCvError('Envie um arquivo PDF ou Word (.doc, .docx).'); e.target.value = ''
      return
    }
    if (file.size > MAX_FILE) {
      setCvError('Arquivo muito grande. Máximo 5 MB.'); e.target.value = ''
      return
    }
    setCvError('')
    cvUploadMutation.mutate(file)
  }

  const handleRemoveCv = async () => {
    const ok = await confirm({
      title: 'Remover currículo?',
      message: `O arquivo ${cvName || 'atual'} será apagado.`,
      confirmLabel: 'Remover',
      danger: true,
    })
    if (ok) cvRemoveMutation.mutate()
  }

  const handleWithdraw = async () => {
    const ok = await confirm({
      title: 'Retirar o cadastro da fila de análise?',
      message: 'O cadastro volta para rascunho. Você poderá editar e enviar novamente quando quiser.',
      confirmLabel: 'Retirar envio',
    })
    if (ok) withdrawMutation.mutate()
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Back */}
      <Link
        to="/painel/agentes"
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Meus agentes
      </Link>

      {/* Header card */}
      <div className="card p-5 mb-4 flex flex-col sm:flex-row items-start gap-4" style={{ border: '1px solid var(--border)' }}>
        {/* Foto */}
        <div className="relative group flex-shrink-0 flex flex-col items-center mx-auto sm:mx-0">
          <div
            className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-sm border-2 transition-all"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            {photoMutation.isPending ? (
              <div className="flex flex-col items-center justify-center p-2 text-center" aria-live="polite">
                <Loader2 size={24} className="animate-spin text-amber-500 mb-1" aria-hidden="true" />
                <span className="text-[10px] font-semibold text-amber-500">Salvando...</span>
              </div>
            ) : agent.photo_url ? (
              <img src={agent.photo_url} alt={`Foto de ${agent.display_name ?? 'agente'}`} className="w-full h-full object-cover" />
            ) : (
              <User size={36} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
            )}
          </div>

          {isManager && (
            <>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={handlePhotoFile}
              />
              <div className="mt-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoMutation.isPending}
                  className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Camera size={12} aria-hidden="true" />
                  {agent.photo_url ? 'Trocar foto' : 'Adicionar foto'}
                </button>
                {agent.photo_url && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={removePhotoMutation.isPending}
                    className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    aria-label="Remover foto"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
              {photoError && <p role="alert" className="text-[11px] mt-1 text-center" style={{ color: 'var(--error)' }}>{photoError}</p>}
            </>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {agent.display_name || 'Sem nome de exibição'}
              </h1>
              {agent.legal_name && (
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{agent.legal_name}</p>
              )}
            </div>
            <span className={`badge ${status.color}`}>{status.label}</span>
          </div>

          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {agent.person_type === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'} ·{' '}
            {agent.collective_type === 'individual' ? 'Individual' : 'Coletivo / Grupo'}
            {membershipRole && <> · Seu papel: {ROLE_LABELS[membershipRole]}</>}
          </p>

          {/* Ações principais */}
          {isManager && (
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {canSubmit && (
                <Link to={`/painel/agentes/${agent.id}/editar`} className="btn btn-primary text-xs px-3 py-1.5">
                  <Send size={12} aria-hidden="true" />
                  {agent.registration_status === 'rejeitado' ? 'Corrigir e reenviar' : 'Continuar e enviar'}
                </Link>
              )}
              {canEdit && (
                <Link to={`/painel/agentes/${agent.id}/editar`} className="btn btn-secondary text-xs px-3 py-1.5">
                  <Pencil size={12} aria-hidden="true" />
                  Editar
                </Link>
              )}
              {canWithdraw && (
                <LoadingButton type="button" onClick={handleWithdraw} loading={withdrawMutation.isPending} className="btn btn-secondary text-xs px-3 py-1.5">
                  <Undo2 size={12} aria-hidden="true" />
                  Retirar envio
                </LoadingButton>
              )}
              {isApproved && (
                <Link to={`/agentes/${agent.id}`} className="btn btn-secondary text-xs px-3 py-1.5">
                  <ExternalLink size={12} aria-hidden="true" />
                  Ver perfil público
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status da homologação */}
      <section className="card p-4 mb-4" aria-labelledby="status-title">
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h2 id="status-title" className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Situação do cadastro
          </h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span className={`badge ${status.color} mr-2`}>{status.label}</span>
          {status.description}
        </p>
        {(agent.submitted_at || agent.reviewed_at) && (
          <p className="text-xs mt-2 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
            <Calendar size={11} aria-hidden="true" />
            {agent.submitted_at && <span>Enviado em {formatDateTime(agent.submitted_at)}</span>}
            {agent.submitted_at && agent.reviewed_at && <span aria-hidden="true">·</span>}
            {agent.reviewed_at && <span>Analisado em {formatDateTime(agent.reviewed_at)}</span>}
          </p>
        )}
        {agent.reviewer_notes && (
          <div
            className="mt-3 p-3 rounded-lg text-sm"
            style={{
              background: agent.registration_status === 'rejeitado' ? 'rgba(239,68,68,0.06)' : 'var(--bg-secondary)',
              border: `1px solid ${agent.registration_status === 'rejeitado' ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
              color: 'var(--text-secondary)',
            }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Parecer da Secretaria</p>
            <p className="whitespace-pre-line">{agent.reviewer_notes}</p>
          </div>
        )}

        {/* Visibilidade no mapa — só após aprovação */}
        {isApproved && isManager && (
          <div className="mt-3 pt-3 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div>
              <p id="visibility-label" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Visível no Mapa Cultural</p>
              <p id="visibility-desc" className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {agent.is_public ? 'Qualquer pessoa pode encontrar este perfil.' : 'O perfil está oculto do público; só você e a Secretaria o veem.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={agent.is_public}
              aria-labelledby="visibility-label"
              aria-describedby="visibility-desc"
              disabled={visibilityMutation.isPending}
              onClick={() => visibilityMutation.mutate(!agent.is_public)}
              className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
              style={{ background: agent.is_public ? 'var(--accent)' : 'var(--border)' }}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${agent.is_public ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        )}
      </section>

      {/* Completude */}
      <section className="card p-4 mb-4" aria-labelledby="completion-title">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h2 id="completion-title" className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Completude do perfil
          </h2>
          <span className="ml-auto text-sm font-bold" style={{ color: 'var(--accent)' }}>
            {completion.percentage}%
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--border)' }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completion.percentage}
          aria-labelledby="completion-title"
        >
          <div
            className="h-2 rounded-full transition-all duration-700"
            style={{
              width: `${completion.percentage}%`,
              background: completion.percentage === 100
                ? 'var(--success)'
                : 'linear-gradient(90deg, var(--accent-dark), var(--accent-light))',
            }}
          />
        </div>
        {completion.missingSteps.length > 0 && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Pendente: {completion.missingSteps.map((s) => MISSING_LABELS[s]).join(', ')}
          </p>
        )}
      </section>

      {/* Apresentação */}
      {agent.biography && (
        <section className="card p-4 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            Apresentação
          </h2>
          <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {agent.biography}
          </p>
        </section>
      )}

      {/* Localização */}
      {address && (address.city || address.street) && (
        <section className="card p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Localização
            </h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {[
              [address.street, address.number].filter(Boolean).join(', '),
              address.complement,
              address.neighborhood,
              [address.city, address.state].filter(Boolean).join(' — '),
              address.cep ? `CEP ${formatCEP(address.cep)}` : null,
            ].filter(Boolean).join(' · ')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Publicamente só aparecem cidade e estado{agent.privacy?.show_address ? ' (endereço completo liberado por você)' : ''}.
          </p>
        </section>
      )}

      {/* Tipologias */}
      {typologies.length > 0 && (
        <section className="card p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Tipologias
            </h2>
          </div>
          <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
            {typologies.map((t) => (
              <li key={t.id} className="badge badge-slate text-xs">
                {typologyMap.get(t.typology_id)?.path.join(' › ') ?? t.cultural_typologies?.name ?? 'Tipologia'}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Redes sociais */}
      {socialLinks.length > 0 && (
        <section className="card p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Redes sociais
            </h2>
          </div>
          <ul className="space-y-1.5 list-none p-0 m-0">
            {socialLinks.map((s) => {
              const href = safeUrl(s.url)
              return (
                <li key={s.id}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Globe size={12} aria-hidden="true" />
                      <span>{s.platform}</span>
                      <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.url}</span>
                    </a>
                  ) : (
                    <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <Globe size={12} aria-hidden="true" />
                      <span>{s.platform}</span>
                      <span className="text-xs truncate">{s.url} (endereço inválido)</span>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Integrantes */}
      <AgentMembersSection
        agentId={agent.id}
        agentName={agent.display_name || agent.legal_name || 'Agente Cultural'}
        isCollective={agent.collective_type === 'coletivo'}
        isManager={isManager}
      />

      {/* Currículo */}
      <section className="card p-4 mb-4" aria-labelledby="cv-title">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <h2 id="cv-title" className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Currículo
            </h2>
          </div>
          {agent.curriculum_url && isManager && (
            <button
              type="button"
              role="switch"
              aria-checked={agent.show_curriculum}
              onClick={() => cvVisibilityMutation.mutate(!agent.show_curriculum)}
              disabled={cvVisibilityMutation.isPending}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
              style={{
                background: agent.show_curriculum ? 'rgba(34,197,94,0.1)' : 'var(--bg-secondary)',
                color: agent.show_curriculum ? 'var(--success)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {agent.show_curriculum ? <Eye size={11} aria-hidden="true" /> : <EyeOff size={11} aria-hidden="true" />}
              {agent.show_curriculum ? 'Público' : 'Privado'}
            </button>
          )}
        </div>

        {agent.curriculum_url ? (
          <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <FileText size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }} title={cvName}>
                {cvName}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {agent.show_curriculum ? 'Visível no perfil público' : 'Visível só para você e para a Secretaria'}
              </p>
            </div>
            {cvUrlQuery.data ? (
              <a
                href={cvUrlQuery.data}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary text-xs px-2 py-1"
              >
                <ExternalLink size={12} aria-hidden="true" />
                Abrir
              </a>
            ) : cvUrlQuery.isError || (cvUrlQuery.isFetched && !cvUrlQuery.data) ? (
              <button type="button" className="btn btn-secondary text-xs px-2 py-1" onClick={() => cvUrlQuery.refetch()}>
                Gerar link
              </button>
            ) : (
              <Loader2 size={14} className="animate-spin" aria-label="Gerando link" style={{ color: 'var(--text-muted)' }} />
            )}
            {isManager && (
              <button
                type="button"
                onClick={handleRemoveCv}
                disabled={cvRemoveMutation.isPending}
                className="p-1.5 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                aria-label="Remover currículo"
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            Nenhum currículo anexado. {isManager && 'Envie um PDF ou Word de até 5 MB.'}
          </p>
        )}

        {cvError && <p role="alert" className="text-xs mt-2" style={{ color: 'var(--error)' }}>{cvError}</p>}

        {isManager && (
          <>
            <input
              ref={cvInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={handleCvFile}
            />
            <LoadingButton
              type="button"
              onClick={() => cvInputRef.current?.click()}
              loading={cvUploadMutation.isPending}
              className="btn btn-secondary w-full mt-3 text-xs"
            >
              <Upload size={13} aria-hidden="true" />
              {agent.curriculum_url ? 'Substituir currículo' : 'Anexar currículo'}
            </LoadingButton>
          </>
        )}
      </section>

      {/* Rodapé */}
      <div className="flex gap-3 flex-wrap">
        <Link to="/painel/agentes" className="btn btn-secondary flex-1 min-w-[130px]">
          <ArrowLeft size={15} aria-hidden="true" />
          Voltar
        </Link>
        {canEdit && (
          <Link to={`/painel/agentes/${agent.id}/editar`} className="btn btn-secondary flex-1 min-w-[130px]">
            <Pencil size={15} aria-hidden="true" />
            Editar cadastro
          </Link>
        )}
        {isApproved && (
          <Link to={`/agentes/${agent.id}`} className="btn btn-primary flex-1 min-w-[130px]">
            <Globe size={15} aria-hidden="true" />
            Ver perfil público
          </Link>
        )}
      </div>
    </div>
  )
}
