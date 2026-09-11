import { formatCNPJ, formatCPF } from '@/lib/utils'
import type { AgentRegistrationStatus, AgentTypology, CulturalAgent } from '@/types'

export interface StatusMeta {
  label: string
  badge: string
  desc: string
}

export const STATUS_META: Record<AgentRegistrationStatus, StatusMeta> = {
  rascunho: { label: 'Rascunho', badge: 'badge-slate', desc: 'Em preenchimento pelo agente' },
  enviado: { label: 'Aguardando homologação', badge: 'badge-blue', desc: 'Enviado para análise da Secretaria' },
  em_analise: { label: 'Em análise', badge: 'badge-amber', desc: 'Em avaliação técnica pela Secretaria' },
  aprovado: { label: 'Aprovado', badge: 'badge-green', desc: 'Homologado; pode aparecer no mapa cultural' },
  rejeitado: { label: 'Devolvido para ajustes', badge: 'badge-red', desc: 'Devolvido com parecer para correção' },
  suspenso: { label: 'Suspenso', badge: 'badge-red', desc: 'Cadastro suspenso pela Secretaria' },
}

export const ALL_STATUSES = Object.keys(STATUS_META) as AgentRegistrationStatus[]

/** Decisões possíveis a partir de cada status (RPC review_agent). */
export type ReviewDecision = 'aprovado' | 'rejeitado' | 'em_analise' | 'suspenso'

export function decisionsFor(status: AgentRegistrationStatus): ReviewDecision[] {
  switch (status) {
    case 'enviado': return ['em_analise', 'rejeitado', 'aprovado']
    case 'em_analise': return ['rejeitado', 'aprovado']
    case 'aprovado': return ['suspenso']
    case 'suspenso': return ['aprovado']
    default: return []
  }
}

/** Identificador curto exibido para servidores e agentes. */
export function protocolOf(id: string): string {
  return `SMIIC-${id.slice(0, 8).toUpperCase()}`
}

export function documentOf(agent: Pick<CulturalAgent, 'cpf' | 'cnpj' | 'person_type'>): string {
  if (agent.person_type === 'juridica') return agent.cnpj ? formatCNPJ(agent.cnpj) : 'CNPJ não informado'
  return agent.cpf ? formatCPF(agent.cpf) : 'CPF não informado'
}

export function personTypeLabel(agent: Pick<CulturalAgent, 'person_type' | 'collective_type'>): string {
  const pt = agent.person_type === 'fisica' ? 'Pessoa física' : 'Pessoa jurídica'
  const ct = agent.collective_type === 'coletivo' ? 'Coletivo' : 'Individual'
  return `${pt} · ${ct}`
}

/** id da tipologia -> caminho completo (Nível 1 › Nível 2 › Nível 3). */
export type TypologyPaths = Map<string, string[]>

export function typologyLabel(t: AgentTypology, paths: TypologyPaths): string {
  const path = paths.get(t.typology_id)
  if (path?.length) return path.join(' › ')
  return t.cultural_typologies?.name ?? 'Tipologia'
}
