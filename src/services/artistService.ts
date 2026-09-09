import { supabase } from '@/lib/supabase'
import type { Artist, PaginatedResponse } from '@/types'

export interface ArtistFilters {
  search?: string
  category_id?: string
  subcategory_id?: string
  neighborhood?: string
  city?: string
  musical_genre?: string
  is_available?: boolean
  page?: number
  pageSize?: number
}

export async function getArtists(
  filters: ArtistFilters = {}
): Promise<PaginatedResponse<Artist>> {
  const {
    search,
    category_id,
    subcategory_id,
    neighborhood,
    city,
    is_available,
    page = 1,
    pageSize = 12,
  } = filters

  let query = supabase
    .from('artists')
    .select(
      `*,
      profiles(full_name, avatar_url),
      categories(name, slug, icon),
      subcategories(name, slug),
      social_links(*),
      privacy_settings(*)`,
      { count: 'exact' }
    )
    .eq('is_public', true)
    .eq('status', 'ATIVO')

  if (search) {
    query = query.or(
      `artistic_name.ilike.%${search}%,biography.ilike.%${search}%,musical_genre.ilike.%${search}%`
    )
  }

  if (category_id) query = query.eq('category_id', category_id)
  if (subcategory_id) query = query.eq('subcategory_id', subcategory_id)
  if (neighborhood) query = query.ilike('neighborhood', `%${neighborhood}%`)
  if (city) query = query.ilike('city', `%${city}%`)
  if (is_available !== undefined) query = query.eq('is_available', is_available)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query.range(from, to).order('created_at', { ascending: false })

  const { data, count, error } = await query

  if (error) throw error

  return {
    data: (data as Artist[]) ?? [],
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getArtistById(id: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from('artists')
    .select(
      `*,
      profiles(full_name, phone, avatar_url),
      categories(name, slug, icon),
      subcategories(name, slug),
      social_links(*),
      privacy_settings(*),
      portfolio_items(*),
      artist_awards(*),
      artist_projects(*)`
    )
    .eq('id', id)
    .single()

  if (error) return null
  return data as Artist
}

export async function getMyArtistProfile(userId: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from('artists')
    .select(
      `*,
      profiles(*),
      categories(*),
      subcategories(*),
      social_links(*),
      privacy_settings(*),
      portfolio_items(*),
      artist_awards(*),
      artist_projects(*)`
    )
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data as Artist
}

export async function createArtistProfile(
  userId: string,
  data: Partial<Artist>
): Promise<Artist> {
  const { data: artist, error } = await supabase
    .from('artists')
    .insert({ ...data, user_id: userId })
    .select()
    .single()

  if (error) throw error

  // Update user role to ARTISTA
  await supabase
    .from('profiles')
    .update({ role: 'ARTISTA' })
    .eq('id', userId)

  return artist as Artist
}

export async function updateArtistProfile(
  artistId: string,
  data: Partial<Artist>
): Promise<Artist> {
  const { data: artist, error } = await supabase
    .from('artists')
    .update(data)
    .eq('id', artistId)
    .select()
    .single()

  if (error) throw error
  return artist as Artist
}
