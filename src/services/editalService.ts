import { supabase } from '@/lib/supabase'
import { sanitizeSearch, daysUntil } from '@/lib/utils'
import type { Edital, Inscription, InscriptionStatus, PaginatedResponse } from '@/types'

export interface EditalFilters {
  search?: string
  category_id?: string
  status?: Edital['status']
  page?: number
  pageSize?: number
}

export async function getEditais(filters: EditalFilters = {}): Promise<PaginatedResponse<Edital>> {
  const { search, category_id, status = 'PUBLICADO', page = 1, pageSize = 10 } = filters

  let query = supabase
    .from('editais')
    .select('*, categories(name, slug, icon)', { count: 'exact' })
    .eq('status', status)

  const term = search ? sanitizeSearch(search) : ''
  if (term) query = query.ilike('title', `%${term}%`)
  if (category_id) query = query.eq('category_id', category_id)

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1).order('end_date', { ascending: false })

  const { data, count, error } = await query
  if (error) throw error

  return {
    data: (data ?? []) as Edital[],
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getEditalById(id: string): Promise<Edital | null> {
  const { data, error } = await supabase
    .from('editais')
    .select('*, categories(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Edital) ?? null
}

/** Um edital aceita inscrições quando está publicado e hoje está dentro do prazo. */
export function isEditalOpen(edital: Pick<Edital, 'status' | 'start_date' | 'end_date'>): boolean {
  if (edital.status !== 'PUBLICADO') return false
  const untilEnd = daysUntil(edital.end_date)
  const untilStart = daysUntil(edital.start_date)
  return untilEnd !== null && untilEnd >= 0 && untilStart !== null && untilStart <= 0
}

// ============================================================
// Inscrições (agente cultural)
// ============================================================

export async function createInscription(
  editalId: string,
  agentId: string,
  notes?: string
): Promise<Inscription> {
  const { data, error } = await supabase
    .from('inscriptions')
    .insert({ edital_id: editalId, agent_id: agentId, notes: notes || null })
    .select()
    .single()
  if (error) throw error
  return data as Inscription
}

export async function getMyInscriptions(agentIds: string[]): Promise<Inscription[]> {
  if (agentIds.length === 0) return []
  const { data, error } = await supabase
    .from('inscriptions')
    .select('*, editais(id, title, status, end_date, categories(name, icon)), cultural_agents(id, display_name)')
    .in('agent_id', agentIds)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Inscription[]
}

export async function getInscriptionForEdital(editalId: string, agentId: string): Promise<Inscription | null> {
  const { data, error } = await supabase
    .from('inscriptions')
    .select('*')
    .eq('edital_id', editalId)
    .eq('agent_id', agentId)
    .maybeSingle()
  if (error) throw error
  return (data as Inscription) ?? null
}

// ============================================================
// Administração
// ============================================================

export async function getAllInscriptions(): Promise<Inscription[]> {
  const { data, error } = await supabase
    .from('inscriptions')
    .select(`*,
      editais(id, title, status),
      cultural_agents(id, display_name, photo_url, person_type),
      artists(artistic_name, user_id, profiles(full_name))`)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Inscription[]
}

/** reviewed_by / reviewed_at são preenchidos por trigger no banco quando o status muda. */
export async function updateInscriptionStatus(
  inscriptionId: string,
  status: InscriptionStatus,
  reviewerNotes?: string
): Promise<void> {
  const { error } = await supabase
    .from('inscriptions')
    .update({ status, reviewer_notes: reviewerNotes ?? null })
    .eq('id', inscriptionId)
  if (error) throw error
}
