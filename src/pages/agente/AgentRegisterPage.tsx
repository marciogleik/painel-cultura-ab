import { useAuth } from '@/contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { useAgentWizard } from './useAgentWizard'
import { WizardProgress } from './WizardProgress'
import { Step1TipoAgente } from './Step1TipoAgente'
import { Step2Identificacao } from './Step2Identificacao'
import { Step3Tipologia } from './Step3Tipologia'
import { Step4Areas } from './Step4Areas'
import { Step5Localizacao } from './Step5Localizacao'
import { Step6RedesSociais } from './Step6RedesSociais'
import { Step7Foto } from './Step7Foto'
import { Step8PrivacidadeTermos } from './Step8PrivacidadeTermos'
import { Step9Revisao } from './Step9Revisao'
import {
  createCulturalAgent,
  updateCulturalAgent,
  upsertAgentAddress,
  setAgentTypologies,
  setAgentAreas,
  setAgentSocialLinks,
  updateAgentPrivacy,
  uploadAgentPhoto,
  submitAgent,
} from '@/services/culturalAgentService'

export function AgentRegisterPage() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  const wizard = useAgentWizard()
  const { currentStep, data, isSaving, setIsSaving, errors, setErrors } = wizard

  // ============================================================
  // Auto-save do agente ao avançar dos steps 1-8
  // ============================================================
  const saveProgress = async (targetStep: number) => {
    if (isSaving) return
    setIsSaving(true)
    try {
      // Passo 1→2: criar agente draft se ainda não existe
      if (!wizard.data.agentId && targetStep >= 2) {
        const agent = await createCulturalAgent(user.id, {
          person_type: data.step1.person_type,
          collective_type: data.step1.collective_type,
        })
        wizard.setAgentId(agent.id)
      }

      const agentId = wizard.data.agentId
      if (!agentId) { wizard.nextStep(); return }

      // Salvar dados do step atual antes de avançar
      if (currentStep === 2) {
        await updateCulturalAgent(agentId, {
          display_name: data.step2.display_name || null,
          legal_name: data.step2.legal_name || null,
          biography: data.step2.biography || null,
          phone: data.step2.phone || null,
          show_contact: data.step2.show_contact,
          birth_date: data.step2.birth_date || null,
          gender: data.step2.gender || null,
          race: data.step2.race || null,
          cpf: data.step2.cpf || null,
          cnpj: data.step2.cnpj || null,
        })
      }

      if (currentStep === 3) {
        await setAgentTypologies(agentId, data.step3.typology_ids)
      }

      if (currentStep === 4) {
        await setAgentAreas(agentId, data.step4.category_ids)
      }

      if (currentStep === 5 && (data.step5.city || data.step5.cep)) {
        await upsertAgentAddress(agentId, data.step5)
      }

      if (currentStep === 6) {
        await setAgentSocialLinks(agentId, data.step6.links)
      }

      if (currentStep === 7 && data.step7.photoFile) {
        const url = await uploadAgentPhoto(agentId, data.step7.photoFile)
        wizard.updateStep('step7', { photo_url: url, photoFile: null })
      }

      if (currentStep === 8) {
        await updateAgentPrivacy(agentId, {
          show_phone: data.step8.show_phone,
          show_email: data.step8.show_email,
          show_social: data.step8.show_social,
          show_address: data.step8.show_address,
          show_birthdate: data.step8.show_birthdate,
        })
        await updateCulturalAgent(agentId, {
          terms_accepted: data.step8.terms_accepted,
          terms_accepted_at: new Date().toISOString(),
          terms_version: data.step8.terms_version,
        })
      }

      wizard.nextStep()
    } catch (err: any) {
      console.error('Erro ao salvar step:', err)
      setErrors({ global: err.message ?? 'Erro ao salvar. Tente novamente.' })
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================================
  // Submit final (step 9)
  // ============================================================
  const handleSubmit = async () => {
    if (!wizard.data.agentId) return
    setIsSaving(true)
    try {
      await submitAgent(wizard.data.agentId)
    } catch (err: any) {
      setErrors({ global: err.message ?? 'Erro ao enviar.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <span className="text-slate-900 text-xs font-black">C</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            Cadastro de Agente Cultural
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Plataforma Municipal de Cultura — Água Boa/MT
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <WizardProgress
          currentStep={currentStep}
          onGoToStep={(step) => step < currentStep && wizard.goToStep(step)}
        />

        {/* Error global */}
        {errors.global && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: 'var(--error)',
            }}
          >
            {errors.global}
          </div>
        )}

        {/* Steps */}
        {currentStep === 1 && (
          <Step1TipoAgente
            data={data.step1}
            onChange={(v) => wizard.updateStep('step1', v)}
            onNext={() => saveProgress(2)}
          />
        )}
        {currentStep === 2 && (
          <Step2Identificacao
            data={data.step2}
            step1={data.step1}
            onChange={(v) => wizard.updateStep('step2', v)}
            onNext={() => saveProgress(3)}
            onBack={wizard.prevStep}
            errors={errors}
          />
        )}
        {currentStep === 3 && (
          <Step3Tipologia
            data={data.step3}
            onChange={(v) => wizard.updateStep('step3', v)}
            onNext={() => saveProgress(4)}
            onBack={wizard.prevStep}
          />
        )}
        {currentStep === 4 && (
          <Step4Areas
            data={data.step4}
            onChange={(v) => wizard.updateStep('step4', v)}
            onNext={() => saveProgress(5)}
            onBack={wizard.prevStep}
          />
        )}
        {currentStep === 5 && (
          <Step5Localizacao
            data={data.step5}
            onChange={(v) => wizard.updateStep('step5', v)}
            onNext={() => saveProgress(6)}
            onBack={wizard.prevStep}
          />
        )}
        {currentStep === 6 && (
          <Step6RedesSociais
            data={data.step6}
            onChange={(v) => wizard.updateStep('step6', v)}
            onNext={() => saveProgress(7)}
            onBack={wizard.prevStep}
          />
        )}
        {currentStep === 7 && (
          <Step7Foto
            data={data.step7}
            agentId={data.agentId}
            onChange={(v) => wizard.updateStep('step7', v)}
            onNext={() => saveProgress(8)}
            onBack={wizard.prevStep}
          />
        )}
        {currentStep === 8 && (
          <Step8PrivacidadeTermos
            data={data.step8}
            onChange={(v) => wizard.updateStep('step8', v)}
            onNext={() => saveProgress(9)}
            onBack={wizard.prevStep}
            errors={errors}
          />
        )}
        {currentStep === 9 && (
          <Step9Revisao
            data={data}
            agentId={data.agentId}
            onBack={wizard.prevStep}
            onGoToStep={wizard.goToStep}
            onSubmit={handleSubmit}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  )
}
