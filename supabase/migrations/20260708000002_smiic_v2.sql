-- ============================================================
-- SMIIC - Sistema Municipal de Informações e Indicadores Culturais
-- Migration V2: Novos módulos culturais + CMS + Produtos
-- ============================================================

-- ============================================================
-- CARROSSEL DA HOME (admin editável)
-- ============================================================

CREATE TABLE IF NOT EXISTS carousel_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT,
  subtitle    TEXT,
  image_url   TEXT NOT NULL,
  link_url    TEXT,
  link_label  TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONTEÚDO DO SITE (CMS — textos editáveis pelo admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS site_content (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  value       TEXT,
  type        TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'html', 'image', 'url')),
  section     TEXT,
  updated_by  UUID REFERENCES profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUTOS CULTURAIS DOS ARTISTAS
-- ============================================================

CREATE TABLE IF NOT EXISTS cultural_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'outro'
                  CHECK (type IN ('peca_teatro','show','album','livro','exposicao',
                                  'filme','danca','artesanato','grafite','outro')),
  cover_url       TEXT,
  description     TEXT,
  technical_sheet JSONB DEFAULT '{}',
  whatsapp        TEXT,
  external_link   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  views           INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ESPAÇOS CULTURAIS
-- ============================================================

CREATE TABLE IF NOT EXISTS cultural_spaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT DEFAULT 'outro'
              CHECK (type IN ('teatro','museu','biblioteca','centro_cultural',
                              'galeria','sala_ensaio','espaco_publico','outro')),
  address     TEXT,
  city        TEXT NOT NULL DEFAULT 'Água Boa',
  state       TEXT NOT NULL DEFAULT 'MT',
  phone       TEXT,
  email       TEXT,
  website     TEXT,
  capacity    INT,
  photo_url   TEXT,
  photos      JSONB DEFAULT '[]',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVENTOS CULTURAIS
-- ============================================================

CREATE TABLE IF NOT EXISTS cultural_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT DEFAULT 'outro'
              CHECK (type IN ('show','peca_teatro','exposicao','festival',
                              'oficina','feira','outro')),
  location    TEXT,
  space_id    UUID REFERENCES cultural_spaces(id),
  city        TEXT NOT NULL DEFAULT 'Água Boa',
  cover_url   TEXT,
  start_date  TIMESTAMPTZ NOT NULL,
  end_date    TIMESTAMPTZ,
  is_free     BOOLEAN NOT NULL DEFAULT TRUE,
  price       DECIMAL(10,2),
  ticket_link TEXT,
  organizer   TEXT,
  contact     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROJETOS CULTURAIS
-- ============================================================

CREATE TABLE IF NOT EXISTS cultural_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'em_andamento'
              CHECK (status IN ('em_andamento','concluido','planejamento','suspenso')),
  cover_url   TEXT,
  start_date  DATE,
  end_date    DATE,
  coordinator TEXT,
  contact     TEXT,
  website     TEXT,
  partners    TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OFICINAS CULTURAIS
-- ============================================================

CREATE TABLE IF NOT EXISTS cultural_workshops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  instructor  TEXT,
  category    TEXT,
  location    TEXT,
  city        TEXT NOT NULL DEFAULT 'Água Boa',
  cover_url   TEXT,
  start_date  TIMESTAMPTZ,
  duration    TEXT,
  schedule    TEXT,
  vacancies   INT,
  is_free     BOOLEAN NOT NULL DEFAULT TRUE,
  price       DECIMAL(10,2),
  contact     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACERVO DA BIBLIOTECA
-- ============================================================

CREATE TABLE IF NOT EXISTS library_books (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  author       TEXT,
  genre        TEXT,
  year         INT,
  isbn         TEXT,
  description  TEXT,
  cover_url    TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SÍMBOLOS MUNICIPAIS
-- ============================================================

CREATE TABLE IF NOT EXISTS municipal_symbols (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'outro'
               CHECK (type IN ('bandeira','brasao','hino','patrimonio','outro')),
  description  TEXT,
  content_html TEXT,
  image_url    TEXT,
  audio_url    TEXT,
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cultural_products_artist ON cultural_products(artist_id);
CREATE INDEX IF NOT EXISTS idx_cultural_products_type ON cultural_products(type);
CREATE INDEX IF NOT EXISTS idx_cultural_events_start ON cultural_events(start_date);
CREATE INDEX IF NOT EXISTS idx_carousel_sort ON carousel_images(sort_order) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_site_content_key ON site_content(key);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipal_symbols ENABLE ROW LEVEL SECURITY;

-- Carousel
CREATE POLICY "carousel_public_read" ON carousel_images FOR SELECT USING (is_active = TRUE);
CREATE POLICY "carousel_admin_all" ON carousel_images FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','ADMIN_CULTURA','GESTOR'))
);

-- Site content
CREATE POLICY "site_content_public_read" ON site_content FOR SELECT USING (TRUE);
CREATE POLICY "site_content_admin_write" ON site_content FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','ADMIN_CULTURA'))
);

-- Produtos culturais
CREATE POLICY "products_public_read" ON cultural_products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "products_artist_manage" ON cultural_products FOR ALL USING (
  EXISTS (SELECT 1 FROM artists WHERE id = cultural_products.artist_id AND user_id = auth.uid())
);
CREATE POLICY "products_admin_all" ON cultural_products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','ADMIN_CULTURA','GESTOR'))
);

-- Espaços
CREATE POLICY "spaces_public_read" ON cultural_spaces FOR SELECT USING (is_active = TRUE);
CREATE POLICY "spaces_admin_all" ON cultural_spaces FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','ADMIN_CULTURA','GESTOR'))
);

-- Eventos
CREATE POLICY "events_public_read" ON cultural_events FOR SELECT USING (is_active = TRUE);
CREATE POLICY "events_admin_all" ON cultural_events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','ADMIN_CULTURA','GESTOR'))
);

-- Projetos
CREATE POLICY "projects_public_read" ON cultural_projects FOR SELECT USING (is_public = TRUE);
CREATE POLICY "projects_admin_all" ON cultural_projects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','ADMIN_CULTURA','GESTOR'))
);

-- Oficinas
CREATE POLICY "workshops_public_read" ON cultural_workshops FOR SELECT USING (is_active = TRUE);
CREATE POLICY "workshops_admin_all" ON cultural_workshops FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','ADMIN_CULTURA','GESTOR'))
);

-- Biblioteca
CREATE POLICY "library_public_read" ON library_books FOR SELECT USING (TRUE);
CREATE POLICY "library_admin_all" ON library_books FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','ADMIN_CULTURA','GESTOR'))
);

-- Símbolos
CREATE POLICY "symbols_public_read" ON municipal_symbols FOR SELECT USING (is_active = TRUE);
CREATE POLICY "symbols_admin_all" ON municipal_symbols FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','ADMIN_CULTURA','GESTOR'))
);

-- ============================================================
-- SEED: Conteúdo inicial editável
-- ============================================================

INSERT INTO site_content (key, label, value, type, section) VALUES
  ('home.hero.title', 'Hero - Título Principal', 'SMIIC', 'text', 'home'),
  ('home.hero.subtitle', 'Hero - Subtítulo', 'Sistema Municipal de Informações e Indicadores Culturais', 'text', 'home'),
  ('home.hero.description', 'Hero - Descrição', 'Banco oficial de talentos culturais, editais públicos e conexão entre artistas e a gestão municipal de Água Boa.', 'text', 'home'),
  ('home.about.title', 'Sobre - Título', 'Faça parte da cultura de Água Boa', 'text', 'home'),
  ('home.about.text', 'Sobre - Texto', 'Cadastre seu perfil artístico, participe de editais e conecte-se com a gestão cultural municipal.', 'text', 'home'),
  ('library.name', 'Biblioteca - Nome', 'Biblioteca Pública Municipal de Água Boa', 'text', 'biblioteca'),
  ('library.address', 'Biblioteca - Endereço', 'Centro, Água Boa - MT', 'text', 'biblioteca'),
  ('library.hours', 'Biblioteca - Horário', 'Segunda a Sexta: 8h às 18h', 'text', 'biblioteca'),
  ('library.phone', 'Biblioteca - Telefone', '', 'text', 'biblioteca'),
  ('library.about', 'Biblioteca - Sobre', 'A Biblioteca Pública Municipal de Água Boa oferece acesso gratuito ao conhecimento para todos os cidadãos.', 'text', 'biblioteca')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SEED: Símbolos municipais
-- ============================================================

INSERT INTO municipal_symbols (title, type, description, sort_order) VALUES
  ('Bandeira Municipal', 'bandeira', 'Bandeira oficial do Município de Água Boa - MT', 1),
  ('Brasão de Armas', 'brasao', 'Brasão oficial do Município de Água Boa - MT', 2),
  ('Hino Municipal', 'hino', 'Hino oficial do Município de Água Boa - MT', 3)
ON CONFLICT DO NOTHING;

