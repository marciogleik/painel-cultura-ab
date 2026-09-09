import { supabase } from '@/lib/supabase'
import type {
  CulturalAgent,
  CulturalAgentWithRelations,
  AgentAddress,
  CulturalTypology,
  AgentSocialLink,
  AgentPrivacy,
  AgentCompletionStatus,
  AgentOnboardingStep,
  PaginatedResponse,
} from '@/types'

// ============================================================
// Filtros para listagem pública
// ============================================================

export interface AgentFilters {
  search?: string
  category_id?: string
  typology_id?: string
  person_type?: 'fisica' | 'juridica'
  collective_type?: 'individual' | 'coletivo'
  city?: string
  registration_status?: string
  page?: number
  pageSize?: number
}

// ============================================================
// Listagem pública (apenas aprovados e públicos)
// ============================================================

export async function getPublicAgents(
  filters: AgentFilters = {}
): Promise<PaginatedResponse<CulturalAgentWithRelations>> {
  const {
    search,
    typology_id,
    person_type,
    collective_type,
    city,
    page = 1,
    pageSize = 12,
  } = filters

  let query = supabase
    .from('cultural_agents')
    .select(
      `*,
      agent_addresses(*),
      agent_typologies(*, cultural_typologies(*)),
      agent_areas(*, categories(*)),
      agent_social_links(*),
      agent_privacy(*)`,
      { count: 'exact' }
    )
    .eq('is_public', true)
    .eq('registration_status', 'aprovado')

  if (search) {
    query = query.textSearch('search_vector', search, {
      type: 'websearch',
      config: 'portuguese',
    })
  }
  if (person_type) query = query.eq('person_type', person_type)
  if (collective_type) query = query.eq('collective_type', collective_type)
  if (city) query = query.ilike('agent_addresses.city', `%${city}%`)

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })

  const { data, count, error } = await query
  if (error) throw error

  let results = (data as CulturalAgentWithRelations[]) ?? []

  // Filtro de tipologia pós-query (relacionamento N:N)
  if (typology_id) {
    results = results.filter((a) =>
      a.typologies?.some((t) => t.typology_id === typology_id)
    )
  }

  return {
    data: results,
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

// ============================================================
// Buscar agente por ID (público)
// ============================================================

export async function getAgentById(
  id: string
): Promise<CulturalAgentWithRelations | null> {
  const { data, error } = await supabase
    .from('cultural_agents')
    .select(
      `*,
      agent_addresses(*),
      agent_typologies(*, cultural_typologies(*)),
      agent_areas(*, categories(*)),
      agent_social_links(*),
      agent_privacy(*)`
    )
    .eq('id', id)
    .single()

  if (error) return null
  return data as CulturalAgentWithRelations
}

// ============================================================
// Buscar agentes do usuário logado (todos os memberships)
// ============================================================

export async function getMyAgents(
  userId: string
): Promise<CulturalAgentWithRelations[]> {
  const { data, error } = await supabase
    .from('agent_memberships')
    .select(
      `role, is_primary,
      cultural_agents(
        *,
        agent_addresses(*),
        agent_typologies(*, cultural_typologies(*)),
        agent_areas(*, categories(*)),
        agent_social_links(*),
        agent_privacy(*)
      )`
    )
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })

  if (error) throw error

  return (
    data
      ?.map((m: any) => ({
        ...m.cultural_agents,
        _membership_role: m.role,
        _is_primary: m.is_primary,
      }))
      .filter(Boolean) ?? []
  )
}

// ============================================================
// Buscar agente principal do usuário (owner + is_primary)
// ============================================================

export async function getMyPrimaryAgent(
  userId: string
): Promise<CulturalAgentWithRelations | null> {
  const { data, error } = await supabase
    .from('agent_memberships')
    .select(
      `cultural_agents(
        *,
        agent_addresses(*),
        agent_typologies(*, cultural_typologies(*)),
        agent_areas(*, categories(*)),
        agent_social_links(*),
        agent_privacy(*)
      )`
    )
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single()

  if (error) return null
  return (data as any)?.cultural_agents ?? null
}

// ============================================================
// Criar agente (draft) + membership owner
// ============================================================

export async function createCulturalAgent(
  userId: string,
  payload: Partial<CulturalAgent>
): Promise<CulturalAgent> {
  const { data: agent, error } = await supabase
    .from('cultural_agents')
    .insert({ ...payload, created_by: userId, registration_status: 'rascunho' })
    .select()
    .single()

  if (error) throw error

  // Garantir membership como owner caso a trigger ainda não tenha criado
  await supabase.from('agent_memberships').upsert(
    {
      user_id: userId,
      agent_id: agent.id,
      role: 'owner',
      is_primary: true,
    },
    { onConflict: 'user_id,agent_id' }
  )

  return agent as CulturalAgent
}

// ============================================================
// Atualizar dados base do agente
// ============================================================

export async function updateCulturalAgent(
  agentId: string,
  payload: Partial<CulturalAgent>
): Promise<CulturalAgent> {
  const { data, error } = await supabase
    .from('cultural_agents')
    .update(payload)
    .eq('id', agentId)
    .select()
    .single()

  if (error) throw error
  return data as CulturalAgent
}

// ============================================================
// Submeter agente para análise
// ============================================================

export async function submitAgent(agentId: string): Promise<CulturalAgent> {
  const { data, error } = await supabase
    .from('cultural_agents')
    .update({
      registration_status: 'enviado',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', agentId)
    .select()
    .single()

  if (error) throw error
  return data as CulturalAgent
}

// ============================================================
// Endereço
// ============================================================

export async function upsertAgentAddress(
  agentId: string,
  payload: Partial<AgentAddress>
): Promise<AgentAddress> {
  const { data, error } = await supabase
    .from('agent_addresses')
    .upsert({ ...payload, agent_id: agentId }, { onConflict: 'agent_id' })
    .select()
    .single()

  if (error) throw error
  return data as AgentAddress
}

// ============================================================
// Tipologias — substituir seleção inteira do agente
// ============================================================

export async function setAgentTypologies(
  agentId: string,
  typologyIds: string[]
): Promise<void> {
  // Remover todas as tipologias existentes
  const { error: deleteError } = await supabase
    .from('agent_typologies')
    .delete()
    .eq('agent_id', agentId)

  if (deleteError) throw deleteError

  if (typologyIds.length === 0) return

  const rows = typologyIds.map((tid) => ({ agent_id: agentId, typology_id: tid }))
  const { error } = await supabase.from('agent_typologies').insert(rows)
  if (error) throw error
}

// ============================================================
// Áreas de atuação — substituir seleção inteira
// ============================================================

export async function setAgentAreas(
  agentId: string,
  categoryIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('agent_areas')
    .delete()
    .eq('agent_id', agentId)

  if (deleteError) throw deleteError

  if (categoryIds.length === 0) return

  const rows = categoryIds.map((cid) => ({ agent_id: agentId, category_id: cid }))
  const { error } = await supabase.from('agent_areas').insert(rows)
  if (error) throw error
}

// ============================================================
// Redes sociais — substituir lista inteira
// ============================================================

export async function setAgentSocialLinks(
  agentId: string,
  links: Pick<AgentSocialLink, 'platform' | 'url' | 'username'>[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('agent_social_links')
    .delete()
    .eq('agent_id', agentId)

  if (deleteError) throw deleteError

  if (links.length === 0) return

  const rows = links.map((l) => ({ ...l, agent_id: agentId }))
  const { error } = await supabase.from('agent_social_links').insert(rows)
  if (error) throw error
}

// ============================================================
// Configurações de privacidade
// ============================================================

export async function updateAgentPrivacy(
  agentId: string,
  payload: Partial<AgentPrivacy>
): Promise<AgentPrivacy> {
  const { data, error } = await supabase
    .from('agent_privacy')
    .upsert({ ...payload, agent_id: agentId }, { onConflict: 'agent_id' })
    .select()
    .single()

  if (error) throw error
  return data as AgentPrivacy
}

// ============================================================
// Upload de foto do agente
// ============================================================

export async function uploadAgentPhoto(
  agentId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `agents/${agentId}/photo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(path, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('media').getPublicUrl(path)

  await supabase
    .from('cultural_agents')
    .update({ photo_url: data.publicUrl })
    .eq('id', agentId)

  return data.publicUrl
}

// ============================================================
// Tipologias — árvore completa por contexto
// ============================================================

export async function getTypologyTree(
  context: 'agent' | 'space' = 'agent'
): Promise<CulturalTypology[]> {
  const { data, error } = await supabase
    .from('cultural_typologies')
    .select('*')
    .eq('context', context)
    .eq('is_active', true)
    .order('level')
    .order('sort_order')

  if (error) throw error

  const all = (data as CulturalTypology[]) ?? []
  // Montar árvore hierárquica
  const map = new Map<string, CulturalTypology>()
  const roots: CulturalTypology[] = []

  all.forEach((t) => {
    map.set(t.id, { ...t, children: [] })
  })

  map.forEach((t) => {
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.children!.push(t)
    } else {
      roots.push(t)
    }
  })

  if (context === 'agent' && roots.length === 0) {
    const { OFFICIAL_SMIIC_TYPOLOGIES } = await import('@/data/smiicTypologies')
    return OFFICIAL_SMIIC_TYPOLOGIES
  }

  return roots
}

// ============================================================
// Cálculo de completude do perfil (runtime, nunca persistido)
// ============================================================

export function calculateCompletion(
  agent: CulturalAgentWithRelations
): AgentCompletionStatus {
  const steps: Record<AgentOnboardingStep, boolean> = {
    dados_basicos:
      !!agent.display_name &&
      !!(agent.person_type === 'juridica' ? agent.legal_name : true),
    foto: !!agent.photo_url,
    tipologia: (agent.typologies?.length ?? 0) > 0,
    areas: (agent.areas?.length ?? 0) > 0,
    endereco:
      !!agent.address?.city && !!agent.address?.state,
    redes_sociais: (agent.social_links?.length ?? 0) > 0,
    apresentacao: (agent.biography?.length ?? 0) >= 50,
  }

  const completed = Object.values(steps).filter(Boolean).length
  const total = Object.keys(steps).length
  const missing = (Object.entries(steps) as [AgentOnboardingStep, boolean][])
    .filter(([, v]) => !v)
    .map(([k]) => k)

  return {
    percentage: Math.round((completed / total) * 100),
    missingSteps: missing,
  }
}

// ============================================================
// Admin — listar todos os agentes (qualquer status)
// ============================================================

export async function adminGetAllAgents(
  filters: AgentFilters = {}
): Promise<PaginatedResponse<CulturalAgentWithRelations>> {
  const { search, person_type, registration_status, page = 1, pageSize = 20 } = filters

  let query = supabase
    .from('cultural_agents')
    .select(
      `*,
      agent_addresses(*),
      agent_typologies(*, cultural_typologies(*)),
      agent_areas(*, categories(*)),
      agent_social_links(*),
      agent_privacy(*),
      agent_memberships(user_id, role, profiles(full_name, phone, cpf))`,
      { count: 'exact' }
    )

  if (search) {
    query = query.or(
      `display_name.ilike.%${search}%,legal_name.ilike.%${search}%`
    )
  }
  if (person_type) query = query.eq('person_type', person_type)
  if (registration_status) query = query.eq('registration_status', registration_status)

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })

  const { data, count, error } = await query
  if (error) throw error

  return {
    data: (data as CulturalAgentWithRelations[]) ?? [],
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

// ============================================================
// Admin — revisar agente (aprovar / rejeitar)
// ============================================================

export async function adminReviewAgent(
  agentId: string,
  reviewerId: string,
  decision: 'aprovado' | 'rejeitado',
  notes?: string
): Promise<CulturalAgent> {
  const { data, error } = await supabase
    .from('cultural_agents')
    .update({
      registration_status: decision,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: notes ?? null,
      is_public: decision === 'aprovado',
    })
    .eq('id', agentId)
    .select()
    .single()

  if (error) throw error

  // Notificar o agente sobre a decisão
  try {
    const agent = data as CulturalAgent
    // Buscar o owner (primeiro membro com role 'owner')
    const { data: members } = await supabase
      .from('agent_memberships')
      .select('user_id')
      .eq('agent_id', agentId)
      .eq('role', 'owner')
      .limit(1)

    if (members && members[0]) {
      await supabase.from('agent_notifications').insert({
        recipient_id: members[0].user_id,
        type: 'status_change',
        title: decision === 'aprovado'
          ? '✅ Cadastro aprovado!'
          : '❌ Cadastro necessita de ajustes',
        body: decision === 'aprovado'
          ? `Seu perfil de agente cultural "${agent?.display_name ?? ''}" foi aprovado e já está visível no Mapa Cultural.`
          : `Seu cadastro de agente cultural "${agent?.display_name ?? ''}" foi revisado e precisa de ajustes. Obs: ${notes ?? 'Sem observações.'}`,
        meta: { agent_id: agentId },
      })
    }
  } catch {
    // notificação não é crítica — ignora falhas silenciosamente
  }

  return data as CulturalAgent
}

// ============================================================
// Convite de vínculo entre agente individual e coletivo
// ============================================================

export async function inviteMemberToAgent(
  agentId: string,      // coletivo que convida
  targetUserId: string, // usuário a ser vinculado
  role: string = 'membro'
): Promise<void> {
  // Inserir membro com status pendente
  const { data: membership, error } = await supabase
    .from('agent_memberships')
    .insert({ agent_id: agentId, user_id: targetUserId, role, invite_status: 'pending' })
    .select()
    .single()

  if (error) throw error

  // Buscar nome do agente coletivo
  const { data: agent } = await supabase
    .from('cultural_agents')
    .select('display_name')
    .eq('id', agentId)
    .single()

  // Enviar notificação de convite
  await supabase.from('agent_notifications').insert({
    recipient_id: targetUserId,
    type: 'membership_invite',
    title: `Convite de vínculo`,
    body: `O coletivo "${agent?.display_name ?? 'um agente'}" quer te vincular como ${role}. Aceite ou recuse abaixo.`,
    meta: { agent_id: agentId, membership_id: membership.id },
  })
}

// ============================================================
// Currículo do agente cultural
// ============================================================

export async function uploadAgentCurriculum(
  agentId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `curriculos/${agentId}/curriculo.${ext}`

  const { error } = await supabase.storage
    .from('agent-files')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from('agent-files').getPublicUrl(path)
  return data.publicUrl
}

export async function updateAgentCurriculum(
  agentId: string,
  curriculumUrl: string,
  showCurriculum: boolean
): Promise<void> {
  const { error } = await supabase
    .from('cultural_agents')
    .update({ curriculum_url: curriculumUrl, show_curriculum: showCurriculum })
    .eq('id', agentId)

  if (error) throw error
}

