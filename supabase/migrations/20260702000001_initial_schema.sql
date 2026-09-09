-- ============================================================
-- Plataforma Municipal de Cultura - Água Boa MT
-- Migration V1: Schema Completo
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'ADMIN_CULTURA',
  'GESTOR',
  'SERVIDOR',
  'ARTISTA',
  'USUARIO_PUBLICO'
);

CREATE TYPE inscription_status AS ENUM (
  'ABERTO',
  'EM_ANALISE',
  'APROVADO',
  'REPROVADO',
  'FINALIZADO'
);

CREATE TYPE edital_status AS ENUM (
  'RASCUNHO',
  'PUBLICADO',
  'ENCERRADO',
  'CANCELADO'
);

CREATE TYPE portfolio_type AS ENUM (
  'IMAGEM',
  'VIDEO',
  'AUDIO',
  'PDF'
);

CREATE TYPE social_platform AS ENUM (
  'INSTAGRAM',
  'FACEBOOK',
  'YOUTUBE',
  'TIKTOK',
  'SPOTIFY',
  'SOUNDCLOUD',
  'WEBSITE',
  'OUTRO'
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  cpf          TEXT UNIQUE,
  phone        TEXT,
  role         user_role NOT NULL DEFAULT 'USUARIO_PUBLICO',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES & SUBCATEGORIES
-- ============================================================

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subcategories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- ============================================================
-- ARTISTS
-- ============================================================

CREATE TABLE artists (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  artistic_name    TEXT,
  biography        TEXT,
  category_id      UUID REFERENCES categories(id),
  subcategory_id   UUID REFERENCES subcategories(id),
  city             TEXT NOT NULL DEFAULT 'Água Boa',
  neighborhood     TEXT,
  state            TEXT NOT NULL DEFAULT 'MT',
  photo_url        TEXT,
  is_available     BOOLEAN NOT NULL DEFAULT TRUE,
  is_public        BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  status           TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO','PENDENTE')),
  -- Campos extras
  birth_date       DATE,
  gender           TEXT,
  musical_genre    TEXT,
  experience_years INT,
  -- Busca full-text
  search_vector    TSVECTOR,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRIVACY SETTINGS (LGPD)
-- ============================================================

CREATE TABLE privacy_settings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id      UUID NOT NULL UNIQUE REFERENCES artists(id) ON DELETE CASCADE,
  show_phone     BOOLEAN NOT NULL DEFAULT FALSE,
  show_email     BOOLEAN NOT NULL DEFAULT FALSE,
  show_social    BOOLEAN NOT NULL DEFAULT TRUE,
  show_location  BOOLEAN NOT NULL DEFAULT TRUE,
  show_birthdate BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PORTFOLIO
-- ============================================================

CREATE TABLE portfolio_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  type        portfolio_type NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  url         TEXT,
  file_key    TEXT,
  thumbnail   TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOCIAL LINKS
-- ============================================================

CREATE TABLE social_links (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  platform  social_platform NOT NULL,
  url       TEXT NOT NULL,
  username  TEXT
);

-- ============================================================
-- AWARDS & RECOGNITIONS
-- ============================================================

CREATE TABLE artist_awards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  institution TEXT,
  year        INT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE artist_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  year        INT,
  is_ongoing  BOOLEAN NOT NULL DEFAULT FALSE,
  url         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVENTS
-- ============================================================

CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  location     TEXT,
  city         TEXT NOT NULL DEFAULT 'Água Boa',
  start_date   TIMESTAMPTZ NOT NULL,
  end_date     TIMESTAMPTZ,
  is_public    BOOLEAN NOT NULL DEFAULT TRUE,
  category_id  UUID REFERENCES categories(id),
  created_by   UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event participations
CREATE TABLE event_participations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artist_id  UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  role       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, artist_id)
);

-- ============================================================
-- EDITAIS
-- ============================================================

CREATE TABLE editais (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  requirements  TEXT,
  category_id   UUID REFERENCES categories(id),
  status        edital_status NOT NULL DEFAULT 'RASCUNHO',
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  total_slots   INT,
  prize_value   DECIMAL(12,2),
  published_by  UUID REFERENCES profiles(id),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INSCRIPTIONS
-- ============================================================

CREATE TABLE inscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edital_id   UUID NOT NULL REFERENCES editais(id) ON DELETE CASCADE,
  artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  status      inscription_status NOT NULL DEFAULT 'ABERTO',
  notes       TEXT,
  reviewer_notes TEXT,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by    UUID REFERENCES profiles(id),
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(edital_id, artist_id)
);

-- Inscription files
CREATE TABLE inscription_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscription_id  UUID NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
  original_name   TEXT NOT NULL,
  file_key        TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  file_size       BIGINT NOT NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS (imutável)
-- ============================================================

CREATE TABLE audit_logs (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id),
  user_email   TEXT,
  ip_address   INET,
  operation    TEXT NOT NULL,
  resource     TEXT NOT NULL,
  resource_id  TEXT,
  old_value    JSONB,
  new_value    JSONB,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ninguém pode deletar audit_logs (apenas superuser)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Artists search
CREATE INDEX idx_artists_search ON artists USING GIN(search_vector);
CREATE INDEX idx_artists_category ON artists(category_id);
CREATE INDEX idx_artists_subcategory ON artists(subcategory_id);
CREATE INDEX idx_artists_city ON artists(city);
CREATE INDEX idx_artists_neighborhood ON artists(neighborhood);
CREATE INDEX idx_artists_status ON artists(status);
CREATE INDEX idx_artists_is_public ON artists(is_public);

-- Full text indexes
CREATE INDEX idx_artists_artistic_name ON artists USING GIN(artistic_name gin_trgm_ops);
CREATE INDEX idx_artists_biography ON artists USING GIN(biography gin_trgm_ops);

-- Categories
CREATE INDEX idx_subcategories_category ON subcategories(category_id);

-- Editais
CREATE INDEX idx_editais_status ON editais(status);
CREATE INDEX idx_editais_dates ON editais(start_date, end_date);

-- Inscriptions
CREATE INDEX idx_inscriptions_edital ON inscriptions(edital_id);
CREATE INDEX idx_inscriptions_artist ON inscriptions(artist_id);
CREATE INDEX idx_inscriptions_status ON inscriptions(status);

-- Audit
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- Events
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_events_city ON events(city);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_editais_updated_at
  BEFORE UPDATE ON editais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_inscriptions_updated_at
  BEFORE UPDATE ON inscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update artist search vector
CREATE OR REPLACE FUNCTION update_artist_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    SETWEIGHT(TO_TSVECTOR('portuguese', COALESCE(NEW.artistic_name, '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('portuguese', COALESCE(NEW.biography, '')), 'B') ||
    SETWEIGHT(TO_TSVECTOR('portuguese', COALESCE(NEW.musical_genre, '')), 'C') ||
    SETWEIGHT(TO_TSVECTOR('portuguese', COALESCE(NEW.neighborhood, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_artists_search_vector
  BEFORE INSERT OR UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_artist_search_vector();

-- Auto-create profile after auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'USUARIO_PUBLICO'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-create privacy_settings when artist is created
CREATE OR REPLACE FUNCTION handle_new_artist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.privacy_settings (artist_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_artist_created
  AFTER INSERT ON artists
  FOR EACH ROW EXECUTE FUNCTION handle_new_artist();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE editais ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscription_files ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: is admin or above
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR')
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: is servidor or above
CREATE OR REPLACE FUNCTION is_servidor_or_above()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR', 'SERVIDOR')
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (id = auth.uid() OR is_servidor_or_above());

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_insert_trigger" ON profiles FOR INSERT
  WITH CHECK (TRUE); -- Handled by trigger on auth.users

-- CATEGORIES policies (read-only for all, write for admin)
CREATE POLICY "categories_select_all" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "categories_write_admin" ON categories FOR ALL USING (is_admin());

CREATE POLICY "subcategories_select_all" ON subcategories FOR SELECT USING (TRUE);
CREATE POLICY "subcategories_write_admin" ON subcategories FOR ALL USING (is_admin());

-- ARTISTS policies
CREATE POLICY "artists_select_public" ON artists FOR SELECT
  USING (is_public = TRUE OR user_id = auth.uid() OR is_servidor_or_above());

CREATE POLICY "artists_insert_own" ON artists FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "artists_update_own_or_admin" ON artists FOR UPDATE
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "artists_delete_admin" ON artists FOR DELETE
  USING (is_admin());

-- PRIVACY SETTINGS policies
CREATE POLICY "privacy_select_own_or_admin" ON privacy_settings FOR SELECT
  USING (
    artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    OR is_servidor_or_above()
  );

CREATE POLICY "privacy_update_own" ON privacy_settings FOR UPDATE
  USING (artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid()) OR is_admin());

-- PORTFOLIO policies
CREATE POLICY "portfolio_select_public" ON portfolio_items FOR SELECT
  USING (
    artist_id IN (SELECT id FROM artists WHERE is_public = TRUE)
    OR artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    OR is_servidor_or_above()
  );

CREATE POLICY "portfolio_write_own" ON portfolio_items FOR ALL
  USING (
    artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    OR is_admin()
  );

-- SOCIAL LINKS policies
CREATE POLICY "social_select_public" ON social_links FOR SELECT USING (TRUE);
CREATE POLICY "social_write_own" ON social_links FOR ALL
  USING (
    artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    OR is_admin()
  );

-- AWARDS & PROJECTS policies
CREATE POLICY "awards_select_all" ON artist_awards FOR SELECT USING (TRUE);
CREATE POLICY "awards_write_own" ON artist_awards FOR ALL
  USING (artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid()) OR is_admin());

CREATE POLICY "projects_select_all" ON artist_projects FOR SELECT USING (TRUE);
CREATE POLICY "projects_write_own" ON artist_projects FOR ALL
  USING (artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid()) OR is_admin());

-- EVENTS policies
CREATE POLICY "events_select_public" ON events FOR SELECT
  USING (is_public = TRUE OR is_servidor_or_above());

CREATE POLICY "events_write_admin" ON events FOR ALL USING (is_admin());

CREATE POLICY "participations_select_all" ON event_participations FOR SELECT USING (TRUE);
CREATE POLICY "participations_write_admin" ON event_participations FOR ALL USING (is_admin());

-- EDITAIS policies
CREATE POLICY "editais_select_published" ON editais FOR SELECT
  USING (status = 'PUBLICADO' OR is_servidor_or_above());

CREATE POLICY "editais_write_admin" ON editais FOR ALL USING (is_admin());

-- INSCRIPTIONS policies
CREATE POLICY "inscriptions_select_own_or_admin" ON inscriptions FOR SELECT
  USING (
    artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    OR is_servidor_or_above()
  );

CREATE POLICY "inscriptions_insert_artist" ON inscriptions FOR INSERT
  WITH CHECK (
    artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
  );

CREATE POLICY "inscriptions_update_admin" ON inscriptions FOR UPDATE
  USING (is_servidor_or_above());

-- INSCRIPTION FILES policies
CREATE POLICY "files_select_own_or_admin" ON inscription_files FOR SELECT
  USING (
    inscription_id IN (
      SELECT i.id FROM inscriptions i
      JOIN artists a ON a.id = i.artist_id
      WHERE a.user_id = auth.uid()
    )
    OR is_servidor_or_above()
  );

CREATE POLICY "files_insert_own" ON inscription_files FOR INSERT
  WITH CHECK (
    inscription_id IN (
      SELECT i.id FROM inscriptions i
      JOIN artists a ON a.id = i.artist_id
      WHERE a.user_id = auth.uid()
    )
  );

-- AUDIT LOGS: apenas admins podem ver, ninguém pode deletar
CREATE POLICY "audit_select_admin" ON audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "audit_insert_system" ON audit_logs FOR INSERT
  WITH CHECK (TRUE); -- sistema insere

-- Bloquear DELETE na tabela audit_logs (proteção extra)
CREATE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

INSERT INTO categories (name, slug, description, icon, sort_order) VALUES
  ('Música', 'musica', 'Artistas e grupos musicais', '🎵', 1),
  ('Dança', 'danca', 'Bailarinos e grupos de dança', '💃', 2),
  ('Teatro', 'teatro', 'Atores e grupos de teatro', '🎭', 3),
  ('Artes Visuais', 'artes-visuais', 'Pintores, escultores e artistas visuais', '🎨', 4),
  ('Artesanato', 'artesanato', 'Artesãos e produtores manuais', '🏺', 5),
  ('Literatura', 'literatura', 'Escritores e poetas', '📚', 6),
  ('Fotografia', 'fotografia', 'Fotógrafos e videomakers', '📷', 7),
  ('Cultura Popular', 'cultura-popular', 'Mestres da cultura popular e tradições', '🌾', 8),
  ('Produção Cultural', 'producao-cultural', 'Produtores e gestores culturais', '📋', 9),
  ('Espaços Culturais', 'espacos-culturais', 'Espaços e equipamentos culturais', '🏛️', 10);

INSERT INTO subcategories (category_id, name, slug, sort_order)
SELECT id, 'Cantor(a)', 'cantor', 1 FROM categories WHERE slug = 'musica'
UNION ALL
SELECT id, 'Músico(a) Instrumental', 'musico-instrumental', 2 FROM categories WHERE slug = 'musica'
UNION ALL
SELECT id, 'Banda', 'banda', 3 FROM categories WHERE slug = 'musica'
UNION ALL
SELECT id, 'DJ', 'dj', 4 FROM categories WHERE slug = 'musica'
UNION ALL
SELECT id, 'Coral / Grupo Vocal', 'coral', 5 FROM categories WHERE slug = 'musica'
UNION ALL
SELECT id, 'Bailarino(a)', 'bailarino', 1 FROM categories WHERE slug = 'danca'
UNION ALL
SELECT id, 'Grupo de Dança', 'grupo-danca', 2 FROM categories WHERE slug = 'danca'
UNION ALL
SELECT id, 'Professor(a) de Dança', 'professor-danca', 3 FROM categories WHERE slug = 'danca'
UNION ALL
SELECT id, 'Ator / Atriz', 'ator-atriz', 1 FROM categories WHERE slug = 'teatro'
UNION ALL
SELECT id, 'Grupo de Teatro', 'grupo-teatro', 2 FROM categories WHERE slug = 'teatro'
UNION ALL
SELECT id, 'Pintor(a)', 'pintor', 1 FROM categories WHERE slug = 'artes-visuais'
UNION ALL
SELECT id, 'Escultor(a)', 'escultor', 2 FROM categories WHERE slug = 'artes-visuais'
UNION ALL
SELECT id, 'Grafiteiro(a)', 'grafiteiro', 3 FROM categories WHERE slug = 'artes-visuais'
UNION ALL
SELECT id, 'Escritor(a)', 'escritor', 1 FROM categories WHERE slug = 'literatura'
UNION ALL
SELECT id, 'Poeta', 'poeta', 2 FROM categories WHERE slug = 'literatura'
UNION ALL
SELECT id, 'Contador(a) de Histórias', 'contador-historias', 3 FROM categories WHERE slug = 'literatura';
