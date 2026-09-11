import type { InscriptionStatus } from '@/types'

export interface InscriptionStatusInfo {
  label: string
  /** Classe do badge (.badge-*) */
  badge: string
  description: string
}

/** Rótulos e cores dos status de inscrição. Compartilhado entre o painel do agente e a administração. */
export const INSCRIPTION_STATUS: Record<InscriptionStatus, InscriptionStatusInfo> = {
  ABERTO: { label: 'Enviada', badge: 'badge-blue', description: 'Inscrição recebida, aguardando análise' },
  EM_ANALISE: { label: 'Em análise', badge: 'badge-amber', description: 'A comissão está avaliando a inscrição' },
  APROVADO: { label: 'Aprovada', badge: 'badge-green', description: 'Inscrição aprovada pela comissão' },
  REPROVADO: { label: 'Reprovada', badge: 'badge-red', description: 'Inscrição não aprovada' },
  FINALIZADO: { label: 'Finalizada', badge: 'badge-slate', description: 'Processo encerrado' },
}

export const INSCRIPTION_STATUS_ORDER: InscriptionStatus[] = ['ABERTO', 'EM_ANALISE', 'APROVADO', 'REPROVADO', 'FINALIZADO']

export function inscriptionStatusInfo(status: string): InscriptionStatusInfo {
  return INSCRIPTION_STATUS[status as InscriptionStatus] ?? { label: status, badge: 'badge-slate', description: '' }
}
