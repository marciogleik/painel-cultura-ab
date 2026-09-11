import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Send, User, MapPin, Globe, Tag, Pencil, Shield, Info } from 'lucide-react'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { getTypologyTree, flattenTypologyTree } from '@/services/culturalAgentService'
import { OFFICIAL_SMIIC_TYPOLOGIES } from '@/data/smiicTypologies'
import { formatCPF, formatCNPJ, formatPhone, formatDate } from '@/lib/utils'
import type { AgentRegistrationStatus } from '@/types'
import type { WizardData } from './useAgentWizard'
import { AGENT_STATUS, SUBMITTABLE_STATUSES } from './agentStatus'

interface Step9Props {
  data: WizardData
  /** Status atual no banco (null quando ainda não foi criado) */
  agentStatus: AgentRegistrationStatus | null
  onBack: () => void
  onGoToStep: (step: number) => void
  /** Resolve true quando o envio foi aceito pelo servidor */
  onSubmit: () => Promise<boolean>
  isSaving: boolean
  globalError?: string
}

function ReviewRow({ label, value, step, onEdit }: {
  label: string
  value: string | null | undefined
  step: number
  onEdit: (step: number) => void
}) {
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-medium mt-0.5 break-words" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {value || '—'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onEdit(step)}
        className="flex-shrink-0 p-1.5 rounded-lg hover:opacity-70 transition-opacity"
        style={{ color: 'var(--accent)' }}
        aria-label={`Editar ${label}`}
      >
        <Pencil size={13} aria-hidden="true" />
      </button>
    </div>
  )
}

function SectionTitle({ icon: Icon, children }: { icon: typeof User; children: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
      <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {children}
      </h3>
    </div>
  )
}

export function Step9Revisao({ data, agentStatus, onBack, onGoToStep, onSubmit, isSaving, globalError }: Step9Props) {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)

  const { data: tree = OFFICIAL_SMIIC_TYPOLOGIES } = useQuery({
    queryKey: ['typology-tree', 'agent'],
    queryFn: () => getTypologyTree('agent'),
    placeholderData: OFFICIAL_SMIIC_TYPOLOGIES,
    staleTime: 10 * 60_000,
  })
  const flat = useMemo(() => flattenTypologyTree(tree), [tree])

  const canSubmit = agentStatus === null || SUBMITTABLE_STATUSES.includes(agentStatus)
  const isApproved = agentStatus === 'aprovado'

  const handleSubmit = async () => {
    const ok = await onSubmit()
    if (ok) setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="animate-fade-in text-center py-8" role="status">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)' }}
        >
          <CheckCircle size={40} style={{ color: 'var(--success)' }} aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Cadastro enviado para homologação
        </h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          {AGENT_STATUS.enviado.description}
        </p>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Você será avisado quando o cadastro for analisado. Enquanto isso, o perfil fica visível apenas para você.
          Se precisar corrigir algo, use “Retirar envio” na página do agente.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button type="button" onClick={() => navigate('/painel')} className="btn btn-secondary">
            Ir para o painel
          </button>
          <button type="button" onClick={() => navigate('/painel/agentes')} className="btn btn-primary">
            Ver meus agentes
          </button>
        </div>
      </div>
    )
  }

  const { step1, step2, step3, step4, step5, step6, step7, step8 } = data
  const isPJ = step1.person_type === 'juridica'
  const status = agentStatus ? AGENT_STATUS[agentStatus] : null

  const typologyPaths = step3.typology_ids
    .filter((id) => (flat.get(id)?.node.level ?? 1) >= 2)
    .map((id) => flat.get(id)?.path.join(' › ') ?? id)

  const addressLine = [
    [step5.street, step5.number].filter(Boolean).join(', '),
    step5.neighborhood,
    step5.city && step5.state ? `${step5.city} — ${step5.state}` : step5.city || step5.state,
  ].filter(Boolean).join(' · ')

  const visibleItems = [
    step8.show_social && 'redes sociais',
    step8.show_phone && 'telefone',
    step8.show_email && 'e-mail',
    step8.show_address && 'endereço completo',
    step8.show_birthdate && 'data de nascimento',
  ].filter(Boolean) as string[]

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {isApproved ? 'Revisar alterações' : 'Revisar e enviar'}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {isApproved
            ? 'Cada etapa é salva ao continuar. Confira as informações — o perfil público reflete as alterações imediatamente.'
            : 'Confira as informações antes de enviar. Você pode editar qualquer etapa; ao salvar, volta para cá.'}
        </p>
      </div>

      {status && agentStatus !== 'rascunho' && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-xs flex items-start gap-2"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} aria-hidden="true" />
          <span>
            <span className={`badge ${status.color} mr-2`}>{status.label}</span>
            {status.description}
          </span>
        </div>
      )}

      {/* Foto + nome */}
      <div className="card p-4 mb-4 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)' }}
        >
          {step7.photo_url ? (
            <img src={step7.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={28} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {step2.display_name || 'Nome não informado'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'} · {step1.collective_type === 'individual' ? 'Individual' : 'Coletivo / Grupo'}
          </p>
        </div>
        <button type="button" onClick={() => onGoToStep(7)} style={{ color: 'var(--accent)' }} aria-label="Editar foto" className="p-1.5">
          <Pencil size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Identificação */}
      <div className="card p-4 mb-4">
        <SectionTitle icon={User}>Identificação</SectionTitle>
        <ReviewRow label="Tipo de agente" value={`${isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'} · ${step1.collective_type === 'individual' ? 'Individual' : 'Coletivo / Grupo'}`} step={1} onEdit={onGoToStep} />
        <ReviewRow label="Nome de exibição" value={step2.display_name} step={2} onEdit={onGoToStep} />
        {isPJ ? (
          <>
            <ReviewRow label="Razão social" value={step2.legal_name} step={2} onEdit={onGoToStep} />
            <ReviewRow label="CNPJ" value={step2.cnpj ? formatCNPJ(step2.cnpj) : null} step={2} onEdit={onGoToStep} />
          </>
        ) : (
          <>
            <ReviewRow label="Nome completo" value={step2.full_name} step={2} onEdit={onGoToStep} />
            <ReviewRow label="CPF" value={step2.cpf ? formatCPF(step2.cpf) : null} step={2} onEdit={onGoToStep} />
            {step2.birth_date && (
              <ReviewRow label="Data de nascimento" value={formatDate(step2.birth_date)} step={2} onEdit={onGoToStep} />
            )}
          </>
        )}
        <ReviewRow label="Telefone" value={step2.phone ? formatPhone(step2.phone) : null} step={2} onEdit={onGoToStep} />
        <ReviewRow
          label="Apresentação"
          value={step2.biography ? (step2.biography.length > 140 ? `${step2.biography.slice(0, 140)}…` : step2.biography) : null}
          step={2}
          onEdit={onGoToStep}
        />
      </div>

      {/* Classificação */}
      <div className="card p-4 mb-4">
        <SectionTitle icon={Tag}>Classificação</SectionTitle>
        <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tipologias</p>
            {typologyPaths.length === 0 ? (
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--error)' }}>Nenhuma — obrigatória para enviar</p>
            ) : (
              <ul className="list-none p-0 m-0 mt-1 space-y-1">
                {typologyPaths.map((p) => (
                  <li key={p} className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p}</li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" onClick={() => onGoToStep(3)} className="flex-shrink-0 p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--accent)' }} aria-label="Editar tipologias">
            <Pencil size={13} aria-hidden="true" />
          </button>
        </div>
        <ReviewRow
          label="Áreas de atuação"
          value={step4.category_ids.length > 0 ? `${step4.category_ids.length} selecionada(s)` : null}
          step={4}
          onEdit={onGoToStep}
        />
      </div>

      {/* Localização */}
      <div className="card p-4 mb-4">
        <SectionTitle icon={MapPin}>Localização</SectionTitle>
        <ReviewRow label="Endereço" value={addressLine || null} step={5} onEdit={onGoToStep} />
        {!step5.city && (
          <p className="text-xs mt-2" style={{ color: 'var(--error)' }}>A cidade é obrigatória para enviar o cadastro.</p>
        )}
      </div>

      {/* Redes sociais */}
      <div className="card p-4 mb-4">
        <SectionTitle icon={Globe}>Redes sociais</SectionTitle>
        <ReviewRow
          label="Links cadastrados"
          value={step6.links.length > 0 ? step6.links.map((l) => l.platform).join(', ') : null}
          step={6}
          onEdit={onGoToStep}
        />
      </div>

      {/* Privacidade e termos */}
      <div className="card p-4 mb-6">
        <SectionTitle icon={Shield}>Privacidade e termos</SectionTitle>
        <ReviewRow
          label="Visível no perfil público"
          value={visibleItems.length > 0 ? visibleItems.join(', ') : 'apenas nome, foto, apresentação, tipologias e cidade'}
          step={8}
          onEdit={onGoToStep}
        />
        <ReviewRow
          label="Termos de uso"
          value={step8.terms_accepted ? `Aceitos (versão ${step8.terms_version})` : null}
          step={8}
          onEdit={onGoToStep}
        />
      </div>

      {globalError && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--error)' }}
        >
          {globalError}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} disabled={isSaving} className="btn btn-secondary flex-1">Voltar</button>
        {canSubmit ? (
          <LoadingButton type="button" onClick={handleSubmit} loading={isSaving} className="btn btn-primary flex-2">
            <Send size={16} aria-hidden="true" />
            {isSaving ? 'Enviando…' : agentStatus === 'rejeitado' ? 'Reenviar cadastro' : 'Enviar cadastro'}
          </LoadingButton>
        ) : (
          <button
            type="button"
            onClick={() => navigate(data.agentId ? `/painel/agentes/${data.agentId}` : '/painel/agentes')}
            className="btn btn-primary flex-2"
          >
            <CheckCircle size={16} aria-hidden="true" />
            Concluir
          </button>
        )}
      </div>
    </div>
  )
}
