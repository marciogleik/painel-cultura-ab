import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Lock, Undo2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useMyAgents } from '@/hooks/useMyAgent'
import { useToast } from '@/components/ui/Toast'
import { useConfirm, LoadingButton } from '@/components/ui/ConfirmDialog'
import { ErrorState } from '@/components/ui/EmptyState'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { errorMessage, onlyDigits } from '@/lib/utils'
import {
  getAgentById,
  createCulturalAgent,
  updateCulturalAgent,
  upsertAgentAddress,
  setAgentTypologies,
  setAgentSocialLinks,
  updateAgentPrivacy,
  uploadAgentPhoto,
  deleteAgentPhoto,
  submitAgent,
  withdrawAgent,
} from '@/services/culturalAgentService'
import { useAgentWizard, type WizardData } from './useAgentWizard'
import { WizardProgress } from './WizardProgress'
import { Step1TipoAgente } from './Step1TipoAgente'
import { Step2Identificacao } from './Step2Identificacao'
import { Step3Tipologia } from './Step3Tipologia'
import { Step5Localizacao } from './Step5Localizacao'
import { Step6RedesSociais } from './Step6RedesSociais'
import { Step7Foto } from './Step7Foto'
import { Step8PrivacidadeTermos } from './Step8PrivacidadeTermos'
import { Step9Revisao } from './Step9Revisao'
import { AGENT_STATUS, EDITABLE_STATUSES, SUBMITTABLE_STATUSES } from './agentStatus'

export function AgentRegisterPage() {
  // ---- Hooks (sempre na mesma ordem; nenhum return antes daqui) ----
  const { user } = useAuth()
  const { id: routeId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const toast = useToast()
  const wizard = useAgentWizard()
  const { currentStep, data, isSaving, setIsSaving, errors, setErrors, returnToReview } = wizard

  // Rascunho já existente do mesmo tipo → retomar em /:id/editar em vez de criar outro
  const wantsCollective = new URLSearchParams(location.search).get('type') === 'coletivo'
  const myAgents = useMyAgents()
  const resumable = !routeId
    ? myAgents.agents.find(
        (a) =>
          SUBMITTABLE_STATUSES.includes(a.registration_status) &&
          a.collective_type === (wantsCollective ? 'coletivo' : 'individual') &&
          (a.membership_role === 'owner' || a.membership_role === 'admin')
      )
    : undefined

  // Agente existente (retomar / editar)
  const agentQuery = useQuery({
    queryKey: ['agent-detail', routeId],
    queryFn: () => getAgentById(routeId!),
    enabled: !!routeId && !!user,
  })
  const agent = agentQuery.data ?? null

  // Hidratar o assistente uma vez por agente carregado (o estado da sessão prevalece)
  const hydratedRef = useRef<string | null>(null)
  const { hydrate, reset } = wizard
  useEffect(() => {
    if (!agent || hydratedRef.current === agent.id) return
    hydratedRef.current = agent.id
    if (data.agentId === agent.id) return // acabou de ser criado nesta sessão
    hydrate(agent)
  }, [agent, data.agentId, hydrate])

  // Saiu de /:id/editar para /cadastrar (novo cadastro) → limpar o assistente
  const prevRouteId = useRef(routeId)
  useEffect(() => {
    if (prevRouteId.current && !routeId) {
      hydratedRef.current = null
      reset()
    }
    prevRouteId.current = routeId
  }, [routeId, reset])

  // ---- Guardas (depois de todos os hooks) ----
  if (!user) return <Navigate to="/login" replace />
  if (!routeId && !data.agentId && myAgents.isLoading) return <FullPageSpinner label="Verificando cadastros existentes..." />
  if (resumable) return <Navigate to={`/painel/agentes/${resumable.id}/editar`} replace />

  if (routeId) {
    if (agentQuery.isPending) return <FullPageSpinner label="Carregando cadastro..." />
    if (agentQuery.isError) {
      return (
        <div className="max-w-lg mx-auto px-4 py-10">
          <ErrorState error={agentQuery.error} onRetry={() => agentQuery.refetch()} />
        </div>
      )
    }
    if (!agent) {
      return (
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Agente não encontrado ou sem permissão de acesso.</p>
          <Link to="/painel/agentes" className="btn btn-secondary">Voltar para meus agentes</Link>
        </div>
      )
    }
    if (!EDITABLE_STATUSES.includes(agent.registration_status)) {
      return <LockedAgentCard agentId={agent.id} status={agent.registration_status} onWithdrawn={() => agentQuery.refetch()} />
    }
    if (data.agentId !== agent.id) return <FullPageSpinner label="Preparando o assistente..." />
  }

  const agentStatus = agent?.registration_status ?? null

  const invalidateAgent = (agentId: string) => {
    qc.invalidateQueries({ queryKey: ['my-agents'] })
    qc.invalidateQueries({ queryKey: ['agent-detail', agentId] })
  }

  const afterSave = () => {
    if (returnToReview) wizard.goToStep(8)
    else wizard.nextStep()
  }

  // ============================================================
  // Auto-save da etapa atual ao avançar (etapas 1-8)
  // `patch` permite salvar valores decididos no mesmo clique (sem closure velha)
  // ============================================================
  const saveProgress = async (patch?: Partial<WizardData>) => {
    if (isSaving) return
    const d: WizardData = { ...data, ...patch }
    setIsSaving(true)
    setErrors({})
    try {
      let agentId = d.agentId
      let created = false

      if (!agentId) {
        const newAgent = await createCulturalAgent(user.id, {
          person_type: d.step1.person_type,
          collective_type: d.step1.collective_type,
        })
        agentId = newAgent.id
        created = true
        wizard.setAgentId(agentId)
      } else if (currentStep === 1) {
        await updateCulturalAgent(agentId, {
          person_type: d.step1.person_type,
          collective_type: d.step1.collective_type,
        })
      }

      const isPJ = d.step1.person_type === 'juridica'

      if (currentStep === 2) {
        await updateCulturalAgent(agentId, {
          person_type: d.step1.person_type,
          display_name: d.step2.display_name.trim() || null,
          legal_name: (isPJ ? d.step2.legal_name : d.step2.full_name).trim() || null,
          biography: d.step2.biography.trim() || null,
          phone: onlyDigits(d.step2.phone) || null,
          show_contact: d.step2.show_contact,
          birth_date: !isPJ && d.step2.birth_date ? d.step2.birth_date : null,
          gender: !isPJ ? d.step2.gender || null : null,
          race: !isPJ ? d.step2.race || null : null,
          cpf: isPJ ? null : onlyDigits(d.step2.cpf) || null,
          cnpj: isPJ ? onlyDigits(d.step2.cnpj) || null : null,
        })
      }

      if (currentStep === 3) {
        await setAgentTypologies(agentId, d.step3.typology_ids)
      }

      if (currentStep === 4 && (d.step5.city || d.step5.cep || d.step5.street)) {
        await upsertAgentAddress(agentId, {
          cep: onlyDigits(d.step5.cep) || null,
          street: d.step5.street?.trim() || null,
          number: d.step5.number?.trim() || null,
          complement: d.step5.complement?.trim() || null,
          neighborhood: d.step5.neighborhood?.trim() || null,
          city: d.step5.city?.trim() || null,
          state: d.step5.state?.trim() || null,
          lat: typeof d.step5.lat === 'number' ? d.step5.lat : null,
          lng: typeof d.step5.lng === 'number' ? d.step5.lng : null,
        })
      }

      if (currentStep === 5) {
        await setAgentSocialLinks(agentId, d.step6.links)
      }

      if (currentStep === 6) {
        if (d.step7.photoFile) {
          const url = await uploadAgentPhoto(agentId, d.step7.photoFile, d.step7.saved_photo_url)
          wizard.updateStep('step7', { photo_url: url, photoFile: null, saved_photo_url: url })
        } else if (!d.step7.photo_url && d.step7.saved_photo_url) {
          await deleteAgentPhoto(agentId, d.step7.saved_photo_url)
          wizard.updateStep('step7', { saved_photo_url: null })
        }
      }

      if (currentStep === 7) {
        await updateAgentPrivacy(agentId, {
          show_phone: d.step8.show_phone,
          show_email: d.step8.show_email,
          show_social: d.step8.show_social,
          show_address: d.step8.show_address,
          show_birthdate: d.step8.show_birthdate,
        })
        // Só registra novo aceite quando ele muda (ou a versão dos termos mudou)
        const termsChanged =
          d.step8.terms_accepted !== d.step8.saved_terms_accepted ||
          d.step8.terms_version !== d.step8.saved_terms_version
        if (termsChanged) {
          await updateCulturalAgent(agentId, {
            terms_accepted: d.step8.terms_accepted,
            terms_accepted_at: d.step8.terms_accepted ? new Date().toISOString() : null,
            terms_version: d.step8.terms_accepted ? d.step8.terms_version : null,
          })
          wizard.updateStep('step8', {
            saved_terms_accepted: d.step8.terms_accepted,
            saved_terms_version: d.step8.terms_accepted ? d.step8.terms_version : null,
          })
        }
      }

      invalidateAgent(agentId)
      afterSave()
      if (created) {
        // A URL passa a identificar o rascunho: F5 ou "voltar depois" retomam daqui
        navigate(`/painel/agentes/${agentId}/editar`, { replace: true })
      }
    } catch (err) {
      const msg = errorMessage(err, 'Não foi possível salvar esta etapa. Tente novamente.')
      setErrors({ global: msg })
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================================
  // Envio para homologação (etapa 9) — só confirma após o servidor aceitar
  // ============================================================
  const handleSubmit = async (): Promise<boolean> => {
    const agentId = data.agentId
    if (!agentId || isSaving) return false
    setIsSaving(true)
    setErrors({})
    try {
      await submitAgent(agentId)
      wizard.clearPersisted()
      invalidateAgent(agentId)
      toast.success('Cadastro concluído com sucesso.')
      return true
    } catch (err) {
      const msg = errorMessage(err, 'Não foi possível enviar o cadastro. Tente novamente.')
      setErrors({ global: msg })
      toast.error(msg)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const goToStepFromReview = (step: number) => wizard.goToStep(step, { fromReview: true })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)' }}
          aria-hidden="true"
        >
          <span className="text-slate-900 text-xs font-black">C</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
            {agent ? 'Edição do cadastro de Agente Cultural' : 'Cadastro de Agente Cultural'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Plataforma Municipal de Cultura — Água Boa/MT
          </p>
        </div>
        <Link
          to={data.agentId ? `/painel/agentes/${data.agentId}` : '/painel/agentes'}
          className="text-xs flex items-center gap-1 hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
          title="O progresso salvo fica guardado; você pode voltar depois"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          Sair
        </Link>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <WizardProgress
          currentStep={currentStep}
          disabled={isSaving}
          onGoToStep={(step) => step < currentStep && wizard.goToStep(step)}
        />

        {/* Erro global (a etapa 9 mostra o seu próprio, junto do botão) */}
        {errors.global && currentStep !== 8 && (
          <div
            role="alert"
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--error)' }}
          >
            {errors.global}
          </div>
        )}

        {currentStep === 1 && (
          <Step1TipoAgente
            data={data.step1}
            onChange={(v) => wizard.updateStep('step1', v)}
            onNext={() => saveProgress()}
            isSaving={isSaving}
            isExisting={!!data.agentId}
          />
        )}
        {currentStep === 2 && (
          <Step2Identificacao
            data={data.step2}
            step1={data.step1}
            email={user.email}
            onChange={(v) => wizard.updateStep('step2', v)}
            onPersonTypeChange={(person_type) => wizard.updateStep('step1', { person_type })}
            onNext={() => saveProgress()}
            onBack={wizard.prevStep}
            errors={errors}
            setErrors={setErrors}
            isSaving={isSaving}
          />
        )}
        {currentStep === 3 && (
          <Step3Tipologia
            data={data.step3}
            onChange={(v) => wizard.updateStep('step3', v)}
            onNext={(typology_ids) =>
              saveProgress({ step3: { ...data.step3, typology_ids, draftTip1: '', draftTip2: '', draftTip3: '' } })
            }
            onBack={wizard.prevStep}
            errors={errors}
            setErrors={setErrors}
            isSaving={isSaving}
          />
        )}
        {currentStep === 4 && (
          <Step5Localizacao
            data={data.step5}
            onChange={(v) => wizard.updateStep('step5', v)}
            onNext={() => saveProgress()}
            onBack={wizard.prevStep}
            errors={errors}
            setErrors={setErrors}
            isSaving={isSaving}
          />
        )}
        {currentStep === 5 && (
          <Step6RedesSociais
            data={data.step6}
            onChange={(v) => wizard.updateStep('step6', v)}
            onNext={() => saveProgress()}
            onBack={wizard.prevStep}
            isSaving={isSaving}
          />
        )}
        {currentStep === 6 && (
          <Step7Foto
            data={data.step7}
            onChange={(v) => wizard.updateStep('step7', v)}
            onNext={() => saveProgress()}
            onBack={wizard.prevStep}
            isSaving={isSaving}
          />
        )}
        {currentStep === 7 && (
          <Step8PrivacidadeTermos
            data={data.step8}
            onChange={(v) => wizard.updateStep('step8', v)}
            onNext={() => saveProgress()}
            onBack={wizard.prevStep}
            errors={errors}
            setErrors={setErrors}
            isSaving={isSaving}
          />
        )}
        {currentStep === 8 && (
          <Step9Revisao
            data={data}
            agentStatus={agentStatus}
            onBack={wizard.prevStep}
            onGoToStep={goToStepFromReview}
            onSubmit={handleSubmit}
            isSaving={isSaving}
            globalError={errors.global}
          />
        )}
      </div>
    </div>
  )
}

/** Cadastro na fila da Secretaria (ou suspenso): não pode ser editado pelo assistente. */
function LockedAgentCard({
  agentId,
  status,
  onWithdrawn,
}: {
  agentId: string
  status: keyof typeof AGENT_STATUS
  onWithdrawn: () => void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [withdrawing, setWithdrawing] = useState(false)
  const meta = AGENT_STATUS[status]
  const canWithdraw = status === 'enviado'

  const handleWithdraw = async () => {
    const ok = await confirm({
      title: 'Retirar o cadastro da fila de análise?',
      message: 'O cadastro volta para rascunho. Você poderá editar e enviar novamente quando quiser.',
      confirmLabel: 'Retirar envio',
    })
    if (!ok) return
    setWithdrawing(true)
    try {
      await withdrawAgent(agentId)
      qc.invalidateQueries({ queryKey: ['my-agents'] })
      qc.invalidateQueries({ queryKey: ['agent-detail', agentId] })
      toast.success('Envio retirado. O cadastro voltou para rascunho.')
      onWithdrawn()
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível retirar o envio.'))
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="card p-6 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--bg-secondary)' }}
          aria-hidden="true"
        >
          <Lock size={24} style={{ color: 'var(--text-muted)' }} />
        </div>
        <span className={`badge ${meta.color} mb-3`}>{meta.label}</span>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Este cadastro não pode ser editado agora
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{meta.description}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to={`/painel/agentes/${agentId}`} className="btn btn-secondary">
            <ArrowLeft size={15} aria-hidden="true" />
            Ver agente
          </Link>
          {canWithdraw && (
            <LoadingButton type="button" onClick={handleWithdraw} loading={withdrawing} className="btn btn-primary">
              <Undo2 size={15} aria-hidden="true" />
              Retirar envio e editar
            </LoadingButton>
          )}
        </div>
      </div>
    </div>
  )
}
