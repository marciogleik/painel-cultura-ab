export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN_CULTURA'
  | 'GESTOR'
  | 'SERVIDOR'
  | 'ARTISTA'
  | 'USUARIO_PUBLICO'

export type InscriptionStatus =
  | 'ABERTO'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'REPROVADO'
  | 'FINALIZADO'

export type EditalStatus = 'RASCUNHO' | 'PUBLICADO' | 'ENCERRADO' | 'CANCELADO'

export type PortfolioType = 'IMAGEM' | 'VIDEO' | 'AUDIO' | 'PDF'

export type SocialPlatform =
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'SPOTIFY'
  | 'SOUNDCLOUD'
  | 'WEBSITE'
  | 'LINKEDIN'
  | 'WHATSAPP'
  | 'PORTFOLIO'
  | 'OUTRO'

// ============================================================
// AGENTES CULTURAIS
// ============================================================

export type AgentPersonType = 'fisica' | 'juridica'

export type AgentCollectiveType = 'individual' | 'coletivo'

export type AgentRegistrationStatus =
  | 'rascunho'
  | 'enviado'
  | 'em_analise'
  | 'aprovado'
  | 'rejeitado'
  | 'suspenso'

export type AgentMembershipRole = 'owner' | 'admin' | 'member' | 'viewer'

export type AgentRelationshipType = 'membro' | 'gestor' | 'parceiro' | 'patrocinador'

export type TypologyContext = 'agent' | 'space'

export interface Profile {
  id: string
  full_name: string
  cpf: string | null
  phone: string | null
  role: UserRole
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Subcategory {
  id: string
  category_id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Artist {
  id: string
  user_id: string
  artistic_name: string | null
  biography: string | null
  category_id: string | null
  subcategory_id: string | null
  city: string
  neighborhood: string | null
  state: string
  photo_url: string | null
  is_available: boolean
  is_public: boolean
  is_verified: boolean
  status: 'ATIVO' | 'INATIVO' | 'PENDENTE'
  birth_date: string | null
  gender: string | null
  musical_genre: string | null
  experience_years: number | null
  created_at: string
  updated_at: string
  // Joined relations
  profiles?: Profile
  categories?: Category
  subcategories?: Subcategory
  social_links?: SocialLink[]
  privacy_settings?: PrivacySettings
}

export interface PrivacySettings {
  id: string
  artist_id: string
  show_phone: boolean
  show_email: boolean
  show_social: boolean
  show_location: boolean
  show_birthdate: boolean
  updated_at: string
}

export interface PortfolioItem {
  id: string
  artist_id: string
  type: PortfolioType
  title: string
  description: string | null
  url: string | null
  file_key: string | null
  thumbnail: string | null
  sort_order: number
  created_at: string
}

export interface SocialLink {
  id: string
  artist_id: string
  platform: SocialPlatform
  url: string
  username: string | null
}

export interface ArtistAward {
  id: string
  artist_id: string
  title: string
  institution: string | null
  year: number | null
  description: string | null
  created_at: string
}

export interface ArtistProject {
  id: string
  artist_id: string
  title: string
  description: string | null
  year: number | null
  is_ongoing: boolean
  url: string | null
  created_at: string
}

export interface Edital {
  id: string
  title: string
  description: string
  requirements: string | null
  category_id: string | null
  status: EditalStatus
  start_date: string
  end_date: string
  total_slots: number | null
  prize_value: number | null
  published_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  // Joined
  categories?: Category
  profiles?: Profile
}

export interface Inscription {
  id: string
  edital_id: string
  artist_id: string
  status: InscriptionStatus
  notes: string | null
  reviewer_notes: string | null
  submitted_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // Joined
  editais?: Edital
  artists?: Artist
}

export interface InscriptionFile {
  id: string
  inscription_id: string
  original_name: string
  file_key: string
  file_type: string
  file_size: number
  uploaded_at: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  location: string | null
  city: string
  start_date: string
  end_date: string | null
  is_public: boolean
  category_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: number
  user_id: string | null
  user_email: string | null
  ip_address: string | null
  operation: string
  resource: string
  resource_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// ============================================================
// AGENTES CULTURAIS — Interfaces
// ============================================================

export interface CulturalAgent {
  id: string
  person_type: AgentPersonType
  collective_type: AgentCollectiveType
  display_name: string | null
  legal_name: string | null
  biography: string | null
  photo_url: string | null
  // Documentos — nunca expostos publicamente
  cpf: string | null
  cnpj: string | null
  // Dados sensíveis — RLS restrito, nunca públicos
  birth_date: string | null
  gender: string | null
  race: string | null
  // Contato
  phone: string | null
  show_contact: boolean
  // Status e validação
  registration_status: AgentRegistrationStatus
  submitted_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  reviewer_notes: string | null
  // Termos de uso
  terms_accepted: boolean
  terms_accepted_at: string | null
  terms_version: string | null
  // Currículo
  curriculum_url?: string | null
  show_curriculum?: boolean
  // Visibilidade
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface AgentMembership {
  id: string
  user_id: string
  agent_id: string
  role: AgentMembershipRole
  is_primary: boolean
  created_at: string
}

export interface AgentAddress {
  id: string
  agent_id: string
  cep: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  lat: number | null
  lng: number | null
  formatted: string | null
  updated_at: string
}

export interface CulturalTypology {
  id: string
  name: string
  slug: string
  level: 1 | 2 | 3
  parent_id: string | null
  context: TypologyContext
  is_active: boolean
  sort_order: number
  created_at: string
  // Joined
  children?: CulturalTypology[]
  parent?: CulturalTypology
}

export interface AgentTypology {
  id: string
  agent_id: string
  typology_id: string
  created_at: string
  // Joined
  cultural_typologies?: CulturalTypology
}

export interface AgentArea {
  id: string
  agent_id: string
  category_id: string
  created_at: string
  // Joined
  categories?: Category
}

export interface AgentSocialLink {
  id: string
  agent_id: string
  platform: SocialPlatform
  url: string
  username: string | null
  created_at: string
}

export interface AgentPrivacy {
  id: string
  agent_id: string
  show_phone: boolean
  show_email: boolean
  show_social: boolean
  show_address: boolean
  show_birthdate: boolean
  updated_at: string
}

export interface AgentRelationship {
  id: string
  parent_agent_id: string
  child_agent_id: string
  relationship_type: AgentRelationshipType
  description: string | null
  created_at: string
  // Joined
  parent_agent?: CulturalAgent
  child_agent?: CulturalAgent
}

/** Tipo completo do agente com todos os relacionamentos (para queries admin/perfil próprio) */
export interface CulturalAgentWithRelations extends CulturalAgent {
  memberships?: AgentMembership[]
  address?: AgentAddress
  typologies?: AgentTypology[]
  areas?: AgentArea[]
  social_links?: AgentSocialLink[]
  privacy?: AgentPrivacy
  relationships?: AgentRelationship[]
}

/** Percentual de completude calculado em runtime — nunca persistido */
export interface AgentCompletionStatus {
  percentage: number
  missingSteps: AgentOnboardingStep[]
}

export type AgentOnboardingStep =
  | 'dados_basicos'
  | 'foto'
  | 'tipologia'
  | 'areas'
  | 'endereco'
  | 'redes_sociais'
  | 'apresentacao'

// API response wrapper
export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}
