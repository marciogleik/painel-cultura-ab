import { supabase } from '@/lib/supabase'
import type { Edital, Inscription, PaginatedResponse } from '@/types'

export interface EditalFilters {
  search?: string
  category_id?: string
  status?: string
  page?: number
  pageSize?: number
}

export async function getEditais(
  filters: EditalFilters = {}
): Promise<PaginatedResponse<Edital>> {
  const { search, category_id, status = 'PUBLICADO', page = 1, pageSize = 10 } = filters

  let query = supabase
    .from('editais')
    .select('*, categories(name, slug, icon), profiles(full_name)', { count: 'exact' })
    .eq('status', status)

  if (search) query = query.ilike('title', `%${search}%`)
  if (category_id) query = query.eq('category_id', category_id)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query.range(from, to).order('published_at', { ascending: false })

  const { data, count, error } = await query
  if (error) throw error

  return {
    data: (data as Edital[]) ?? [],
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getEditalById(id: string): Promise<Edital | null> {
  const { data, error } = await supabase
    .from('editais')
    .select('*, categories(*), profiles(full_name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Edital
}

export async function createInscription(
  editalId: string,
  artistId: string,
  notes?: string
): Promise<Inscription> {
  const { data, error } = await supabase
    .from('inscriptions')
    .insert({ edital_id: editalId, artist_id: artistId, notes })
    .select()
    .single()

  if (error) throw error
  return data as Inscription
}

export async function getMyInscriptions(artistId: string): Promise<Inscription[]> {
  const { data, error } = await supabase
    .from('inscriptions')
    .select('*, editais(title, status, end_date, categories(name, icon))')
    .eq('artist_id', artistId)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return (data as Inscription[]) ?? []
}

export async function getAllInscriptions(): Promise<Inscription[]> {
  const { data, error } = await supabase
    .from('inscriptions')
    .select(
      `*,
      editais(title, status),
      artists(artistic_name, user_id, profiles(full_name))`
    )
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return (data as Inscription[]) ?? []
}

export async function updateInscriptionStatus(
  inscriptionId: string,
  status: string,
  reviewerNotes?: string
): Promise<void> {
  const { error } = await supabase
    .from('inscriptions')
    .update({
      status,
      reviewer_notes: reviewerNotes,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', inscriptionId)

  if (error) throw error
}
