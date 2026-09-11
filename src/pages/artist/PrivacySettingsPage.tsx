import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Globe, Save, Shield, UserRound } from 'lucide-react'
import { useMyAgents } from '@/hooks/useMyAgent'
import { setAgentVisibility, updateAgentPrivacy, updateCulturalAgent } from '@/services/culturalAgentService'
import { useToast } from '@/components/ui/Toast'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { errorMessage } from '@/lib/utils'
import type { CulturalAgentWithRelations } from '@/types'

/** Campos de agent_privacy controlados nesta tela */
type PrivacyKey = 'show_phone' | 'show_email' | 'show_social' | 'show_address' | 'show_birthdate'
/** Campos de cultural_agents controlados nesta tela */
type AgentKey = 'show_contact' | 'show_curriculum'

type PrivacyForm = Record<PrivacyKey, boolean> & Record<AgentKey, boolean>

interface SettingItem {
  key: PrivacyKey | AgentKey
  label: string
  description: string
}

const PRIVACY_SETTINGS: SettingItem[] = [
  { key: 'show_contact', label: 'Exibir bloco de contato', description: 'Mostrar a seção de contato no perfil público' },
  { key: 'show_phone', label: 'Exibir telefone', description: 'Mostrar número de telefone no perfil público' },
  { key: 'show_email', label: 'Exibir e-mail', description: 'Mostrar endereço de e-mail no perfil público' },
  { key: 'show_social', label: 'Exibir redes sociais', description: 'Mostrar links das redes sociais no perfil público' },
  { key: 'show_address', label: 'Exibir localização', description: 'Mostrar cidade e bairro no perfil público' },
  { key: 'show_birthdate', label: 'Exibir data de nascimento', description: 'Mostrar data de nascimento no perfil público' },
  { key: 'show_curriculum', label: 'Exibir currículo', description: 'Permitir que visitantes baixem o currículo enviado' },
]

const PRIVACY_KEYS: PrivacyKey[] = ['show_phone', 'show_email', 'show_social', 'show_address', 'show_birthdate']
const AGENT_KEYS: AgentKey[] = ['show_contact', 'show_curriculum']

function formFromAgent(agent: CulturalAgentWithRelations): PrivacyForm {
  const p = agent.privacy
  return {
    show_phone: p?.show_phone ?? false,
    show_email: p?.show_email ?? false,
    show_social: p?.show_social ?? true,
    show_address: p?.show_address ?? true,
    show_birthdate: p?.show_birthdate ?? false,
    show_contact: agent.show_contact ?? false,
    show_curriculum: agent.show_curriculum ?? false,
  }
}

interface ToggleProps {
  id: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

/** Interruptor acessível (role="switch") rotulado por `aria-labelledby={id}-label`. */
function Toggle({ id, checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-desc`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50 ${
        checked ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-600'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export function PrivacySettingsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { agents, primaryAgent, isLoading, error, refetch } = useMyAgents()

  const [agentId, setAgentId] = useState('')
  const [form, setForm] = useState<PrivacyForm | null>(null)

  // Agente selecionado: o principal por padrão
  useEffect(() => {
    if (!agentId && primaryAgent) setAgentId(primaryAgent.id)
  }, [primaryAgent, agentId])

  const agent = useMemo(() => agents.find((a) => a.id === agentId) ?? null, [agents, agentId])

  // Recarrega o formulário sempre que o agente selecionado (ou seus dados) mudar
  useEffect(() => {
    setForm(agent ? formFromAgent(agent) : null)
  }, [agent])

  const saveMutation = useMutation({
    mutationFn: async (data: PrivacyForm) => {
      if (!agent) throw new Error('Selecione um agente cultural.')
      const privacyPayload = Object.fromEntries(PRIVACY_KEYS.map((k) => [k, data[k]])) as Record<PrivacyKey, boolean>
      const agentPayload = Object.fromEntries(AGENT_KEYS.map((k) => [k, data[k]])) as Record<AgentKey, boolean>
      await updateAgentPrivacy(agent.id, privacyPayload)
      await updateCulturalAgent(agent.id, agentPayload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-agents'] })
      qc.invalidateQueries({ queryKey: ['agent-detail'] })
      toast.success('Preferências de privacidade salvas.')
    },
    onError: (err) => toast.error(errorMessage(err, 'Não foi possível salvar as preferências.')),
  })

  const visibilityMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      if (!agent) throw new Error('Selecione um agente cultural.')
      await setAgentVisibility(agent.id, isPublic)
    },
    onSuccess: (_data, isPublic) => {
      qc.invalidateQueries({ queryKey: ['my-agents'] })
      qc.invalidateQueries({ queryKey: ['agent-detail'] })
      toast.success(isPublic ? 'Perfil visível no Mapa Cultural.' : 'Perfil oculto do Mapa Cultural.')
    },
    onError: (err) => toast.error(errorMessage(err, 'Não foi possível alterar a visibilidade.')),
  })

  const canManage = agent?.membership_role === 'owner' || agent?.membership_role === 'admin'
  const isApproved = agent?.registration_status === 'aprovado'

  let content: React.ReactNode
  if (isLoading) {
    content = <SkeletonList rows={4} />
  } else if (error) {
    content = <ErrorState error={error} onRetry={() => refetch()} />
  } else if (agents.length === 0) {
    content = (
      <EmptyState
        icon={UserRound}
        title="Cadastre seu Agente Cultural"
        description="As configurações de privacidade se aplicam ao seu Agente Cultural. Faça o cadastro no SMIIC para começar."
        action={<Link to="/painel/agentes/cadastrar" className="btn btn-primary">Cadastrar Agente Cultural</Link>}
      />
    )
  } else if (!agent || !form) {
    content = <SkeletonList rows={4} />
  } else {
    content = (
      <div className="space-y-4">
        {agents.length > 1 && (
          <div className="card p-5">
            <label htmlFor="privacy-agent" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Agente cultural
            </label>
            <select id="privacy-agent" className="input" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.display_name ?? 'Agente sem nome'}</option>
              ))}
            </select>
          </div>
        )}

        <div className="card p-4 text-xs" style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.2)' }}>
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p style={{ color: 'var(--text-secondary)' }}>
              De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem o direito de controlar
              o acesso às suas informações pessoais. As configurações abaixo se aplicam ao perfil público
              de <strong style={{ color: 'var(--text-primary)' }}>{agent.display_name ?? 'este agente'}</strong>.
              CPF, CNPJ, gênero e raça nunca são exibidos publicamente.
            </p>
          </div>
        </div>

        {!canManage && (
          <div role="status" className="p-3 rounded-lg text-sm border border-amber-500/20 bg-amber-500/5" style={{ color: 'var(--text-secondary)' }}>
            Somente o dono ou administrador do agente pode alterar estas configurações.
          </div>
        )}

        {/* Visibilidade no mapa */}
        <div className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Globe className={`h-5 w-5 flex-shrink-0 mt-0.5 ${agent.is_public ? 'text-emerald-400' : ''}`} style={agent.is_public ? undefined : { color: 'var(--text-muted)' }} aria-hidden="true" />
              <div>
                <p id="privacy-visibility-label" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Perfil visível no Mapa Cultural
                </p>
                <p id="privacy-visibility-desc" className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {isApproved
                    ? 'Quando desligado, o agente não aparece nas buscas nem no mapa público.'
                    : 'Disponível após a aprovação do cadastro pela Secretaria de Cultura.'}
                </p>
              </div>
            </div>
            <Toggle
              id="privacy-visibility"
              checked={agent.is_public}
              disabled={!isApproved || !canManage || visibilityMutation.isPending}
              onChange={(next) => visibilityMutation.mutate(next)}
            />
          </div>
        </div>

        <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
          {PRIVACY_SETTINGS.map(({ key, label, description }) => {
            const id = `privacy-${key}`
            const checked = form[key]
            return (
              <div key={key} className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-start gap-3">
                  {checked ? (
                    <Eye className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                  )}
                  <div>
                    <p id={`${id}-label`} className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p id={`${id}-desc`} className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
                  </div>
                </div>
                <Toggle
                  id={id}
                  checked={checked}
                  disabled={!canManage || saveMutation.isPending}
                  onChange={(next) => setForm((f) => (f ? { ...f, [key]: next } : f))}
                />
              </div>
            )
          })}
        </div>

        {saveMutation.isError && (
          <div role="alert" className="p-3 rounded-lg text-sm text-red-400 border border-red-500/20 bg-red-500/5">
            {errorMessage(saveMutation.error, 'Não foi possível salvar as preferências.')}
          </div>
        )}

        <LoadingButton
          type="button"
          onClick={() => form && saveMutation.mutate(form)}
          loading={saveMutation.isPending}
          disabled={!canManage}
          className="btn btn-primary"
        >
          {!saveMutation.isPending && <Save className="h-4 w-4" aria-hidden="true" />}
          Salvar preferências
        </LoadingButton>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-xl">
      <PageHeader
        icon={Shield}
        title="Privacidade (LGPD)"
        description="Controle quais informações são visíveis no seu perfil público."
      />
      {content}
    </div>
  )
}
