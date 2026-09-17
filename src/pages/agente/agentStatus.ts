import type { AgentRegistrationStatus } from '@/types'

export interface AgentStatusMeta {
  label: string
  /** Classe .badge-* do index.css */
  color: 'badge-slate' | 'badge-blue' | 'badge-amber' | 'badge-green' | 'badge-red'
  description: string
}

/**
 * Rótulo, cor e explicação de cada status de homologação.
 * Compartilhado entre o painel do agente e o painel administrativo.
 */
export const AGENT_STATUS: Record<AgentRegistrationStatus, AgentStatusMeta> = {
  rascunho: {
    label: 'Rascunho',
    color: 'badge-slate',
    description: 'Cadastro ainda não foi enviado para análise. Complete as etapas e envie quando estiver pronto.',
  },
  enviado: {
    label: 'Enviado',
    color: 'badge-blue',
    description: 'Aguardando análise da Secretaria de Esporte, Cultura, Lazer e Eventos.',
  },
  em_analise: {
    label: 'Em análise',
    color: 'badge-amber',
    description: 'A equipe da Secretaria está revisando o cadastro.',
  },
  aprovado: {
    label: 'Aprovado',
    color: 'badge-green',
    description: 'Cadastro ativo e publicado no Mapa Cultural.',
  },
  rejeitado: {
    label: 'Devolvido',
    color: 'badge-red',
    description: 'O cadastro foi devolvido para correção. Consulte as observações da Secretaria, ajuste e envie novamente.',
  },
  suspenso: {
    label: 'Suspenso',
    color: 'badge-red',
    description: 'Perfil suspenso pela Secretaria. Entre em contato para mais informações.',
  },
}

/** Status em que o dono pode editar o cadastro pelo assistente. */
export const EDITABLE_STATUSES: AgentRegistrationStatus[] = ['rascunho', 'rejeitado', 'aprovado']

/** Status em que o cadastro ainda pode ser enviado para homologação. */
export const SUBMITTABLE_STATUSES: AgentRegistrationStatus[] = ['rascunho', 'rejeitado']

/** Status em que o cadastro está na fila da Secretaria. */
export const PENDING_STATUSES: AgentRegistrationStatus[] = ['enviado', 'em_analise']

export const ROLE_LABELS: Record<'owner' | 'admin' | 'member' | 'viewer', string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
  viewer: 'Visualizador',
}
