-- ============================================================
-- SMIIC - Módulo de Agentes Culturais
-- Migration V5: cultural_agents + estruturas relacionadas
-- Plataforma Municipal de Cultura — Água Boa/MT
-- ============================================================
-- IMPORTANTE: artists existente NÃO é alterado.
-- cultural_agents é uma entidade nova e central da plataforma.
-- ============================================================


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE agent_person_type AS ENUM ('fisica', 'juridica');

CREATE TYPE agent_collective_type AS ENUM ('individual', 'coletivo');

CREATE TYPE agent_registration_status AS ENUM (
  'rascunho',
  'enviado',
  'em_analise',
  'aprovado',
  'rejeitado',
  'suspenso'
);

CREATE TYPE agent_membership_role AS ENUM (
  'owner',
  'admin',
  'member',
  'viewer'
);

CREATE TYPE agent_relationship_type AS ENUM (
  'membro',
  'gestor',
  'parceiro',
  'patrocinador'
);

-- Expandir ENUM social_platform existente com novas plataformas
ALTER TYPE social_platform ADD VALUE IF NOT EXISTS 'LINKEDIN';
ALTER TYPE social_platform ADD VALUE IF NOT EXISTS 'WHATSAPP';
ALTER TYPE social_platform ADD VALUE IF NOT EXISTS 'PORTFOLIO';


-- ============================================================
-- TABELA PRINCIPAL: cultural_agents
-- ============================================================

CREATE TABLE cultural_agents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação pública
  person_type           agent_person_type NOT NULL DEFAULT 'fisica',
  collective_type       agent_collective_type NOT NULL DEFAULT 'individual',
  display_name          TEXT,
  legal_name            TEXT,
  biography             TEXT,
  photo_url             TEXT,

  -- Documentos (privados)
  cpf                   TEXT,
  cnpj                  TEXT,

  -- Dados pessoais sensíveis (privados — RLS restrito)
  birth_date            DATE,
  gender                TEXT,
  -- race: campo sensível — finalidade: mapeamento cultural e políticas públicas de fomento
  -- Nunca exposto no perfil público. Opcional. Padrão IBGE.
  race                  TEXT,

  -- Contato
  phone                 TEXT,
  show_contact          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Status de validação
  registration_status   agent_registration_status NOT NULL DEFAULT 'rascunho',
  submitted_at          TIMESTAMPTZ,
  reviewed_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  reviewer_notes        TEXT,

  -- Termos de uso
  terms_accepted        BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at     TIMESTAMPTZ,
  terms_version         TEXT,

  -- Visibilidade pública
  is_public             BOOLEAN NOT NULL DEFAULT FALSE,

  -- Busca full-text
  search_vector         TSVECTOR,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- agent_memberships — N:N usuário <-> agente
-- ============================================================

CREATE TABLE agent_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id    UUID NOT NULL REFERENCES cultural_agents(id) ON DELETE CASCADE,
  role        agent_membership_role NOT NULL DEFAULT 'owner',
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, agent_id)
);


-- ============================================================
-- agent_addresses — Endereço completo + geolocalização
-- ============================================================

CREATE TABLE agent_addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID NOT NULL UNIQUE REFERENCES cultural_agents(id) ON DELETE CASCADE,
  cep          TEXT,
  street       TEXT,
  number       TEXT,
  complement   TEXT,
  neighborhood TEXT,
  city         TEXT,
  state        TEXT,
  lat          DECIMAL(10, 7),
  lng          DECIMAL(10, 7),
  formatted    TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- cultural_typologies — Taxonomia hierárquica em 3 níveis
-- context: 'agent' ou 'space' (reutilizável)
-- ============================================================

CREATE TABLE cultural_typologies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  level       INT NOT NULL CHECK (level IN (1, 2, 3)),
  parent_id   UUID REFERENCES cultural_typologies(id) ON DELETE RESTRICT,
  context     TEXT NOT NULL DEFAULT 'agent' CHECK (context IN ('agent', 'space')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_typology_level_parent CHECK (
    (level = 1 AND parent_id IS NULL) OR
    (level IN (2, 3) AND parent_id IS NOT NULL)
  ),
  UNIQUE(slug, context)
);


-- ============================================================
-- agent_typologies — N:N agente <-> tipologia
-- ============================================================

CREATE TABLE agent_typologies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES cultural_agents(id) ON DELETE CASCADE,
  typology_id UUID NOT NULL REFERENCES cultural_typologies(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, typology_id)
);


-- ============================================================
-- agent_areas — N:N agente <-> área de atuação (categories)
-- ============================================================

CREATE TABLE agent_areas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES cultural_agents(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, category_id)
);


-- ============================================================
-- agent_social_links
-- ============================================================

CREATE TABLE agent_social_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID NOT NULL REFERENCES cultural_agents(id) ON DELETE CASCADE,
  platform   social_platform NOT NULL,
  url        TEXT NOT NULL,
  username   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- agent_privacy — Configurações de privacidade (LGPD)
-- ============================================================

CREATE TABLE agent_privacy (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL UNIQUE REFERENCES cultural_agents(id) ON DELETE CASCADE,
  show_phone      BOOLEAN NOT NULL DEFAULT FALSE,
  show_email      BOOLEAN NOT NULL DEFAULT FALSE,
  show_social     BOOLEAN NOT NULL DEFAULT TRUE,
  show_address    BOOLEAN NOT NULL DEFAULT FALSE,
  show_birthdate  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- agent_relationships — Vínculos entre agentes
-- ============================================================

CREATE TABLE agent_relationships (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_agent_id     UUID NOT NULL REFERENCES cultural_agents(id) ON DELETE CASCADE,
  child_agent_id      UUID NOT NULL REFERENCES cultural_agents(id) ON DELETE CASCADE,
  relationship_type   agent_relationship_type NOT NULL DEFAULT 'membro',
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (parent_agent_id <> child_agent_id),
  UNIQUE(parent_agent_id, child_agent_id)
);


-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_agents_status       ON cultural_agents(registration_status);
CREATE INDEX idx_agents_is_public    ON cultural_agents(is_public);
CREATE INDEX idx_agents_person_type  ON cultural_agents(person_type);
CREATE INDEX idx_agents_collective   ON cultural_agents(collective_type);
CREATE INDEX idx_agents_search       ON cultural_agents USING GIN(search_vector);
CREATE INDEX idx_agents_created      ON cultural_agents(created_at DESC);

CREATE INDEX idx_memberships_user    ON agent_memberships(user_id);
CREATE INDEX idx_memberships_agent   ON agent_memberships(agent_id);
CREATE INDEX idx_memberships_primary ON agent_memberships(user_id, is_primary) WHERE is_primary = TRUE;

CREATE INDEX idx_addr_agent          ON agent_addresses(agent_id);
CREATE INDEX idx_addr_city           ON agent_addresses(city);

CREATE INDEX idx_typologies_level    ON cultural_typologies(level);
CREATE INDEX idx_typologies_parent   ON cultural_typologies(parent_id);
CREATE INDEX idx_typologies_context  ON cultural_typologies(context);
CREATE INDEX idx_typologies_active   ON cultural_typologies(is_active, sort_order);

CREATE INDEX idx_agent_typologies_agent ON agent_typologies(agent_id);
CREATE INDEX idx_agent_areas_agent      ON agent_areas(agent_id);
CREATE INDEX idx_agent_social_agent     ON agent_social_links(agent_id);
CREATE INDEX idx_relationships_parent   ON agent_relationships(parent_agent_id);
CREATE INDEX idx_relationships_child    ON agent_relationships(child_agent_id);


-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Search vector
CREATE OR REPLACE FUNCTION update_cultural_agent_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    SETWEIGHT(TO_TSVECTOR('portuguese', COALESCE(NEW.display_name, '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('portuguese', COALESCE(NEW.legal_name, '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('portuguese', COALESCE(NEW.biography, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agents_search_vector
  BEFORE INSERT OR UPDATE ON cultural_agents
  FOR EACH ROW EXECUTE FUNCTION update_cultural_agent_search_vector();

-- updated_at
CREATE TRIGGER trg_cultural_agents_updated_at
  BEFORE UPDATE ON cultural_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_address_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agent_addresses_updated_at
  BEFORE UPDATE ON agent_addresses
  FOR EACH ROW EXECUTE FUNCTION update_address_updated_at();

CREATE OR REPLACE FUNCTION update_privacy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agent_privacy_updated_at
  BEFORE UPDATE ON agent_privacy
  FOR EACH ROW EXECUTE FUNCTION update_privacy_updated_at();

-- Auto-criar agent_privacy ao inserir cultural_agent
CREATE OR REPLACE FUNCTION handle_new_cultural_agent()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agent_privacy (agent_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_cultural_agent_created
  AFTER INSERT ON cultural_agents
  FOR EACH ROW EXECUTE FUNCTION handle_new_cultural_agent();

-- Garantir apenas 1 is_primary por usuário
CREATE OR REPLACE FUNCTION ensure_single_primary_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE agent_memberships
    SET is_primary = FALSE
    WHERE user_id = NEW.user_id
      AND agent_id <> NEW.agent_id
      AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_single_primary_membership
  BEFORE INSERT OR UPDATE ON agent_memberships
  FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_membership();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE cultural_agents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memberships    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_addresses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_typologies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_typologies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_areas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_social_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_privacy        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_relationships  ENABLE ROW LEVEL SECURITY;


-- Helper: verifica se o usuário tem membership no agente
CREATE OR REPLACE FUNCTION is_agent_member(p_agent_id UUID, p_min_role TEXT DEFAULT 'viewer')
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM agent_memberships
    WHERE agent_id = p_agent_id
      AND user_id = auth.uid()
      AND CASE p_min_role
        WHEN 'viewer' THEN role IN ('owner', 'admin', 'member', 'viewer')
        WHEN 'member' THEN role IN ('owner', 'admin', 'member')
        WHEN 'admin'  THEN role IN ('owner', 'admin')
        WHEN 'owner'  THEN role = 'owner'
        ELSE FALSE
      END
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


-- ---- cultural_agents ----

CREATE POLICY "agents_select_public" ON cultural_agents FOR SELECT
  USING (
    (is_public = TRUE AND registration_status = 'aprovado')
    OR is_agent_member(id, 'viewer')
    OR is_servidor_or_above()
  );

CREATE POLICY "agents_insert_authenticated" ON cultural_agents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "agents_update_member_or_admin" ON cultural_agents FOR UPDATE
  USING (is_agent_member(id, 'admin') OR is_admin());

CREATE POLICY "agents_delete_admin" ON cultural_agents FOR DELETE
  USING (is_admin());


-- ---- agent_memberships ----

CREATE POLICY "memberships_select" ON agent_memberships FOR SELECT
  USING (user_id = auth.uid() OR is_servidor_or_above());

CREATE POLICY "memberships_insert" ON agent_memberships FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "memberships_update" ON agent_memberships FOR UPDATE
  USING (is_agent_member(agent_id, 'owner') OR is_admin());

CREATE POLICY "memberships_delete" ON agent_memberships FOR DELETE
  USING (is_agent_member(agent_id, 'owner') OR is_admin());


-- ---- agent_addresses ----

CREATE POLICY "addresses_select" ON agent_addresses FOR SELECT
  USING (
    agent_id IN (
      SELECT ca.id FROM cultural_agents ca
      JOIN agent_privacy ap ON ap.agent_id = ca.id
      WHERE ca.is_public = TRUE
        AND ca.registration_status = 'aprovado'
        AND ap.show_address = TRUE
    )
    OR is_agent_member(agent_id, 'viewer')
    OR is_servidor_or_above()
  );

CREATE POLICY "addresses_write" ON agent_addresses FOR ALL
  USING (is_agent_member(agent_id, 'admin') OR is_admin());


-- ---- cultural_typologies ----

CREATE POLICY "typologies_select_all" ON cultural_typologies FOR SELECT USING (TRUE);
CREATE POLICY "typologies_write_admin" ON cultural_typologies FOR ALL USING (is_admin());


-- ---- agent_typologies ----

CREATE POLICY "agent_typologies_select" ON agent_typologies FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM cultural_agents
      WHERE is_public = TRUE AND registration_status = 'aprovado'
    )
    OR is_agent_member(agent_id, 'viewer')
    OR is_servidor_or_above()
  );

CREATE POLICY "agent_typologies_write" ON agent_typologies FOR ALL
  USING (is_agent_member(agent_id, 'admin') OR is_admin());


-- ---- agent_areas ----

CREATE POLICY "agent_areas_select" ON agent_areas FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM cultural_agents
      WHERE is_public = TRUE AND registration_status = 'aprovado'
    )
    OR is_agent_member(agent_id, 'viewer')
    OR is_servidor_or_above()
  );

CREATE POLICY "agent_areas_write" ON agent_areas FOR ALL
  USING (is_agent_member(agent_id, 'admin') OR is_admin());


-- ---- agent_social_links ----

CREATE POLICY "agent_social_select" ON agent_social_links FOR SELECT
  USING (
    agent_id IN (
      SELECT ca.id FROM cultural_agents ca
      JOIN agent_privacy ap ON ap.agent_id = ca.id
      WHERE ca.is_public = TRUE
        AND ca.registration_status = 'aprovado'
        AND ap.show_social = TRUE
    )
    OR is_agent_member(agent_id, 'viewer')
    OR is_servidor_or_above()
  );

CREATE POLICY "agent_social_write" ON agent_social_links FOR ALL
  USING (is_agent_member(agent_id, 'admin') OR is_admin());


-- ---- agent_privacy ----

CREATE POLICY "agent_privacy_select" ON agent_privacy FOR SELECT
  USING (is_agent_member(agent_id, 'viewer') OR is_servidor_or_above());

CREATE POLICY "agent_privacy_update" ON agent_privacy FOR UPDATE
  USING (is_agent_member(agent_id, 'admin') OR is_admin());

CREATE POLICY "agent_privacy_insert_trigger" ON agent_privacy FOR INSERT
  WITH CHECK (TRUE);


-- ---- agent_relationships ----

CREATE POLICY "relationships_select" ON agent_relationships FOR SELECT
  USING (
    parent_agent_id IN (
      SELECT id FROM cultural_agents
      WHERE is_public = TRUE AND registration_status = 'aprovado'
    )
    OR is_agent_member(parent_agent_id, 'viewer')
    OR is_agent_member(child_agent_id, 'viewer')
    OR is_servidor_or_above()
  );

CREATE POLICY "relationships_write" ON agent_relationships FOR ALL
  USING (is_agent_member(parent_agent_id, 'admin') OR is_admin());


-- ============================================================
-- SEED: Taxonomia Cultural em 3 Níveis (context = 'agent')
-- Baseada no Manual do SMIIC — adaptada para Água Boa/MT
-- ============================================================

-- NÍVEL 1
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('00000001-0000-0000-0000-000000000001', 'Demais Agentes Culturais',    'demais-agentes-culturais', 1, NULL, 'agent', 1),
  ('00000001-0000-0000-0000-000000000002', 'Artes Cênicas',               'artes-cenicas',            1, NULL, 'agent', 2),
  ('00000001-0000-0000-0000-000000000003', 'Artes Visuais',               'artes-visuais',             1, NULL, 'agent', 3),
  ('00000001-0000-0000-0000-000000000004', 'Música',                       'musica',                   1, NULL, 'agent', 4),
  ('00000001-0000-0000-0000-000000000005', 'Literatura',                   'literatura',               1, NULL, 'agent', 5),
  ('00000001-0000-0000-0000-000000000006', 'Audiovisual',                  'audiovisual',              1, NULL, 'agent', 6),
  ('00000001-0000-0000-0000-000000000007', 'Patrimônio Cultural',          'patrimonio-cultural',      1, NULL, 'agent', 7),
  ('00000001-0000-0000-0000-000000000008', 'Cultura Popular e Tradições',  'cultura-popular',          1, NULL, 'agent', 8),
  ('00000001-0000-0000-0000-000000000009', 'Gestão e Produção Cultural',   'gestao-producao',          1, NULL, 'agent', 9),
  ('00000001-0000-0000-0000-000000000010', 'Formação e Pesquisa Cultural', 'formacao-pesquisa',        1, NULL, 'agent', 10)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 2 — Demais Agentes Culturais
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('10000002-0001-0000-0000-000000000001', 'Músico(a)',             'musicista',             2, '00000001-0000-0000-0000-000000000001', 'agent', 1),
  ('10000002-0001-0000-0000-000000000002', 'Ator / Atriz',         'ator-atriz',            2, '00000001-0000-0000-0000-000000000001', 'agent', 2),
  ('10000002-0001-0000-0000-000000000003', 'Dançarino(a)',          'dancarinoag',           2, '00000001-0000-0000-0000-000000000001', 'agent', 3),
  ('10000002-0001-0000-0000-000000000004', 'Artista Visual',       'artista-visual',        2, '00000001-0000-0000-0000-000000000001', 'agent', 4),
  ('10000002-0001-0000-0000-000000000005', 'Escritor(a)',          'escritorag',            2, '00000001-0000-0000-0000-000000000001', 'agent', 5),
  ('10000002-0001-0000-0000-000000000006', 'Produtor(a) Cultural', 'produtor-cultural-gen', 2, '00000001-0000-0000-0000-000000000001', 'agent', 6),
  ('10000002-0001-0000-0000-000000000007', 'Gestor(a) Cultural',   'gestor-cultural-gen',   2, '00000001-0000-0000-0000-000000000001', 'agent', 7),
  ('10000002-0001-0000-0000-000000000008', 'Artesão / Artesã',     'artesaoag',             2, '00000001-0000-0000-0000-000000000001', 'agent', 8)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 2 — Artes Cênicas
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('10000002-0002-0000-0000-000000000001', 'Teatro',      'teatro',      2, '00000001-0000-0000-0000-000000000002', 'agent', 1),
  ('10000002-0002-0000-0000-000000000002', 'Dança',       'danca',       2, '00000001-0000-0000-0000-000000000002', 'agent', 2),
  ('10000002-0002-0000-0000-000000000003', 'Circo',       'circo',       2, '00000001-0000-0000-0000-000000000002', 'agent', 3),
  ('10000002-0002-0000-0000-000000000004', 'Opera',       'opera',       2, '00000001-0000-0000-0000-000000000002', 'agent', 4),
  ('10000002-0002-0000-0000-000000000005', 'Performance', 'performance', 2, '00000001-0000-0000-0000-000000000002', 'agent', 5)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 2 — Artes Visuais
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('10000002-0003-0000-0000-000000000001', 'Artes Plásticas',      'artes-plasticas', 2, '00000001-0000-0000-0000-000000000003', 'agent', 1),
  ('10000002-0003-0000-0000-000000000002', 'Fotografia',           'fotografia',      2, '00000001-0000-0000-0000-000000000003', 'agent', 2),
  ('10000002-0003-0000-0000-000000000003', 'Arte Digital',         'arte-digital',    2, '00000001-0000-0000-0000-000000000003', 'agent', 3),
  ('10000002-0003-0000-0000-000000000004', 'Grafite e Arte Urbana','grafite',         2, '00000001-0000-0000-0000-000000000003', 'agent', 4),
  ('10000002-0003-0000-0000-000000000005', 'Design',               'design',          2, '00000001-0000-0000-0000-000000000003', 'agent', 5)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 2 — Música
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('10000002-0004-0000-0000-000000000001', 'Músico(a) Instrumental', 'musico-instrumental', 2, '00000001-0000-0000-0000-000000000004', 'agent', 1),
  ('10000002-0004-0000-0000-000000000002', 'Cantor(a)',              'cantor',              2, '00000001-0000-0000-0000-000000000004', 'agent', 2),
  ('10000002-0004-0000-0000-000000000003', 'Compositor(a)',          'compositor',          2, '00000001-0000-0000-0000-000000000004', 'agent', 3),
  ('10000002-0004-0000-0000-000000000004', 'Banda ou Grupo Musical', 'banda-grupo',         2, '00000001-0000-0000-0000-000000000004', 'agent', 4),
  ('10000002-0004-0000-0000-000000000005', 'Coral ou Grupo Vocal',   'coral',               2, '00000001-0000-0000-0000-000000000004', 'agent', 5),
  ('10000002-0004-0000-0000-000000000006', 'DJ',                     'dj',                  2, '00000001-0000-0000-0000-000000000004', 'agent', 6),
  ('10000002-0004-0000-0000-000000000007', 'Produtor(a) Musical',    'produtor-musical',    2, '00000001-0000-0000-0000-000000000004', 'agent', 7),
  ('10000002-0004-0000-0000-000000000008', 'Regente',                'regente',             2, '00000001-0000-0000-0000-000000000004', 'agent', 8)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 2 — Literatura
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('10000002-0005-0000-0000-000000000001', 'Escritor(a)',              'escritor',           2, '00000001-0000-0000-0000-000000000005', 'agent', 1),
  ('10000002-0005-0000-0000-000000000002', 'Poeta',                    'poeta',              2, '00000001-0000-0000-0000-000000000005', 'agent', 2),
  ('10000002-0005-0000-0000-000000000003', 'Contador(a) de Histórias', 'contador-historias', 2, '00000001-0000-0000-0000-000000000005', 'agent', 3),
  ('10000002-0005-0000-0000-000000000004', 'Cronista',                 'cronista',           2, '00000001-0000-0000-0000-000000000005', 'agent', 4),
  ('10000002-0005-0000-0000-000000000005', 'Dramaturgo(a)',             'dramaturgo',         2, '00000001-0000-0000-0000-000000000005', 'agent', 5)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 2 — Audiovisual
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('10000002-0006-0000-0000-000000000001', 'Cinema',            'cinema',         2, '00000001-0000-0000-0000-000000000006', 'agent', 1),
  ('10000002-0006-0000-0000-000000000002', 'Vídeo e Videomaker','videomaker',     2, '00000001-0000-0000-0000-000000000006', 'agent', 2),
  ('10000002-0006-0000-0000-000000000003', 'Animação',           'animacao',       2, '00000001-0000-0000-0000-000000000006', 'agent', 3),
  ('10000002-0006-0000-0000-000000000004', 'Fotojornalismo',     'fotojornalismo', 2, '00000001-0000-0000-0000-000000000006', 'agent', 4)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 2 — Patrimônio Cultural
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('10000002-0007-0000-0000-000000000001', 'Patrimônio Material',  'patrimonio-material',  2, '00000001-0000-0000-0000-000000000007', 'agent', 1),
  ('10000002-0007-0000-0000-000000000002', 'Patrimônio Imaterial', 'patrimonio-imaterial', 2, '00000001-0000-0000-0000-000000000007', 'agent', 2),
  ('10000002-0007-0000-0000-000000000003', 'Arqueologia',          'arqueologia',          2, '00000001-0000-0000-0000-000000000007', 'agent', 3),
  ('10000002-0007-0000-0000-000000000004', 'Museologia',           'museologia',           2, '00000001-0000-0000-0000-000000000007', 'agent', 4)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 2 — Cultura Popular e Tradições
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('10000002-0008-0000-0000-000000000001', 'Artesanato',                'artesanato',       2, '00000001-0000-0000-0000-000000000008', 'agent', 1),
  ('10000002-0008-0000-0000-000000000002', 'Folclore',                  'folclore',         2, '00000001-0000-0000-0000-000000000008', 'agent', 2),
  ('10000002-0008-0000-0000-000000000003', 'Gastronomia Cultural',      'gastronomia-cult', 2, '00000001-0000-0000-0000-000000000008', 'agent', 3),
  ('10000002-0008-0000-0000-000000000004', 'Mestre de Ofício',          'mestre-oficio',    2, '00000001-0000-0000-0000-000000000008', 'agent', 4),
  ('10000002-0008-0000-0000-000000000005', 'Festa e Celebração Popular','festa-celebracao', 2, '00000001-0000-0000-0000-000000000008', 'agent', 5)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 2 — Gestão e Produção Cultural
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('10000002-0009-0000-0000-000000000001', 'Produtor(a) Cultural',    'produtor-cultural',    2, '00000001-0000-0000-0000-000000000009', 'agent', 1),
  ('10000002-0009-0000-0000-000000000002', 'Gestor(a) Cultural',      'gestor-cultural',      2, '00000001-0000-0000-0000-000000000009', 'agent', 2),
  ('10000002-0009-0000-0000-000000000003', 'Curador(a)',              'curador',              2, '00000001-0000-0000-0000-000000000009', 'agent', 3),
  ('10000002-0009-0000-0000-000000000004', 'Captador(a) de Recursos', 'captador',             2, '00000001-0000-0000-0000-000000000009', 'agent', 4),
  ('10000002-0009-0000-0000-000000000005', 'Comunicador(a) Cultural', 'comunicador-cultural', 2, '00000001-0000-0000-0000-000000000009', 'agent', 5)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 2 — Formação e Pesquisa Cultural
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('10000002-0010-0000-0000-000000000001', 'Educador(a) Cultural',    'educador-cultural',    2, '00000001-0000-0000-0000-000000000010', 'agent', 1),
  ('10000002-0010-0000-0000-000000000002', 'Pesquisador(a) Cultural', 'pesquisador-cultural', 2, '00000001-0000-0000-0000-000000000010', 'agent', 2),
  ('10000002-0010-0000-0000-000000000003', 'Professor(a) de Arte',    'professor-arte',       2, '00000001-0000-0000-0000-000000000010', 'agent', 3),
  ('10000002-0010-0000-0000-000000000004', 'Crítico(a) Cultural',     'critico-cultural',     2, '00000001-0000-0000-0000-000000000010', 'agent', 4)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 3 — Demais Agentes Culturais > Músico(a) (exemplo canônico do Manual)
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('20000003-0001-0001-0000-000000000001', 'Cantor(a)',           'cantor-gen',       3, '10000002-0001-0000-0000-000000000001', 'agent', 1),
  ('20000003-0001-0001-0000-000000000002', 'Instrumentista',      'instrumentista',   3, '10000002-0001-0000-0000-000000000001', 'agent', 2),
  ('20000003-0001-0001-0000-000000000003', 'Compositor(a)',       'compositor-gen',   3, '10000002-0001-0000-0000-000000000001', 'agent', 3),
  ('20000003-0001-0001-0000-000000000004', 'DJ',                  'dj-gen',           3, '10000002-0001-0000-0000-000000000001', 'agent', 4),
  ('20000003-0001-0001-0000-000000000005', 'Regente',             'regente-gen',      3, '10000002-0001-0000-0000-000000000001', 'agent', 5),
  ('20000003-0001-0001-0000-000000000006', 'Produtor(a) Musical', 'produtor-mus-gen', 3, '10000002-0001-0000-0000-000000000001', 'agent', 6)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 3 — Artes Cênicas > Teatro
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('20000003-0002-0001-0000-000000000001', 'Ator / Atriz',       'ator-teatro',       3, '10000002-0002-0000-0000-000000000001', 'agent', 1),
  ('20000003-0002-0001-0000-000000000002', 'Diretor(a)',          'diretor-teatro',    3, '10000002-0002-0000-0000-000000000001', 'agent', 2),
  ('20000003-0002-0001-0000-000000000003', 'Dramaturgo(a)',       'dramaturgo-teatro', 3, '10000002-0002-0000-0000-000000000001', 'agent', 3),
  ('20000003-0002-0001-0000-000000000004', 'Figurinista',         'figurinista',       3, '10000002-0002-0000-0000-000000000001', 'agent', 4),
  ('20000003-0002-0001-0000-000000000005', 'Cenógrafo(a)',        'cenografo',         3, '10000002-0002-0000-0000-000000000001', 'agent', 5),
  ('20000003-0002-0001-0000-000000000006', 'Iluminador(a)',       'iluminador',        3, '10000002-0002-0000-0000-000000000001', 'agent', 6)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 3 — Artes Cênicas > Dança
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('20000003-0002-0002-0000-000000000001', 'Bailarino(a)',          'bailarino',       3, '10000002-0002-0000-0000-000000000002', 'agent', 1),
  ('20000003-0002-0002-0000-000000000002', 'Coreógrafo(a)',         'coreografo',      3, '10000002-0002-0000-0000-000000000002', 'agent', 2),
  ('20000003-0002-0002-0000-000000000003', 'Professor(a) de Dança', 'professor-danca', 3, '10000002-0002-0000-0000-000000000002', 'agent', 3)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 3 — Artes Cênicas > Circo
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('20000003-0002-0003-0000-000000000001', 'Acrobata',    'acrobata',    3, '10000002-0002-0000-0000-000000000003', 'agent', 1),
  ('20000003-0002-0003-0000-000000000002', 'Palhaço(a)',  'palhaco',     3, '10000002-0002-0000-0000-000000000003', 'agent', 2),
  ('20000003-0002-0003-0000-000000000003', 'Malabarista', 'malabarista', 3, '10000002-0002-0000-0000-000000000003', 'agent', 3),
  ('20000003-0002-0003-0000-000000000004', 'Mágico(a)',   'magico',      3, '10000002-0002-0000-0000-000000000003', 'agent', 4)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 3 — Artes Visuais > Artes Plásticas
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('20000003-0003-0001-0000-000000000001', 'Pintor(a)',    'pintor',      3, '10000002-0003-0000-0000-000000000001', 'agent', 1),
  ('20000003-0003-0001-0000-000000000002', 'Escultor(a)', 'escultor',    3, '10000002-0003-0000-0000-000000000001', 'agent', 2),
  ('20000003-0003-0001-0000-000000000003', 'Gravurista',  'gravurista',  3, '10000002-0003-0000-0000-000000000001', 'agent', 3),
  ('20000003-0003-0001-0000-000000000004', 'Ceramista',   'ceramista',   3, '10000002-0003-0000-0000-000000000001', 'agent', 4),
  ('20000003-0003-0001-0000-000000000005', 'Aquarelista', 'aquarelista', 3, '10000002-0003-0000-0000-000000000001', 'agent', 5),
  ('20000003-0003-0001-0000-000000000006', 'Muralista',   'muralista',   3, '10000002-0003-0000-0000-000000000001', 'agent', 6)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 3 — Música > Músico(a) Instrumental
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('20000003-0004-0001-0000-000000000001', 'Violonista',     'violonista',     3, '10000002-0004-0000-0000-000000000001', 'agent', 1),
  ('20000003-0004-0001-0000-000000000002', 'Guitarrista',    'guitarrista',    3, '10000002-0004-0000-0000-000000000001', 'agent', 2),
  ('20000003-0004-0001-0000-000000000003', 'Pianista',       'pianista',       3, '10000002-0004-0000-0000-000000000001', 'agent', 3),
  ('20000003-0004-0001-0000-000000000004', 'Percussionista', 'percussionista', 3, '10000002-0004-0000-0000-000000000001', 'agent', 4),
  ('20000003-0004-0001-0000-000000000005', 'Violinista',     'violinista',     3, '10000002-0004-0000-0000-000000000001', 'agent', 5),
  ('20000003-0004-0001-0000-000000000006', 'Saxofonista',    'saxofonista',    3, '10000002-0004-0000-0000-000000000001', 'agent', 6),
  ('20000003-0004-0001-0000-000000000007', 'Acordeonista',   'acordeonista',   3, '10000002-0004-0000-0000-000000000001', 'agent', 7)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 3 — Cultura Popular > Artesanato
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('20000003-0008-0001-0000-000000000001', 'Ceramista',              'ceramista-art',    3, '10000002-0008-0000-0000-000000000001', 'agent', 1),
  ('20000003-0008-0001-0000-000000000002', 'Tecelão(a)',             'tecelao',          3, '10000002-0008-0000-0000-000000000001', 'agent', 2),
  ('20000003-0008-0001-0000-000000000003', 'Bordadeiro(a)',          'bordadeiro',       3, '10000002-0008-0000-0000-000000000001', 'agent', 3),
  ('20000003-0008-0001-0000-000000000004', 'Escultor(a) em Madeira', 'escultor-madeira', 3, '10000002-0008-0000-0000-000000000001', 'agent', 4),
  ('20000003-0008-0001-0000-000000000005', 'Ourives e Joalheiro(a)', 'ourives',          3, '10000002-0008-0000-0000-000000000001', 'agent', 5),
  ('20000003-0008-0001-0000-000000000006', 'Trançador(a)',           'trancador',        3, '10000002-0008-0000-0000-000000000001', 'agent', 6)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 3 — Patrimônio Cultural > Patrimônio Imaterial
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('20000003-0007-0002-0000-000000000001', 'Mestre de Ofício',              'mestre-oficio-pat', 3, '10000002-0007-0000-0000-000000000002', 'agent', 1),
  ('20000003-0007-0002-0000-000000000002', 'Festeiro(a)',                   'festeiro',          3, '10000002-0007-0000-0000-000000000002', 'agent', 2),
  ('20000003-0007-0002-0000-000000000003', 'Guardião(a) de Tradição',       'guardiao',          3, '10000002-0007-0000-0000-000000000002', 'agent', 3),
  ('20000003-0007-0002-0000-000000000004', 'Benzedeiro(a) e Curandeiro(a)', 'benzedeiro',        3, '10000002-0007-0000-0000-000000000002', 'agent', 4)
ON CONFLICT (slug, context) DO NOTHING;


-- NÍVEL 3 — Audiovisual > Cinema
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('20000003-0006-0001-0000-000000000001', 'Diretor(a)',        'diretor-cinema',    3, '10000002-0006-0000-0000-000000000001', 'agent', 1),
  ('20000003-0006-0001-0000-000000000002', 'Roteirista',        'roteirista',        3, '10000002-0006-0000-0000-000000000001', 'agent', 2),
  ('20000003-0006-0001-0000-000000000003', 'Cinematografista',  'cinematografista',  3, '10000002-0006-0000-0000-000000000001', 'agent', 3),
  ('20000003-0006-0001-0000-000000000004', 'Editor(a) de Vídeo','editor-video',      3, '10000002-0006-0000-0000-000000000001', 'agent', 4),
  ('20000003-0006-0001-0000-000000000005', 'Ator / Atriz',      'ator-cinema',       3, '10000002-0006-0000-0000-000000000001', 'agent', 5)
ON CONFLICT (slug, context) DO NOTHING;


-- ============================================================
-- SEED: Tipologias de Espaços Culturais (context = 'space')
-- ============================================================

INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('30000001-1000-0000-0000-000000000001', 'Equipamentos Culturais',         'equipamentos-culturais', 1, NULL, 'space', 1),
  ('30000001-1000-0000-0000-000000000002', 'Espaços de Formação',            'espacos-formacao',       1, NULL, 'space', 2),
  ('30000001-1000-0000-0000-000000000003', 'Espaços de Memória',             'espacos-memoria',        1, NULL, 'space', 3),
  ('30000001-1000-0000-0000-000000000004', 'Espaços Religiosos e Culturais', 'espacos-religiosos',     1, NULL, 'space', 4)
ON CONFLICT (slug, context) DO NOTHING;

-- Nível 2 — Equipamentos Culturais (space)
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('30000002-1001-0000-0000-000000000001', 'Teatro e Casa de Espetáculos', 'teatro-espetaculos-sp', 2, '30000001-1000-0000-0000-000000000001', 'space', 1),
  ('30000002-1001-0000-0000-000000000002', 'Centro Cultural',              'centro-cultural-sp',    2, '30000001-1000-0000-0000-000000000001', 'space', 2),
  ('30000002-1001-0000-0000-000000000003', 'Galeria de Arte',              'galeria-arte-sp',       2, '30000001-1000-0000-0000-000000000001', 'space', 3),
  ('30000002-1001-0000-0000-000000000004', 'Sala de Ensaio',              'sala-ensaio-sp',         2, '30000001-1000-0000-0000-000000000001', 'space', 4),
  ('30000002-1001-0000-0000-000000000005', 'Espaço Público',              'espaco-publico-sp',      2, '30000001-1000-0000-0000-000000000001', 'space', 5),
  ('30000002-1001-0000-0000-000000000006', 'Demais Equipamentos Culturais','demais-equipamentos-sp',2, '30000001-1000-0000-0000-000000000001', 'space', 6)
ON CONFLICT (slug, context) DO NOTHING;

-- Nível 3 — Demais Equipamentos Culturais (exemplo do Manual: livraria)
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('30000003-1001-0006-0000-000000000001', 'Livraria',         'livraria-sp',        3, '30000002-1001-0000-0000-000000000006', 'space', 1),
  ('30000003-1001-0006-0000-000000000002', 'Estúdio Musical',  'estudio-musical-sp', 3, '30000002-1001-0000-0000-000000000006', 'space', 2),
  ('30000003-1001-0006-0000-000000000003', 'Ateliê',           'atelie-sp',          3, '30000002-1001-0000-0000-000000000006', 'space', 3),
  ('30000003-1001-0006-0000-000000000004', 'Cinema',           'cinema-sp',          3, '30000002-1001-0000-0000-000000000006', 'space', 4)
ON CONFLICT (slug, context) DO NOTHING;

-- Nível 2 — Espaços de Memória (space)
INSERT INTO cultural_typologies (id, name, slug, level, parent_id, context, sort_order) VALUES
  ('30000002-1003-0000-0000-000000000001', 'Museu',             'museu-sp',           2, '30000001-1000-0000-0000-000000000003', 'space', 1),
  ('30000002-1003-0000-0000-000000000002', 'Biblioteca',        'biblioteca-sp',      2, '30000001-1000-0000-0000-000000000003', 'space', 2),
  ('30000002-1003-0000-0000-000000000003', 'Arquivo Histórico', 'arquivo-historico-sp',2,'30000001-1000-0000-0000-000000000003', 'space', 3),
  ('30000002-1003-0000-0000-000000000004', 'Memorial',          'memorial-sp',        2, '30000001-1000-0000-0000-000000000003', 'space', 4)
ON CONFLICT (slug, context) DO NOTHING;


-- ============================================================
-- FIM DA MIGRATION V5
-- ============================================================
