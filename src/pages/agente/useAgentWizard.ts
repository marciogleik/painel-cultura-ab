import { useState, useCallback } from 'react'
import type {
  AgentPersonType,
  AgentCollectiveType,
  AgentAddress,
  AgentSocialLink,
  AgentOnboardingStep,
} from '@/types'

// ============================================================
// Estado do wizard — cada etapa é um slice do estado global
// ============================================================

export interface WizardStep1 {
  person_type: AgentPersonType
  collective_type: AgentCollectiveType
}

export interface WizardStep2 {
  display_name: string
  legal_name: string
  biography: string
  birth_date: string
  gender: string
  race: string
  phone: string
  show_contact: boolean
  cpf: string
  cnpj: string
}

export interface WizardStep3 {
  typology_ids: string[]
}

export interface WizardStep4 {
  category_ids: string[]
}

export interface WizardStep5 extends Partial<AgentAddress> {}

export interface WizardStep6 {
  links: Pick<AgentSocialLink, 'platform' | 'url' | 'username'>[]
}

export interface WizardStep7 {
  photo_url: string | null
  photoFile: File | null
}

export interface WizardStep8 {
  show_phone: boolean
  show_email: boolean
  show_social: boolean
  show_address: boolean
  show_birthdate: boolean
  terms_accepted: boolean
  terms_version: string
}

export interface WizardData {
  step1: WizardStep1
  step2: WizardStep2
  step3: WizardStep3
  step4: WizardStep4
  step5: WizardStep5
  step6: WizardStep6
  step7: WizardStep7
  step8: WizardStep8
  agentId: string | null
}

const INITIAL_DATA: WizardData = {
  step1: {
    person_type: 'fisica',
    collective_type: 'individual',
  },
  step2: {
    display_name: '',
    legal_name: '',
    biography: '',
    birth_date: '',
    gender: '',
    race: '',
    phone: '',
    show_contact: false,
    cpf: '',
    cnpj: '',
  },
  step3: { typology_ids: [] },
  step4: { category_ids: [] },
  step5: {},
  step6: { links: [] },
  step7: { photo_url: null, photoFile: null },
  step8: {
    show_phone: false,
    show_email: false,
    show_social: true,
    show_address: false,
    show_birthdate: false,
    terms_accepted: false,
    terms_version: '1.0',
  },
  agentId: null,
}

export const WIZARD_STEP_LABELS: Record<number, string> = {
  1: 'Tipo de Agente',
  2: 'Identificação',
  3: 'Tipologia',
  4: 'Áreas de Atuação',
  5: 'Localização',
  6: 'Redes Sociais',
  7: 'Foto',
  8: 'Privacidade e Termos',
  9: 'Revisão',
}

export const TOTAL_STEPS = 9

export type StepKey = keyof Pick<WizardData, 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'step8'>

export function useAgentWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<WizardData>(INITIAL_DATA)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateStep = useCallback(<K extends StepKey>(
    stepKey: K,
    values: Partial<WizardData[K]>
  ) => {
    setData((prev) => ({
      ...prev,
      [stepKey]: { ...prev[stepKey], ...values },
    }))
    setErrors({})
  }, [])

  const setAgentId = useCallback((id: string) => {
    setData((prev) => ({ ...prev, agentId: id }))
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const completionMap: Record<AgentOnboardingStep, boolean> = {
    dados_basicos: !!data.step2.display_name,
    foto: !!data.step7.photo_url,
    tipologia: data.step3.typology_ids.length > 0,
    areas: data.step4.category_ids.length > 0,
    endereco: !!(data.step5.city && data.step5.state),
    redes_sociais: data.step6.links.length > 0,
    apresentacao: data.step2.biography.length >= 50,
  }

  const completedCount = Object.values(completionMap).filter(Boolean).length
  const completionPercent = Math.round((completedCount / Object.keys(completionMap).length) * 100)

  return {
    currentStep,
    data,
    isSaving,
    setIsSaving,
    errors,
    setErrors,
    updateStep,
    setAgentId,
    nextStep,
    prevStep,
    goToStep,
    completionPercent,
    completionMap,
  }
}
