import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  AgentPersonType,
  AgentCollectiveType,
  AgentAddress,
  AgentSocialLink,
  AgentOnboardingStep,
  CulturalAgentWithRelations,
} from '@/types'
import { onlyDigits } from '@/lib/utils'

// ============================================================
// Estado do wizard — cada etapa é um slice do estado global
// ============================================================

export interface WizardStep1 {
  person_type: AgentPersonType
  collective_type: AgentCollectiveType
}

export interface WizardStep2 {
  display_name: string
  /** Nome completo (pessoa física) — gravado em legal_name */
  full_name: string
  /** Razão social (pessoa jurídica) */
  legal_name: string
  biography: string
  birth_date: string
  gender: string
  race: string
  /** Apenas dígitos */
  phone: string
  show_contact: boolean
  /** Apenas dígitos */
  cpf: string
  /** Apenas dígitos */
  cnpj: string
}

export interface WizardStep3 {
  typology_ids: string[]
  /** Seleções em andamento no modo de listas (para não perder ao voltar) */
  draftTip1: string
  draftTip2: string
  draftTip3: string
}


export type WizardStep5 = Partial<
  Pick<AgentAddress, 'cep' | 'street' | 'number' | 'complement' | 'neighborhood' | 'city' | 'state' | 'lat' | 'lng'>
>

export interface WizardStep6 {
  links: Pick<AgentSocialLink, 'platform' | 'url' | 'username'>[]
}

export interface WizardStep7 {
  /** URL da foto atual (null = sem foto). Igual a saved_photo_url até o usuário trocar/remover. */
  photo_url: string | null
  /** Arquivo escolhido e ainda não enviado */
  photoFile: File | null
  /** URL gravada no banco — usada para apagar o arquivo antigo ao trocar/remover */
  saved_photo_url: string | null
}

export interface WizardStep8 {
  show_phone: boolean
  show_email: boolean
  show_social: boolean
  show_address: boolean
  show_birthdate: boolean
  terms_accepted: boolean
  terms_version: string
  /** Como estava no banco — para não sobrescrever terms_accepted_at à toa */
  saved_terms_accepted: boolean
  saved_terms_version: string | null
}

export interface WizardData {
  step1: WizardStep1
  step2: WizardStep2
  step3: WizardStep3
  step5: WizardStep5
  step6: WizardStep6
  step7: WizardStep7
  step8: WizardStep8
  agentId: string | null
}

export const TERMS_VERSION = '1.0'

const INITIAL_DATA: WizardData = {
  step1: {
    person_type: 'fisica',
    collective_type: 'individual',
  },
  step2: {
    display_name: '',
    full_name: '',
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
  step3: { typology_ids: [], draftTip1: '', draftTip2: '', draftTip3: '' },
  step5: { city: 'Água Boa', state: 'MT' },
  step6: { links: [] },
  step7: { photo_url: null, photoFile: null, saved_photo_url: null },
  step8: {
    show_phone: false,
    show_email: false,
    show_social: true,
    show_address: false,
    show_birthdate: false,
    terms_accepted: false,
    terms_version: TERMS_VERSION,
    saved_terms_accepted: false,
    saved_terms_version: null,
  },
  agentId: null,
}

export const WIZARD_STEP_LABELS: Record<number, string> = {
  1: 'Tipo de Agente',
  2: 'Identificação',
  3: 'Tipologia',
  4: 'Localização',
  5: 'Redes Sociais',
  6: 'Foto',
  7: 'Privacidade e Termos',
  8: 'Revisão',
}

export const TOTAL_STEPS = 8

export type StepKey = keyof Pick<WizardData, 'step1' | 'step2' | 'step3' | 'step5' | 'step6' | 'step7' | 'step8'>

// ============================================================
// Persistência em localStorage (fechar a aba não perde o progresso)
// ============================================================

interface PersistedWizard {
  step: number
  data: WizardData
}

const storageKey = (agentId: string) => `agent-wizard:${agentId}`

function readPersisted(agentId: string): PersistedWizard | null {
  try {
    const raw = localStorage.getItem(storageKey(agentId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedWizard>
    if (!parsed || typeof parsed.step !== 'number' || !parsed.data) return null
    return { step: parsed.step, data: parsed.data }
  } catch {
    return null
  }
}

function writePersisted(agentId: string, step: number, data: WizardData) {
  try {
    const serializable: WizardData = {
      ...data,
      step7: { ...data.step7, photoFile: null },
    }
    localStorage.setItem(storageKey(agentId), JSON.stringify({ step, data: serializable }))
  } catch {
    // localStorage indisponível (modo privado etc.) — segue sem persistir
  }
}

export function clearPersistedWizard(agentId: string | null) {
  if (!agentId) return
  try {
    localStorage.removeItem(storageKey(agentId))
  } catch {
    // ignorar
  }
}

// ============================================================
// Agente do banco -> estado do wizard
// ============================================================

export function wizardDataFromAgent(agent: CulturalAgentWithRelations): WizardData {
  const isPJ = agent.person_type === 'juridica'
  const address = agent.address
  const privacy = agent.privacy
  return {
    agentId: agent.id,
    step1: {
      person_type: agent.person_type,
      collective_type: agent.collective_type,
    },
    step2: {
      display_name: agent.display_name ?? '',
      full_name: isPJ ? '' : agent.legal_name ?? '',
      legal_name: isPJ ? agent.legal_name ?? '' : '',
      biography: agent.biography ?? '',
      birth_date: agent.birth_date ?? '',
      gender: agent.gender ?? '',
      race: agent.race ?? '',
      phone: onlyDigits(agent.phone),
      show_contact: !!agent.show_contact,
      cpf: onlyDigits(agent.cpf),
      cnpj: onlyDigits(agent.cnpj),
    },
    step3: {
      typology_ids: (agent.typologies ?? []).map((t) => t.typology_id),
      draftTip1: '',
      draftTip2: '',
      draftTip3: '',
    },
    step5: address
      ? {
          cep: onlyDigits(address.cep) || null,
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city ?? INITIAL_DATA.step5.city,
          state: address.state ?? INITIAL_DATA.step5.state,
          lat: address.lat,
          lng: address.lng,
        }
      : { ...INITIAL_DATA.step5 },
    step6: {
      links: (agent.social_links ?? []).map((l) => ({ platform: l.platform, url: l.url, username: l.username })),
    },
    step7: { photo_url: agent.photo_url, photoFile: null, saved_photo_url: agent.photo_url },
    step8: {
      show_phone: privacy?.show_phone ?? false,
      show_email: privacy?.show_email ?? false,
      show_social: privacy?.show_social ?? true,
      show_address: privacy?.show_address ?? false,
      show_birthdate: privacy?.show_birthdate ?? false,
      terms_accepted: !!agent.terms_accepted,
      terms_version: TERMS_VERSION,
      saved_terms_accepted: !!agent.terms_accepted,
      saved_terms_version: agent.terms_version,
    },
  }
}

/** Estado inicial de um cadastro novo; `?type=coletivo` pré-seleciona companhia/grupo. */
function initialDataFromUrl(): WizardData {
  try {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('type') === 'coletivo') {
      return { ...INITIAL_DATA, step1: { person_type: 'fisica', collective_type: 'coletivo' } }
    }
  } catch {
    // window indisponível — segue com o padrão
  }
  return INITIAL_DATA
}

// ============================================================
// Hook
// ============================================================

export function useAgentWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<WizardData>(() => initialDataFromUrl())
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  /** Quando true, salvar a etapa atual volta para a revisão em vez de avançar */
  const [returnToReview, setReturnToReview] = useState(false)

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

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const nextStep = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS))
    scrollTop()
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1))
    scrollTop()
  }, [])

  const goToStep = useCallback((step: number, options?: { fromReview?: boolean }) => {
    setCurrentStep(Math.min(Math.max(step, 1), TOTAL_STEPS))
    setReturnToReview(!!options?.fromReview)
    setErrors({})
    scrollTop()
  }, [])

  /**
   * Carrega um agente existente. Se houver progresso salvo na sessão para este
   * agente (F5 no meio do cadastro), ele prevalece sobre o banco e a etapa é restaurada.
   */
  const hydrate = useCallback((agent: CulturalAgentWithRelations) => {
    const fromServer = wizardDataFromAgent(agent)
    const persisted = readPersisted(agent.id)
    if (persisted && persisted.data.agentId === agent.id) {
      setData({
        ...fromServer,
        ...persisted.data,
        // O arquivo nunca sobrevive ao reload; a URL gravada vem do banco
        step7: {
          photo_url: persisted.data.step7?.photo_url === null ? null : fromServer.step7.photo_url,
          photoFile: null,
          saved_photo_url: fromServer.step7.saved_photo_url,
        },
        step8: {
          ...persisted.data.step8,
          saved_terms_accepted: fromServer.step8.saved_terms_accepted,
          saved_terms_version: fromServer.step8.saved_terms_version,
        },
        agentId: agent.id,
      })
      setCurrentStep(Math.min(Math.max(persisted.step, 1), TOTAL_STEPS))
    } else {
      setData(fromServer)
      let firstMissing = 1
      if (agent.person_type) firstMissing = 2
      if (fromServer.step2.display_name) firstMissing = 3
      if (fromServer.step3.typology_ids.length > 0) firstMissing = 4
      
      if (fromServer.step5.city && fromServer.step5.state) {
        if (fromServer.step8.terms_accepted) {
          firstMissing = 8 // Revisão (tudo pronto)
        } else if (fromServer.step7.photo_url || fromServer.step7.saved_photo_url) {
          firstMissing = 7 // Foto preenchida, falta Privacidade
        } else if (fromServer.step6.links.length > 0) {
          firstMissing = 6 // Redes sociais preenchidas, falta Foto
        } else {
          firstMissing = 5 // Localização preenchida, ir para Redes Sociais
        }
      }
      
      setCurrentStep(firstMissing)
    }
    setErrors({})
    setReturnToReview(false)
  }, [])

  /** Volta ao estado inicial (relendo `?type=coletivo` da URL para um novo cadastro). */
  const reset = useCallback(() => {
    setData(initialDataFromUrl())
    setCurrentStep(1)
    setErrors({})
    setReturnToReview(false)
    setIsSaving(false)
  }, [])

  const clearPersisted = useCallback(() => {
    clearPersistedWizard(data.agentId)
  }, [data.agentId])

  // Persistir a cada mudança (somente depois que o agente existe no banco)
  useEffect(() => {
    if (!data.agentId) return
    writePersisted(data.agentId, currentStep, data)
  }, [data, currentStep])

  const completionMap = useMemo<Record<AgentOnboardingStep, boolean>>(() => ({
    dados_basicos: !!data.step2.display_name,
    foto: !!data.step7.photo_url || !!data.step7.photoFile,
    tipologia: data.step3.typology_ids.length > 0,
    endereco: !!(data.step5.city && data.step5.state),
    redes_sociais: data.step6.links.length > 0,
    apresentacao: data.step2.biography.length >= 50,
  }), [data])

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
    hydrate,
    reset,
    clearPersisted,
    returnToReview,
    setReturnToReview,
    completionPercent,
    completionMap,
  }
}
