import { supabase } from '@/lib/supabase'
import { sanitizeSearch, safeUrl } from '@/lib/utils'
import type {
  CulturalAgent,
  CulturalAgentWithRelations,
  PublicCulturalAgent,
  AgentAddress,
  AgentMembership,
  AgentMembershipRole,
  AgentNotification,
  AgentRegistrationStatus,
  CulturalTypology,
  AgentSocialLink,
  AgentPrivacy,
  AgentCompletionStatus,
  AgentOnboardingStep,
  PaginatedResponse,
} from '@/types'

// ============================================================
// Seleções reutilizáveis
// ============================================================

/** Relações embutidas para a tabela cultural_agents (dono, membros, servidores). */
const AGENT_RELATIONS = `
  agent_addresses(*),
  agent_typologies(*, cultural_typologies(*)),
  agent_areas(*, categories(*)),
  agent_social_links(*),
  agent_privacy(*)
`

/** Relações embutidas para a view public_cultural_agents (qualquer visitante). */
const PUBLIC_RELATIONS = `
  agent_typologies(*, cultural_typologies(*)),
  agent_areas(*, categories(*)),
  agent_social_links(*)
`

type RawAgentRow = Record<string, unknown> & {
  agent_addresses?: AgentAddress[] | AgentAddress | null
  agent_typologies?: CulturalAgentWithRelations['typologies']
  agent_areas?: CulturalAgentWithRelations['areas']
  agent_social_links?: AgentSocialLink[]
  agent_privacy?: AgentPrivacy[] | AgentPrivacy | null
  agent_memberships?: AgentMembership[]
}

function first<T>(value: T[] | T | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * O PostgREST devolve as relações com o nome da tabela (agent_addresses, ...).
 * O restante do app trabalha com nomes curtos (address, typologies, ...).
 * Toda leitura passa por aqui, então nenhuma página precisa conhecer o formato cru.
 */
export function normalizeAgent(row: RawAgentRow): CulturalAgentWithRelations {
  const {
    agent_addresses,
    agent_typologies,
    agent_areas,
    agent_social_links,
    agent_privacy,
    agent_memberships,
    ...rest
  } = row
  return {
    ...(rest as unknown as CulturalAgent),
    address: first(agent_addresses),
    typologies: agent_typologies ?? [],
    areas: agent_areas ?? [],
    social_links: agent_social_links ?? [],
    privacy: first(agent_privacy),
    memberships: agent_memberships ?? [],
  }
}

export function normalizePublicAgent(row: RawAgentRow): PublicCulturalAgent {
  const { agent_typologies, agent_areas, agent_social_links, ...rest } = row
  return {
    ...(rest as unknown as PublicCulturalAgent),
    typologies: agent_typologies ?? [],
    areas: agent_areas ?? [],
    social_links: agent_social_links ?? [],
  }
}

// ============================================================
// Listagem pública (view sem dados sensíveis)
// ============================================================

export interface AgentFilters {
  search?: string
  category_id?: string
  typology_id?: string
  person_type?: 'fisica' | 'juridica'
  collective_type?: 'individual' | 'coletivo'
  city?: string
  registration_status?: AgentRegistrationStatus | ''
  page?: number
  pageSize?: number
}

export async function getPublicAgents(
  filters: AgentFilters = {}
): Promise<PaginatedResponse<PublicCulturalAgent>> {
  const { search, category_id, typology_id, person_type, collective_type, city, page = 1, pageSize = 12 } = filters

  // `!inner` faz o filtro na relação restringir os agentes devolvidos
  const select = `*,
    agent_typologies${typology_id ? '!inner' : ''}(*, cultural_typologies(*)),
    agent_areas${category_id ? '!inner' : ''}(*, categories(*)),
    agent_social_links(*)`

  let query = supabase.from('public_cultural_agents').select(select, { count: 'exact' })

  const term = search ? sanitizeSearch(search) : ''
  if (term) query = query.textSearch('search_vector', term, { type: 'websearch', config: 'portuguese' })
  if (person_type) query = query.eq('person_type', person_type)
  if (collective_type) query = query.eq('collective_type', collective_type)
  if (city) query = query.ilike('city', `%${sanitizeSearch(city)}%`)
  if (typology_id) query = query.eq('agent_typologies.typology_id', typology_id)
  if (category_id) query = query.eq('agent_areas.category_id', category_id)

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })

  const { data, count, error } = await query
  if (error) throw error

  return {
    data: ((data ?? []) as unknown as RawAgentRow[]).map(normalizePublicAgent),
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getPublicAgentById(id: string): Promise<PublicCulturalAgent | null> {
  const { data, error } = await supabase
    .from('public_cultural_agents')
    .select(`*, ${PUBLIC_RELATIONS}`)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? normalizePublicAgent(data as unknown as RawAgentRow) : null
}

/** Contagens públicas para a home / indicadores. */
export async function countPublicAgents(): Promise<number> {
  const { count, error } = await supabase
    .from('public_cultural_agents')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

// ============================================================
// Leitura completa (dono, membros, servidores)
// ============================================================

export async function getAgentById(id: string): Promise<CulturalAgentWithRelations | null> {
  const { data, error } = await supabase
    .from('cultural_agents')
    .select(`*, ${AGENT_RELATIONS}`)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? normalizeAgent(data as RawAgentRow) : null
}

export async function getMyAgents(userId: string): Promise<CulturalAgentWithRelations[]> {
  const { data, error } = await supabase
    .from('agent_memberships')
    .select(`role, is_primary, invite_status, cultural_agents(*, ${AGENT_RELATIONS})`)
    .eq('user_id', userId)
    .eq('invite_status', 'accepted')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw error

  return (data ?? [])
    .filter((m) => m.cultural_agents)
    .map((m) => ({
      ...normalizeAgent(m.cultural_agents as unknown as RawAgentRow),
      membership_role: m.role as AgentMembershipRole,
      is_primary: m.is_primary as boolean,
    }))
}

export async function getMyPrimaryAgent(userId: string): Promise<CulturalAgentWithRelations | null> {
  const agents = await getMyAgents(userId)
  return agents.find((a) => a.is_primary) ?? agents[0] ?? null
}

// ============================================================
// Criação e edição
// ============================================================

export async function createCulturalAgent(
  userId: string,
  payload: Partial<CulturalAgent>
): Promise<CulturalAgent> {
  const { data, error } = await supabase
    .from('cultural_agents')
    .insert({
      ...payload,
      created_by: userId,
      registration_status: 'rascunho',
      is_public: false,
    })
    .select()
    .single()
  if (error) throw error
  // A membership "owner" e o agent_privacy são criados por trigger no banco.
  return data as CulturalAgent
}

export async function updateCulturalAgent(
  agentId: string,
  payload: Partial<CulturalAgent>
): Promise<CulturalAgent> {
  // Colunas de homologação nunca saem do cliente
  const {
    registration_status: _s, reviewed_by: _rb, reviewed_at: _ra, reviewer_notes: _rn,
    is_public: _p, created_by: _cb, submitted_at: _sa, ...safe
  } = payload
  const { data, error } = await supabase
    .from('cultural_agents')
    .update(safe)
    .eq('id', agentId)
    .select()
    .single()
  if (error) throw error
  return data as CulturalAgent
}

/** Dono aprovado pode esconder/mostrar o perfil no mapa. */
export async function setAgentVisibility(agentId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase.from('cultural_agents').update({ is_public: isPublic }).eq('id', agentId)
  if (error) throw error
}

/** Envia para homologação. Valida o mínimo do Manual SMIIC no banco (RPC submit_agent). */
export async function submitAgent(agentId: string): Promise<CulturalAgent> {
  const { data, error } = await supabase.rpc('submit_agent', { p_agent_id: agentId })
  if (error) throw error
  return data as CulturalAgent
}

/** Retira um cadastro enviado (volta para rascunho) para poder editar. */
export async function withdrawAgent(agentId: string): Promise<void> {
  const { error } = await supabase
    .from('cultural_agents')
    .update({ registration_status: 'rascunho' })
    .eq('id', agentId)
  if (error) throw error
}

export async function upsertAgentAddress(
  agentId: string,
  payload: Partial<AgentAddress>
): Promise<AgentAddress> {
  const { id: _id, agent_id: _a, updated_at: _u, ...safe } = payload
  const { data, error } = await supabase
    .from('agent_addresses')
    .upsert({ ...safe, agent_id: agentId }, { onConflict: 'agent_id' })
    .select()
    .single()
  if (error) throw error
  return data as AgentAddress
}

/** Substitui a lista N:N inteira (apaga e reinsere). */
async function replaceChildren(
  table: 'agent_typologies' | 'agent_areas' | 'agent_social_links',
  agentId: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  const { error: deleteError } = await supabase.from(table).delete().eq('agent_id', agentId)
  if (deleteError) throw deleteError
  if (rows.length === 0) return
  const { error } = await supabase.from(table).insert(rows.map((r) => ({ ...r, agent_id: agentId })))
  if (error) throw error
}

export function setAgentTypologies(agentId: string, typologyIds: string[]) {
  const unique = [...new Set(typologyIds)]
  return replaceChildren('agent_typologies', agentId, unique.map((typology_id) => ({ typology_id })))
}

export function setAgentAreas(agentId: string, categoryIds: string[]) {
  const unique = [...new Set(categoryIds)]
  return replaceChildren('agent_areas', agentId, unique.map((category_id) => ({ category_id })))
}

export function setAgentSocialLinks(
  agentId: string,
  links: Pick<AgentSocialLink, 'platform' | 'url' | 'username'>[]
) {
  const rows = links
    .map((l) => ({ platform: l.platform, url: safeUrl(l.url), username: l.username || null }))
    .filter((l): l is { platform: AgentSocialLink['platform']; url: string; username: string | null } => !!l.url)
  return replaceChildren('agent_social_links', agentId, rows)
}

export async function updateAgentPrivacy(
  agentId: string,
  payload: Partial<AgentPrivacy>
): Promise<AgentPrivacy> {
  const { id: _id, agent_id: _a, updated_at: _u, ...safe } = payload
  const { data, error } = await supabase
    .from('agent_privacy')
    .upsert({ ...safe, agent_id: agentId }, { onConflict: 'agent_id' })
    .select()
    .single()
  if (error) throw error
  return data as AgentPrivacy
}

// ============================================================
// Arquivos: foto (bucket público "media") e currículo (bucket privado "agent-files")
// ============================================================

function extensionOf(file: File, fallback: string) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext && ext.length <= 5 ? ext : fallback
}

function storagePathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null
  const marker = `/object/public/${bucket}/`
  const i = url.indexOf(marker)
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null
}

export async function uploadAgentPhoto(agentId: string, file: File, previousUrl?: string | null): Promise<string> {
  const path = `agents/${agentId}/foto-${Date.now()}.${extensionOf(file, 'jpg')}`
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(path, file, { upsert: false, contentType: file.type })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('media').getPublicUrl(path)
  const { error } = await supabase.from('cultural_agents').update({ photo_url: data.publicUrl }).eq('id', agentId)
  if (error) throw error

  const old = storagePathFromPublicUrl(previousUrl, 'media')
  if (old && old !== path) {
    try {
      await supabase.storage.from('media').remove([old])
    } catch {
      // Ignora falha na limpeza do arquivo antigo
    }
  }

  return data.publicUrl
}

export async function deleteAgentPhoto(agentId: string, currentUrl?: string | null): Promise<void> {
  const { error } = await supabase.from('cultural_agents').update({ photo_url: null }).eq('id', agentId)
  if (error) throw error

  const old = storagePathFromPublicUrl(currentUrl, 'media')
  if (old) {
    try {
      await supabase.storage.from('media').remove([old])
    } catch {
      // Ignora falha na limpeza do arquivo
    }
  }
}

export async function uploadUserAvatar(userId: string, file: File, previousUrl?: string | null): Promise<string> {
  const path = `avatars/${userId}/avatar-${Date.now()}.${extensionOf(file, 'jpg')}`
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(path, file, { upsert: false, contentType: file.type })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('media').getPublicUrl(path)
  const { error } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
  if (error) throw error

  const old = storagePathFromPublicUrl(previousUrl, 'media')
  if (old && old !== path) {
    try {
      await supabase.storage.from('media').remove([old])
    } catch {
      // Ignora falha na limpeza do arquivo antigo
    }
  }

  return data.publicUrl
}

export async function deleteUserAvatar(userId: string, currentUrl?: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) throw error

  const old = storagePathFromPublicUrl(currentUrl, 'media')
  if (old) {
    try {
      await supabase.storage.from('media').remove([old])
    } catch {
      // Ignora falha na limpeza do arquivo
    }
  }
}

/** Envia o currículo e grava o CAMINHO (não a URL) em curriculum_url. */
export async function uploadAgentCurriculum(
  agentId: string,
  file: File,
  showCurriculum: boolean,
  previousPath?: string | null
): Promise<string> {
  const path = `curriculos/${agentId}/curriculo-${Date.now()}.${extensionOf(file, 'pdf')}`
  const { error: uploadError } = await supabase.storage
    .from('agent-files')
    .upload(path, file, { upsert: false, contentType: file.type })
  if (uploadError) throw uploadError

  const { error } = await supabase
    .from('cultural_agents')
    .update({ curriculum_url: path, show_curriculum: showCurriculum })
    .eq('id', agentId)
  if (error) throw error

  if (previousPath && !previousPath.startsWith('http') && previousPath !== path) {
    await supabase.storage.from('agent-files').remove([previousPath])
  }
  return path
}

export async function updateAgentCurriculum(agentId: string, showCurriculum: boolean): Promise<void> {
  const { error } = await supabase
    .from('cultural_agents')
    .update({ show_curriculum: showCurriculum })
    .eq('id', agentId)
  if (error) throw error
}

export async function removeAgentCurriculum(agentId: string, path: string | null): Promise<void> {
  if (path && !path.startsWith('http')) await supabase.storage.from('agent-files').remove([path])
  const { error } = await supabase
    .from('cultural_agents')
    .update({ curriculum_url: null, show_curriculum: false })
    .eq('id', agentId)
  if (error) throw error
}

/**
 * URL temporária (1h) para abrir o currículo. Quem pode abrir é decidido pela
 * política do bucket: membros, servidores, ou o público quando show_curriculum = true.
 */
export async function getCurriculumUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('http')) return pathOrUrl // URL legada
  const { data, error } = await supabase.storage.from('agent-files').createSignedUrl(pathOrUrl, 3600)
  if (error) return null
  return data.signedUrl
}

// ============================================================
// Tipologias (árvore de até 3 níveis)
// ============================================================

export async function getTypologyTree(context: 'agent' | 'space' = 'agent'): Promise<CulturalTypology[]> {
  const { data, error } = await supabase
    .from('cultural_typologies')
    .select('*')
    .eq('context', context)
    .eq('is_active', true)
    .order('level')
    .order('sort_order')
    .order('name')
  if (error) throw error

  const map = new Map<string, CulturalTypology>()
  const roots: CulturalTypology[] = []
  for (const t of (data ?? []) as CulturalTypology[]) map.set(t.id, { ...t, children: [] })
  for (const t of map.values()) {
    const parent = t.parent_id ? map.get(t.parent_id) : undefined
    if (parent) parent.children!.push(t)
    else roots.push(t)
  }
  return roots
}

/** Mapa id -> nó com o caminho completo (Nível 1 › Nível 2 › Nível 3). */
export function flattenTypologyTree(tree: CulturalTypology[]): Map<string, { node: CulturalTypology; path: string[] }> {
  const out = new Map<string, { node: CulturalTypology; path: string[] }>()
  const walk = (nodes: CulturalTypology[], path: string[]) => {
    for (const n of nodes) {
      const p = [...path, n.name]
      out.set(n.id, { node: n, path: p })
      if (n.children?.length) walk(n.children, p)
    }
  }
  walk(tree, [])
  return out
}

// ============================================================
// Completude do perfil (runtime, nunca persistido)
// ============================================================

export function calculateCompletion(agent: CulturalAgentWithRelations): AgentCompletionStatus {
  const steps: Record<AgentOnboardingStep, boolean> = {
    dados_basicos:
      !!agent.display_name &&
      (agent.person_type === 'juridica' ? !!agent.legal_name && !!agent.cnpj : !!agent.cpf),
    foto: !!agent.photo_url,
    tipologia: (agent.typologies?.length ?? 0) > 0,
    areas: (agent.areas?.length ?? 0) > 0,
    endereco: !!agent.address?.city && !!agent.address?.state,
    redes_sociais: (agent.social_links?.length ?? 0) > 0,
    apresentacao: (agent.biography?.length ?? 0) >= 50,
  }
  const entries = Object.entries(steps) as [AgentOnboardingStep, boolean][]
  const completed = entries.filter(([, v]) => v).length
  return {
    percentage: Math.round((completed / entries.length) * 100),
    missingSteps: entries.filter(([, v]) => !v).map(([k]) => k),
  }
}

// ============================================================
// Membros e convites
// ============================================================

export async function getAgentMembers(agentId: string): Promise<AgentMembership[]> {
  const { data, error } = await supabase
    .from('agent_memberships')
    .select('*, profiles(full_name, avatar_url, phone)')
    .eq('agent_id', agentId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as AgentMembership[]
}

/** Convida um usuário já cadastrado (pelo e-mail) para um agente coletivo ou companhia. */
export async function inviteMemberToAgent(
  agentId: string,
  email: string,
  role: Exclude<AgentMembershipRole, 'owner'> = 'member',
  artistRole?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('invite_agent_member', {
    p_agent_id: agentId,
    p_email: email.trim(),
    p_role: role,
    p_artist_role: artistRole?.trim() || null,
  })
  if (error) throw error
  return data as string
}

/** Um artista solicita entrada para uma companhia/grupo cultural */
export async function requestAgentMembership(
  agentId: string,
  artistRole?: string,
  message?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('request_agent_membership', {
    p_agent_id: agentId,
    p_artist_role: artistRole?.trim() || null,
    p_message: message?.trim() || null,
  })
  if (error) throw error
  return data as string
}

/** Responsável pela companhia aprova ou recusa solicitação de artista */
export async function respondAgentRequest(membershipId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_agent_request', {
    p_membership_id: membershipId,
    p_accept: accept,
  })
  if (error) throw error
}

export async function respondToInvite(membershipId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_agent_invite', {
    p_membership_id: membershipId,
    p_accept: accept,
  })
  if (error) throw error
}

export async function removeAgentMember(membershipId: string): Promise<void> {
  const { error } = await supabase.from('agent_memberships').delete().eq('id', membershipId)
  if (error) throw error
}

export async function setPrimaryAgent(userId: string, agentId: string): Promise<void> {
  const { error } = await supabase
    .from('agent_memberships')
    .update({ is_primary: true })
    .eq('user_id', userId)
    .eq('agent_id', agentId)
  if (error) throw error
}

// ============================================================
// Notificações
// ============================================================

export async function getMyNotifications(userId: string, limit = 30): Promise<AgentNotification[]> {
  const { data, error } = await supabase
    .from('agent_notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AgentNotification[]
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('agent_notifications').update({ is_read: true }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('agent_notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)
  if (error) throw error
}

// ============================================================
// Administração (servidores)
// ============================================================

export async function adminGetAllAgents(
  filters: AgentFilters = {}
): Promise<PaginatedResponse<CulturalAgentWithRelations>> {
  const { search, person_type, registration_status, page = 1, pageSize = 20 } = filters

  let query = supabase
    .from('cultural_agents')
    .select(
      `*, ${AGENT_RELATIONS},
       agent_memberships(id, user_id, role, invite_status, is_primary, profiles(full_name, phone, avatar_url))`,
      { count: 'exact' }
    )

  const term = search ? sanitizeSearch(search) : ''
  if (term) {
    const digits = term.replace(/\D/g, '')
    query = digits.length >= 5
      ? query.or(`cpf.ilike.%${digits}%,cnpj.ilike.%${digits}%,display_name.ilike.%${term}%`)
      : query.or(`display_name.ilike.%${term}%,legal_name.ilike.%${term}%`)
  }
  if (person_type) query = query.eq('person_type', person_type)
  if (registration_status) query = query.eq('registration_status', registration_status)

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })

  const { data, count, error } = await query
  if (error) throw error

  return {
    data: ((data ?? []) as RawAgentRow[]).map(normalizeAgent),
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

/** Contagem por status sobre a base inteira (não só a página atual). */
export async function adminGetAgentStatusCounts(): Promise<Record<AgentRegistrationStatus, number>> {
  const statuses: AgentRegistrationStatus[] = ['rascunho', 'enviado', 'em_analise', 'aprovado', 'rejeitado', 'suspenso']
  const results = await Promise.all(
    statuses.map((s) =>
      supabase.from('cultural_agents').select('id', { count: 'exact', head: true }).eq('registration_status', s)
    )
  )
  const out = {} as Record<AgentRegistrationStatus, number>
  statuses.forEach((s, i) => {
    if (results[i].error) throw results[i].error
    out[s] = results[i].count ?? 0
  })
  return out
}

/** Homologação (RPC review_agent): aprova, devolve, coloca em análise ou suspende. Notifica o dono. */
export async function adminReviewAgent(
  agentId: string,
  decision: 'aprovado' | 'rejeitado' | 'em_analise' | 'suspenso',
  notes?: string
): Promise<CulturalAgent> {
  const { data, error } = await supabase.rpc('review_agent', {
    p_agent_id: agentId,
    p_decision: decision,
    p_notes: notes ?? null,
  })
  if (error) throw error
  return data as CulturalAgent
}

export async function adminDeleteAgent(agentId: string): Promise<void> {
  const { error } = await supabase.from('cultural_agents').delete().eq('id', agentId)
  if (error) throw error
}
