import { isValidCPF, isValidCNPJ, calculateAge, todayISO } from '@/lib/utils'
import type { WizardStep2 } from './useAgentWizard'

export const GENDER_OPTIONS = [
  { value: '', label: 'Prefiro não informar' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'nao_binario', label: 'Não-binário' },
  { value: 'lgbtqia', label: 'LGBTQIA+' },
  { value: 'outro', label: 'Outro' },
]

/** Padrão IBGE */
export const RACE_OPTIONS = [
  { value: '', label: 'Prefiro não informar' },
  { value: 'branca', label: 'Branca' },
  { value: 'preta', label: 'Preta' },
  { value: 'parda', label: 'Parda' },
  { value: 'amarela', label: 'Amarela' },
  { value: 'indigena', label: 'Indígena' },
]

/**
 * Validação da etapa 2 (Identificação).
 * - PF: nome completo + CPF válido; data de nascimento não pode estar no futuro.
 * - PJ: razão social + CNPJ válido.
 * Os documentos chegam apenas com dígitos (a máscara é só visual).
 */
export function validateStep2(
  data: WizardStep2,
  isPJ: boolean,
  isCollective: boolean = false
): Record<string, string> {
  const errs: Record<string, string> = {}

  if (!data.display_name.trim()) {
    errs.display_name = isCollective ? 'Informe o nome da companhia ou grupo.' : 'Informe o nome de exibição.'
  } else if (data.display_name.trim().length < 2) {
    errs.display_name = 'O nome de exibição precisa ter pelo menos 2 caracteres.'
  }

  if (isPJ) {
    if (!data.legal_name.trim()) errs.legal_name = 'Informe a razão social ou nome da entidade.'
    if (!data.cnpj) errs.cnpj = 'Informe o CNPJ.'
    else if (!isValidCNPJ(data.cnpj)) errs.cnpj = 'CNPJ inválido. Confira os 14 dígitos.'
  } else {
    if (!data.full_name.trim()) {
      errs.full_name = isCollective ? 'Informe o nome do responsável pelo grupo.' : 'Informe o nome completo.'
    }
    if (!data.cpf) errs.cpf = 'Informe o CPF.'
    else if (!isValidCPF(data.cpf)) errs.cpf = 'CPF inválido. Confira os 11 dígitos.'

    if (data.birth_date) {
      if (data.birth_date > todayISO()) errs.birth_date = 'A data de nascimento não pode estar no futuro.'
      else {
        const age = calculateAge(data.birth_date)
        if (age === null || age < 0 || age > 130) errs.birth_date = 'Data de nascimento inválida.'
      }
    }
  }

  if (data.phone && data.phone.length < 10) errs.phone = 'Informe o telefone com DDD (10 ou 11 dígitos).'

  return errs
}
