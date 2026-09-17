-- ============================================================
-- Migration 9: Endurecimento de segurança e regras de negócio no banco
-- Plataforma Municipal de Cultura — Água Boa/MT
--
-- Cobre os achados C1, C2, C3, C4, M2, M3, M4, M5, M9, A2, A11, A17 da auditoria:
--  1. Funções auxiliares com search_path fixo e invite_status respeitado
--  2. profiles: ninguém altera o próprio papel
--  3. cultural_agents: status de homologação só muda por RPC / admin
--  4. View pública sem dados sensíveis (CPF, CNPJ, nascimento, gênero, raça)
--  5. Convites de vínculo e resposta via RPC
--  6. submit_agent / review_agent como RPC
--  7. Trilha de auditoria em audit_logs
--  8. Storage: buckets media e agent-files, políticas por papel
--  9. inscriptions e cultural_products passam a aceitar agent_id
-- 10. updated_at, índices em FKs, limites anti-spam
-- ============================================================


-- ============================================================
-- 1. FUNÇÕES AUXILIARES
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
      AND is_active
      AND role IN ('SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_servidor_or_above()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
      AND is_active
      AND role IN ('SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR', 'SERVIDOR')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = (select auth.uid())
$$;

-- Membership só conta quando o convite foi aceito
CREATE OR REPLACE FUNCTION public.is_agent_member(p_agent_id uuid, p_min_role text DEFAULT 'viewer')
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agent_memberships
    WHERE agent_id = p_agent_id
      AND user_id = (select auth.uid())
      AND invite_status = 'accepted'
      AND CASE p_min_role
        WHEN 'viewer' THEN role IN ('owner', 'admin', 'member', 'viewer')
        WHEN 'member' THEN role IN ('owner', 'admin', 'member')
        WHEN 'admin'  THEN role IN ('owner', 'admin')
        WHEN 'owner'  THEN role = 'owner'
        ELSE FALSE
      END
  )
$$;

-- Agente visível ao público? (usado nas políticas das tabelas filhas,
-- já que anon não lê mais cultural_agents diretamente)
CREATE OR REPLACE FUNCTION public.is_agent_public(p_agent_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cultural_agents
    WHERE id = p_agent_id
      AND is_public = TRUE
      AND registration_status = 'aprovado'
  )
$$;

CREATE OR REPLACE FUNCTION public.agent_privacy_flag(p_agent_id uuid, p_flag text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE p_flag
      WHEN 'show_address' THEN show_address
      WHEN 'show_social'  THEN show_social
      WHEN 'show_phone'   THEN show_phone
      ELSE FALSE END
    FROM public.agent_privacy WHERE agent_id = p_agent_id
  ), FALSE)
$$;

-- search_path fixo nas funções já existentes (advisor 0011)
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_artist_search_vector() SET search_path = public;
ALTER FUNCTION public.handle_new_artist() SET search_path = public;
ALTER FUNCTION public.update_enrollment_updated_at() SET search_path = public;
ALTER FUNCTION public.update_cultural_agent_search_vector() SET search_path = public;
ALTER FUNCTION public.update_address_updated_at() SET search_path = public;
ALTER FUNCTION public.update_privacy_updated_at() SET search_path = public;
ALTER FUNCTION public.ensure_single_primary_membership() SET search_path = public;
ALTER FUNCTION public.handle_new_cultural_agent() SET search_path = public;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'auto_confirm_new_user') THEN
    ALTER FUNCTION public.auto_confirm_new_user() SET search_path = public;
    REVOKE EXECUTE ON FUNCTION public.auto_confirm_new_user() FROM anon, authenticated, PUBLIC;
  END IF;
END $$;

-- Funções de trigger não devem ser chamáveis via /rest/v1/rpc (advisor 0028/0029)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_cultural_agent() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_artist() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_single_primary_membership() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon, PUBLIC;


-- ============================================================
-- 2. PROFILES — ninguém muda o próprio papel
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Não é permitido alterar o papel do usuário' USING ERRCODE = '42501';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Não é permitido alterar o status da conta' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.role = 'SUPER_ADMIN' AND OLD.role <> 'SUPER_ADMIN' THEN
    -- Só um SUPER_ADMIN promove outro SUPER_ADMIN
    IF public.get_user_role() <> 'SUPER_ADMIN' THEN
      RAISE EXCEPTION 'Apenas SUPER_ADMIN pode conceder o papel SUPER_ADMIN' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.protect_profile_columns() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (id = (select auth.uid()) OR public.is_admin())
  WITH CHECK (id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (id = (select auth.uid()) OR public.is_servidor_or_above());

-- Inserção só pelo trigger de auth (SECURITY DEFINER); nunca pela API
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());


-- ============================================================
-- 3. CULTURAL_AGENTS — status só muda por RPC / admin
-- ============================================================

-- Membership owner criada automaticamente ao inserir o agente
CREATE OR REPLACE FUNCTION public.handle_new_cultural_agent()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.agent_privacy (agent_id) VALUES (NEW.id)
  ON CONFLICT (agent_id) DO NOTHING;

  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.agent_memberships (user_id, agent_id, role, is_primary, invite_status)
    VALUES (NEW.created_by, NEW.id, 'owner', TRUE, 'accepted')
    ON CONFLICT (user_id, agent_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_agent_review_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Colunas de homologação são exclusivas do servidor
  IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Campos de homologação só podem ser alterados pela Secretaria' USING ERRCODE = '42501';
  END IF;

  -- O agente só pode: enviar (rascunho/rejeitado -> enviado) ou retirar (enviado -> rascunho)
  IF NEW.registration_status IS DISTINCT FROM OLD.registration_status THEN
    IF NOT (
      (OLD.registration_status IN ('rascunho', 'rejeitado') AND NEW.registration_status = 'enviado')
      OR (OLD.registration_status = 'enviado' AND NEW.registration_status = 'rascunho')
    ) THEN
      RAISE EXCEPTION 'Mudança de status não permitida: % -> %', OLD.registration_status, NEW.registration_status
        USING ERRCODE = '42501';
    END IF;
    IF NEW.registration_status = 'enviado' THEN
      NEW.submitted_at := now();
    END IF;
  END IF;

  -- Visibilidade pública só pode ser ligada por quem já foi aprovado
  IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    IF NEW.is_public = TRUE AND NEW.registration_status <> 'aprovado' THEN
      RAISE EXCEPTION 'O perfil só fica público após a aprovação' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.protect_agent_review_columns() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_agent_review_columns ON public.cultural_agents;
CREATE TRIGGER trg_protect_agent_review_columns
  BEFORE UPDATE ON public.cultural_agents
  FOR EACH ROW EXECUTE FUNCTION public.protect_agent_review_columns();

-- Políticas: o público não lê a tabela (usa a view); dono, membros e servidores leem
DROP POLICY IF EXISTS "agents_select_public" ON public.cultural_agents;
CREATE POLICY "agents_select_public" ON public.cultural_agents FOR SELECT
  USING (
    created_by = (select auth.uid())
    OR public.is_agent_member(id, 'viewer')
    OR public.is_servidor_or_above()
  );

DROP POLICY IF EXISTS "agents_insert_authenticated" ON public.cultural_agents;
CREATE POLICY "agents_insert_authenticated" ON public.cultural_agents FOR INSERT
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND created_by = (select auth.uid())
    AND registration_status = 'rascunho'
    AND is_public = FALSE
    AND reviewed_by IS NULL
  );

DROP POLICY IF EXISTS "agents_update_member_or_admin" ON public.cultural_agents;
CREATE POLICY "agents_update_member_or_admin" ON public.cultural_agents FOR UPDATE
  USING (created_by = (select auth.uid()) OR public.is_agent_member(id, 'admin') OR public.is_admin())
  WITH CHECK (created_by = (select auth.uid()) OR public.is_agent_member(id, 'admin') OR public.is_admin());

-- Tabelas filhas: leitura pública via is_agent_public (SECURITY DEFINER)
DROP POLICY IF EXISTS "agent_typologies_select" ON public.agent_typologies;
CREATE POLICY "agent_typologies_select" ON public.agent_typologies FOR SELECT
  USING (public.is_agent_public(agent_id) OR public.is_agent_member(agent_id, 'viewer') OR public.is_servidor_or_above());

DROP POLICY IF EXISTS "agent_areas_select" ON public.agent_areas;
CREATE POLICY "agent_areas_select" ON public.agent_areas FOR SELECT
  USING (public.is_agent_public(agent_id) OR public.is_agent_member(agent_id, 'viewer') OR public.is_servidor_or_above());

DROP POLICY IF EXISTS "agent_social_select" ON public.agent_social_links;
CREATE POLICY "agent_social_select" ON public.agent_social_links FOR SELECT
  USING (
    (public.is_agent_public(agent_id) AND public.agent_privacy_flag(agent_id, 'show_social'))
    OR public.is_agent_member(agent_id, 'viewer')
    OR public.is_servidor_or_above()
  );

DROP POLICY IF EXISTS "addresses_select" ON public.agent_addresses;
CREATE POLICY "addresses_select" ON public.agent_addresses FOR SELECT
  USING (
    (public.is_agent_public(agent_id) AND public.agent_privacy_flag(agent_id, 'show_address'))
    OR public.is_agent_member(agent_id, 'viewer')
    OR public.is_servidor_or_above()
  );

DROP POLICY IF EXISTS "relationships_select" ON public.agent_relationships;
CREATE POLICY "relationships_select" ON public.agent_relationships FOR SELECT
  USING (
    public.is_agent_public(parent_agent_id)
    OR public.is_agent_member(parent_agent_id, 'viewer')
    OR public.is_agent_member(child_agent_id, 'viewer')
    OR public.is_servidor_or_above()
  );

-- Escrita nas tabelas filhas: separar de SELECT (advisor multiple_permissive_policies)
DROP POLICY IF EXISTS "agent_typologies_write" ON public.agent_typologies;
CREATE POLICY "agent_typologies_write" ON public.agent_typologies FOR ALL
  USING (public.is_agent_member(agent_id, 'admin') OR public.is_admin())
  WITH CHECK (public.is_agent_member(agent_id, 'admin') OR public.is_admin());

DROP POLICY IF EXISTS "agent_areas_write" ON public.agent_areas;
CREATE POLICY "agent_areas_write" ON public.agent_areas FOR ALL
  USING (public.is_agent_member(agent_id, 'admin') OR public.is_admin())
  WITH CHECK (public.is_agent_member(agent_id, 'admin') OR public.is_admin());

DROP POLICY IF EXISTS "agent_social_write" ON public.agent_social_links;
CREATE POLICY "agent_social_write" ON public.agent_social_links FOR ALL
  USING (public.is_agent_member(agent_id, 'admin') OR public.is_admin())
  WITH CHECK (public.is_agent_member(agent_id, 'admin') OR public.is_admin());

DROP POLICY IF EXISTS "addresses_write" ON public.agent_addresses;
CREATE POLICY "addresses_write" ON public.agent_addresses FOR ALL
  USING (public.is_agent_member(agent_id, 'admin') OR public.is_admin())
  WITH CHECK (public.is_agent_member(agent_id, 'admin') OR public.is_admin());

DROP POLICY IF EXISTS "agent_privacy_update" ON public.agent_privacy;
CREATE POLICY "agent_privacy_update" ON public.agent_privacy FOR UPDATE
  USING (public.is_agent_member(agent_id, 'admin') OR public.is_admin())
  WITH CHECK (public.is_agent_member(agent_id, 'admin') OR public.is_admin());

-- Só o trigger (SECURITY DEFINER) cria agent_privacy
DROP POLICY IF EXISTS "agent_privacy_insert_trigger" ON public.agent_privacy;
CREATE POLICY "agent_privacy_insert" ON public.agent_privacy FOR INSERT
  WITH CHECK (public.is_agent_member(agent_id, 'admin') OR public.is_admin());


-- ============================================================
-- 4. VIEW PÚBLICA — sem CPF, CNPJ, nascimento, gênero, raça
-- ============================================================

CREATE OR REPLACE VIEW public.public_cultural_agents
WITH (security_invoker = false) AS
SELECT
  a.id,
  a.person_type,
  a.collective_type,
  a.display_name,
  a.biography,
  a.photo_url,
  a.show_contact,
  CASE WHEN a.show_contact THEN a.phone END                 AS phone,
  a.show_curriculum,
  CASE WHEN a.show_curriculum THEN a.curriculum_url END     AS curriculum_url,
  -- Cidade e UF sempre visíveis (é o que o mapa cultural precisa);
  -- o restante do endereço obedece a agent_privacy.show_address.
  ad.city,
  ad.state,
  CASE WHEN COALESCE(p.show_address, FALSE) THEN ad.neighborhood END AS neighborhood,
  COALESCE(p.show_address, FALSE)                           AS show_address,
  COALESCE(p.show_social, TRUE)                             AS show_social,
  a.registration_status,
  a.is_public,
  a.search_vector,
  a.created_at,
  a.updated_at
FROM public.cultural_agents a
LEFT JOIN public.agent_privacy p   ON p.agent_id = a.id
LEFT JOIN public.agent_addresses ad ON ad.agent_id = a.id
WHERE a.is_public = TRUE
  AND a.registration_status = 'aprovado';

GRANT SELECT ON public.public_cultural_agents TO anon, authenticated;


-- ============================================================
-- 5. CONVITES DE VÍNCULO (RPC)
-- ============================================================

-- is_primary só vale para membership aceita
CREATE OR REPLACE FUNCTION public.ensure_single_primary_membership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_status <> 'accepted' THEN
    NEW.is_primary := FALSE;
  END IF;
  IF NEW.is_primary = TRUE THEN
    UPDATE public.agent_memberships
    SET is_primary = FALSE
    WHERE user_id = NEW.user_id
      AND agent_id <> NEW.agent_id
      AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "memberships_insert" ON public.agent_memberships;
CREATE POLICY "memberships_insert" ON public.agent_memberships FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "memberships_select" ON public.agent_memberships;
CREATE POLICY "memberships_select" ON public.agent_memberships FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR public.is_agent_member(agent_id, 'admin')
    OR public.is_servidor_or_above()
  );

DROP POLICY IF EXISTS "memberships_update" ON public.agent_memberships;
CREATE POLICY "memberships_update" ON public.agent_memberships FOR UPDATE
  USING (public.is_agent_member(agent_id, 'owner') OR public.is_admin())
  WITH CHECK (public.is_agent_member(agent_id, 'owner') OR public.is_admin());

DROP POLICY IF EXISTS "memberships_delete" ON public.agent_memberships;
CREATE POLICY "memberships_delete" ON public.agent_memberships FOR DELETE
  USING (
    user_id = (select auth.uid())                      -- sair do agente
    OR public.is_agent_member(agent_id, 'owner')
    OR public.is_admin()
  );

CREATE OR REPLACE FUNCTION public.invite_agent_member(
  p_agent_id uuid,
  p_email text,
  p_role agent_membership_role DEFAULT 'member'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agent_name text;
  v_membership_id uuid;
BEGIN
  IF NOT (public.is_agent_member(p_agent_id, 'admin') OR public.is_admin()) THEN
    RAISE EXCEPTION 'Sem permissão para convidar membros para este agente' USING ERRCODE = '42501';
  END IF;
  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'Não é possível convidar como proprietário' USING ERRCODE = '22023';
  END IF;

  SELECT u.id INTO v_user_id FROM auth.users u WHERE lower(u.email) = lower(trim(p_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado com o e-mail %', p_email USING ERRCODE = 'P0002';
  END IF;
  IF v_user_id = (select auth.uid()) THEN
    RAISE EXCEPTION 'Você já faz parte deste agente' USING ERRCODE = '22023';
  END IF;

  SELECT display_name INTO v_agent_name FROM public.cultural_agents WHERE id = p_agent_id;

  INSERT INTO public.agent_memberships (user_id, agent_id, role, is_primary, invite_status)
  VALUES (v_user_id, p_agent_id, p_role, FALSE, 'pending')
  ON CONFLICT (user_id, agent_id) DO UPDATE
    SET role = EXCLUDED.role,
        invite_status = CASE WHEN agent_memberships.invite_status = 'accepted' THEN 'accepted' ELSE 'pending' END
  RETURNING id INTO v_membership_id;

  INSERT INTO public.agent_notifications (recipient_id, type, title, body, meta)
  VALUES (
    v_user_id,
    'membership_invite',
    'Convite de vínculo',
    format('O agente cultural "%s" quer vincular você como %s. Aceite ou recuse abaixo.', COALESCE(v_agent_name, 'sem nome'), p_role),
    jsonb_build_object('agent_id', p_agent_id, 'membership_id', v_membership_id)
  );

  RETURN v_membership_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.invite_agent_member(uuid, text, agent_membership_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_agent_member(uuid, text, agent_membership_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_agent_invite(p_membership_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_m public.agent_memberships%ROWTYPE;
  v_agent_name text;
  v_user_name text;
  v_owner uuid;
BEGIN
  SELECT * INTO v_m FROM public.agent_memberships WHERE id = p_membership_id;
  IF v_m.id IS NULL OR v_m.user_id <> (select auth.uid()) THEN
    RAISE EXCEPTION 'Convite não encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_m.invite_status <> 'pending' THEN
    RAISE EXCEPTION 'Este convite já foi respondido' USING ERRCODE = '22023';
  END IF;

  IF p_accept THEN
    UPDATE public.agent_memberships SET invite_status = 'accepted' WHERE id = p_membership_id;
  ELSE
    DELETE FROM public.agent_memberships WHERE id = p_membership_id;
  END IF;

  UPDATE public.agent_notifications SET is_read = TRUE
  WHERE recipient_id = v_m.user_id AND (meta->>'membership_id')::uuid = p_membership_id;

  SELECT display_name INTO v_agent_name FROM public.cultural_agents WHERE id = v_m.agent_id;
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_m.user_id;

  FOR v_owner IN
    SELECT user_id FROM public.agent_memberships
    WHERE agent_id = v_m.agent_id AND role IN ('owner', 'admin') AND invite_status = 'accepted'
  LOOP
    INSERT INTO public.agent_notifications (recipient_id, type, title, body, meta)
    VALUES (
      v_owner,
      CASE WHEN p_accept THEN 'membership_accepted' ELSE 'membership_rejected' END,
      CASE WHEN p_accept THEN 'Convite aceito' ELSE 'Convite recusado' END,
      format('%s %s o convite para "%s".', COALESCE(v_user_name, 'Um usuário'),
             CASE WHEN p_accept THEN 'aceitou' ELSE 'recusou' END, COALESCE(v_agent_name, 'seu agente')),
      jsonb_build_object('agent_id', v_m.agent_id)
    );
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.respond_agent_invite(uuid, boolean) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_agent_invite(uuid, boolean) TO authenticated;


-- ============================================================
-- 6. SUBMIT / REVIEW COMO RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_agent(p_agent_id uuid)
RETURNS public.cultural_agents
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent public.cultural_agents%ROWTYPE;
  v_missing text[] := ARRAY[]::text[];
  v_admin uuid;
BEGIN
  SELECT * INTO v_agent FROM public.cultural_agents WHERE id = p_agent_id;
  IF v_agent.id IS NULL THEN
    RAISE EXCEPTION 'Agente não encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (v_agent.created_by = (select auth.uid()) OR public.is_agent_member(p_agent_id, 'admin') OR public.is_admin()) THEN
    RAISE EXCEPTION 'Sem permissão para enviar este cadastro' USING ERRCODE = '42501';
  END IF;
  IF v_agent.registration_status NOT IN ('rascunho', 'rejeitado') THEN
    RAISE EXCEPTION 'Este cadastro já foi enviado (status atual: %)', v_agent.registration_status USING ERRCODE = '22023';
  END IF;

  -- Mínimo exigido pelo Manual SMIIC (§3.2–3.7)
  IF COALESCE(trim(v_agent.display_name), '') = '' THEN v_missing := v_missing || 'nome de exibição'; END IF;
  IF v_agent.person_type = 'juridica' AND COALESCE(trim(v_agent.legal_name), '') = '' THEN v_missing := v_missing || 'razão social'; END IF;
  IF v_agent.person_type = 'fisica' AND COALESCE(trim(v_agent.cpf), '') = '' THEN v_missing := v_missing || 'CPF'; END IF;
  IF v_agent.person_type = 'juridica' AND COALESCE(trim(v_agent.cnpj), '') = '' THEN v_missing := v_missing || 'CNPJ'; END IF;
  IF NOT v_agent.terms_accepted THEN v_missing := v_missing || 'aceite dos termos de uso'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agent_typologies WHERE agent_id = p_agent_id) THEN v_missing := v_missing || 'tipologia'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agent_addresses WHERE agent_id = p_agent_id AND COALESCE(city, '') <> '') THEN v_missing := v_missing || 'cidade'; END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Cadastro incompleto. Falta: %', array_to_string(v_missing, ', ') USING ERRCODE = '23514';
  END IF;

  UPDATE public.cultural_agents
  SET registration_status = 'aprovado', submitted_at = now(), is_public = true
  WHERE id = p_agent_id
  RETURNING * INTO v_agent;

  -- Avisar a equipe da Secretaria
  FOR v_admin IN
    SELECT id FROM public.profiles WHERE is_active AND role IN ('SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR')
  LOOP
    INSERT INTO public.agent_notifications (recipient_id, type, title, body, meta)
    VALUES (v_admin, 'general', 'Novo agente cadastrado',
            'O agente "' || COALESCE(v_agent.display_name, 'Sem nome') || '" realizou o cadastro na plataforma.',
            jsonb_build_object('agent_id', p_agent_id));
  END LOOP;

  RETURN v_agent;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.submit_agent(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_agent(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_agent(
  p_agent_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS public.cultural_agents
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent public.cultural_agents%ROWTYPE;
  v_owner uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas a Secretaria pode homologar cadastros' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('aprovado', 'rejeitado', 'em_analise', 'suspenso') THEN
    RAISE EXCEPTION 'Decisão inválida: %', p_decision USING ERRCODE = '22023';
  END IF;
  IF p_decision = 'rejeitado' AND COALESCE(trim(p_notes), '') = '' THEN
    RAISE EXCEPTION 'Informe no parecer o motivo da devolução' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_agent FROM public.cultural_agents WHERE id = p_agent_id;
  IF v_agent.id IS NULL THEN
    RAISE EXCEPTION 'Agente não encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_agent.registration_status = 'rascunho' THEN
    RAISE EXCEPTION 'Este cadastro ainda não foi enviado pelo agente' USING ERRCODE = '22023';
  END IF;

  UPDATE public.cultural_agents
  SET registration_status = p_decision::agent_registration_status,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      reviewer_notes = NULLIF(trim(p_notes), ''),
      is_public = (p_decision = 'aprovado')
  WHERE id = p_agent_id
  RETURNING * INTO v_agent;

  FOR v_owner IN
    SELECT user_id FROM public.agent_memberships
    WHERE agent_id = p_agent_id AND role IN ('owner', 'admin') AND invite_status = 'accepted'
  LOOP
    INSERT INTO public.agent_notifications (recipient_id, type, title, body, meta)
    VALUES (
      v_owner, 'status_change',
      CASE p_decision
        WHEN 'aprovado'   THEN 'Cadastro aprovado'
        WHEN 'rejeitado'  THEN 'Cadastro devolvido para ajustes'
        WHEN 'em_analise' THEN 'Cadastro em análise'
        ELSE 'Cadastro suspenso' END,
      CASE p_decision
        WHEN 'aprovado'   THEN format('Seu perfil "%s" foi aprovado e já aparece no Mapa Cultural.', COALESCE(v_agent.display_name, ''))
        WHEN 'rejeitado'  THEN format('Seu cadastro "%s" precisa de ajustes. Parecer: %s', COALESCE(v_agent.display_name, ''), p_notes)
        WHEN 'em_analise' THEN format('Seu cadastro "%s" está sendo analisado pela Secretaria.', COALESCE(v_agent.display_name, ''))
        ELSE format('Seu cadastro "%s" foi suspenso. %s', COALESCE(v_agent.display_name, ''), COALESCE(p_notes, '')) END,
      jsonb_build_object('agent_id', p_agent_id)
    );
  END LOOP;

  RETURN v_agent;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_agent(uuid, text, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_agent(uuid, text, text) TO authenticated;


-- ============================================================
-- 7. TRILHA DE AUDITORIA
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
  v_changed jsonb;
  v_watch text[] := TG_ARGV;
  v_key text;
BEGIN
  -- Só registra se alguma das colunas observadas mudou
  v_changed := '{}'::jsonb;
  FOREACH v_key IN ARRAY v_watch LOOP
    IF v_old -> v_key IS DISTINCT FROM v_new -> v_key THEN
      v_changed := v_changed || jsonb_build_object(v_key, jsonb_build_object('de', v_old -> v_key, 'para', v_new -> v_key));
    END IF;
  END LOOP;
  IF v_changed = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.audit_logs (user_id, user_email, operation, resource, resource_id, old_value, new_value, metadata)
  VALUES (
    (select auth.uid()),
    (select auth.jwt() ->> 'email'),
    TG_OP,
    TG_TABLE_NAME,
    (v_new ->> 'id'),
    v_old - 'search_vector',
    v_new - 'search_vector',
    jsonb_build_object('changed', v_changed)
  );
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS trg_audit_cultural_agents ON public.cultural_agents;
CREATE TRIGGER trg_audit_cultural_agents
  AFTER UPDATE ON public.cultural_agents
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('registration_status', 'is_public', 'reviewed_by', 'cpf', 'cnpj');

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('role', 'is_active', 'cpf');

DROP TRIGGER IF EXISTS trg_audit_inscriptions ON public.inscriptions;
CREATE TRIGGER trg_audit_inscriptions
  AFTER UPDATE ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('status', 'reviewed_by');

-- Só o trigger (SECURITY DEFINER) insere em audit_logs
DROP POLICY IF EXISTS "audit_insert_system" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT WITH CHECK (FALSE);


-- ============================================================
-- 8. STORAGE
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('site-media',  'site-media',  TRUE,  20971520, ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf',
                                                        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                                        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','audio/mpeg','audio/mp4','audio/ogg']),
  ('media',       'media',       TRUE,  10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('agent-files', 'agent-files', FALSE, 20971520, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Extrai o id do agente de caminhos "agents/<uuid>/..." ou "curriculos/<uuid>/..."
CREATE OR REPLACE FUNCTION public.storage_agent_id(p_name text)
RETURNS uuid
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_name ~ '^(agents|curriculos)/[0-9a-fA-F-]{36}/' THEN split_part(p_name, '/', 2)::uuid
    ELSE NULL END
$$;

-- site-media: leitura pública; escrita só admin (antes: qualquer usuário logado)
DROP POLICY IF EXISTS "Public read site-media"  ON storage.objects;
DROP POLICY IF EXISTS "Admin upload site-media" ON storage.objects;
DROP POLICY IF EXISTS "Admin update site-media" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete site-media" ON storage.objects;
DROP POLICY IF EXISTS "site_media_read"   ON storage.objects;
DROP POLICY IF EXISTS "site_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "site_media_update" ON storage.objects;
DROP POLICY IF EXISTS "site_media_delete" ON storage.objects;

CREATE POLICY "site_media_read"   ON storage.objects FOR SELECT USING (bucket_id = 'site-media');
CREATE POLICY "site_media_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'site-media' AND public.is_admin());
CREATE POLICY "site_media_update" ON storage.objects FOR UPDATE USING (bucket_id = 'site-media' AND public.is_admin());
CREATE POLICY "site_media_delete" ON storage.objects FOR DELETE USING (bucket_id = 'site-media' AND public.is_admin());

-- media: fotos de agentes em agents/<agent_id>/...; leitura pública; escrita pelo membro admin do agente
DROP POLICY IF EXISTS "media_read"   ON storage.objects;
DROP POLICY IF EXISTS "media_insert" ON storage.objects;
DROP POLICY IF EXISTS "media_update" ON storage.objects;
DROP POLICY IF EXISTS "media_delete" ON storage.objects;

CREATE POLICY "media_read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "media_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'media' AND (
    public.is_admin()
    OR public.is_agent_member(public.storage_agent_id(name), 'admin')
    OR EXISTS (SELECT 1 FROM public.cultural_agents a WHERE a.id = public.storage_agent_id(name) AND a.created_by = (select auth.uid()))
  )
);
CREATE POLICY "media_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'media' AND (
    public.is_admin()
    OR public.is_agent_member(public.storage_agent_id(name), 'admin')
    OR EXISTS (SELECT 1 FROM public.cultural_agents a WHERE a.id = public.storage_agent_id(name) AND a.created_by = (select auth.uid()))
  )
);
CREATE POLICY "media_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'media' AND (
    public.is_admin()
    OR public.is_agent_member(public.storage_agent_id(name), 'admin')
    OR EXISTS (SELECT 1 FROM public.cultural_agents a WHERE a.id = public.storage_agent_id(name) AND a.created_by = (select auth.uid()))
  )
);

-- agent-files: currículos em curriculos/<agent_id>/...; bucket privado.
-- Leitura: membro, servidor, ou público quando o agente está aprovado e liberou o currículo.
DROP POLICY IF EXISTS "agent_files_read"   ON storage.objects;
DROP POLICY IF EXISTS "agent_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "agent_files_update" ON storage.objects;
DROP POLICY IF EXISTS "agent_files_delete" ON storage.objects;

CREATE POLICY "agent_files_read" ON storage.objects FOR SELECT USING (
  bucket_id = 'agent-files' AND (
    public.is_servidor_or_above()
    OR public.is_agent_member(public.storage_agent_id(name), 'viewer')
    OR EXISTS (SELECT 1 FROM public.cultural_agents a WHERE a.id = public.storage_agent_id(name) AND a.created_by = (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.cultural_agents a
      WHERE a.id = public.storage_agent_id(name)
        AND a.is_public AND a.registration_status = 'aprovado' AND a.show_curriculum
    )
  )
);
CREATE POLICY "agent_files_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'agent-files' AND (
    public.is_admin()
    OR public.is_agent_member(public.storage_agent_id(name), 'admin')
    OR EXISTS (SELECT 1 FROM public.cultural_agents a WHERE a.id = public.storage_agent_id(name) AND a.created_by = (select auth.uid()))
  )
);
CREATE POLICY "agent_files_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'agent-files' AND (
    public.is_admin()
    OR public.is_agent_member(public.storage_agent_id(name), 'admin')
    OR EXISTS (SELECT 1 FROM public.cultural_agents a WHERE a.id = public.storage_agent_id(name) AND a.created_by = (select auth.uid()))
  )
);
CREATE POLICY "agent_files_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'agent-files' AND (
    public.is_admin()
    OR public.is_agent_member(public.storage_agent_id(name), 'admin')
    OR EXISTS (SELECT 1 FROM public.cultural_agents a WHERE a.id = public.storage_agent_id(name) AND a.created_by = (select auth.uid()))
  )
);


-- ============================================================
-- 9. INSCRIÇÕES E PRODUTOS PASSAM A USAR agent_id
-- ============================================================

ALTER TABLE public.inscriptions
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.cultural_agents(id) ON DELETE CASCADE;
ALTER TABLE public.inscriptions ALTER COLUMN artist_id DROP NOT NULL;
ALTER TABLE public.inscriptions DROP CONSTRAINT IF EXISTS inscriptions_owner_check;
ALTER TABLE public.inscriptions ADD CONSTRAINT inscriptions_owner_check
  CHECK (agent_id IS NOT NULL OR artist_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inscriptions_edital_agent
  ON public.inscriptions(edital_id, agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inscriptions_agent ON public.inscriptions(agent_id);

ALTER TABLE public.cultural_products
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.cultural_agents(id) ON DELETE CASCADE;
ALTER TABLE public.cultural_products ALTER COLUMN artist_id DROP NOT NULL;
ALTER TABLE public.cultural_products DROP CONSTRAINT IF EXISTS products_owner_check;
ALTER TABLE public.cultural_products ADD CONSTRAINT products_owner_check
  CHECK (agent_id IS NOT NULL OR artist_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_products_agent ON public.cultural_products(agent_id);

-- Inscrição só em edital publicado e dentro do prazo
CREATE OR REPLACE FUNCTION public.edital_is_open(p_edital_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.editais
    WHERE id = p_edital_id
      AND status = 'PUBLICADO'
      AND CURRENT_DATE BETWEEN start_date AND end_date
  )
$$;

DROP POLICY IF EXISTS "inscriptions_select_own_or_admin" ON public.inscriptions;
DROP POLICY IF EXISTS "inscriptions_select" ON public.inscriptions;
CREATE POLICY "inscriptions_select" ON public.inscriptions FOR SELECT
  USING (
    (agent_id IS NOT NULL AND public.is_agent_member(agent_id, 'viewer'))
    OR (artist_id IS NOT NULL AND artist_id IN (SELECT id FROM public.artists WHERE user_id = (select auth.uid())))
    OR public.is_servidor_or_above()
  );

DROP POLICY IF EXISTS "inscriptions_insert_artist" ON public.inscriptions;
DROP POLICY IF EXISTS "inscriptions_insert" ON public.inscriptions;
CREATE POLICY "inscriptions_insert" ON public.inscriptions FOR INSERT
  WITH CHECK (
    agent_id IS NOT NULL
    AND public.is_agent_member(agent_id, 'admin')
    AND public.is_agent_public(agent_id)
    AND public.edital_is_open(edital_id)
    AND status = 'ABERTO'
    AND reviewed_by IS NULL
  );

DROP POLICY IF EXISTS "inscriptions_update_admin" ON public.inscriptions;
DROP POLICY IF EXISTS "inscriptions_update" ON public.inscriptions;
CREATE POLICY "inscriptions_update" ON public.inscriptions FOR UPDATE
  USING (public.is_servidor_or_above())
  WITH CHECK (public.is_servidor_or_above());

-- reviewed_by / reviewed_at preenchidos automaticamente quando o status muda
CREATE OR REPLACE FUNCTION public.stamp_inscription_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reviewed_by := (select auth.uid());
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.stamp_inscription_review() FROM anon, authenticated, PUBLIC;
DROP TRIGGER IF EXISTS trg_stamp_inscription_review ON public.inscriptions;
CREATE TRIGGER trg_stamp_inscription_review
  BEFORE UPDATE ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_inscription_review();

DROP POLICY IF EXISTS "files_select_own_or_admin" ON public.inscription_files;
DROP POLICY IF EXISTS "files_select" ON public.inscription_files;
CREATE POLICY "files_select" ON public.inscription_files FOR SELECT
  USING (
    inscription_id IN (
      SELECT i.id FROM public.inscriptions i
      WHERE (i.agent_id IS NOT NULL AND public.is_agent_member(i.agent_id, 'viewer'))
         OR (i.artist_id IS NOT NULL AND i.artist_id IN (SELECT id FROM public.artists WHERE user_id = (select auth.uid())))
    )
    OR public.is_servidor_or_above()
  );
DROP POLICY IF EXISTS "files_insert_own" ON public.inscription_files;
DROP POLICY IF EXISTS "files_insert" ON public.inscription_files;
CREATE POLICY "files_insert" ON public.inscription_files FOR INSERT
  WITH CHECK (
    inscription_id IN (
      SELECT i.id FROM public.inscriptions i
      WHERE i.agent_id IS NOT NULL AND public.is_agent_member(i.agent_id, 'admin')
    )
  );

DROP POLICY IF EXISTS "products_artist_manage" ON public.cultural_products;
DROP POLICY IF EXISTS "products_agent_manage" ON public.cultural_products;
CREATE POLICY "products_agent_manage" ON public.cultural_products FOR ALL
  USING (
    (agent_id IS NOT NULL AND public.is_agent_member(agent_id, 'admin'))
    OR (artist_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.artists a WHERE a.id = cultural_products.artist_id AND a.user_id = (select auth.uid())))
  )
  WITH CHECK (
    (agent_id IS NOT NULL AND public.is_agent_member(agent_id, 'admin'))
    OR (artist_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.artists a WHERE a.id = cultural_products.artist_id AND a.user_id = (select auth.uid())))
  );

DROP POLICY IF EXISTS "products_admin_all" ON public.cultural_products;
CREATE POLICY "products_admin_all" ON public.cultural_products FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- site_content: GESTOR também edita (alinha com is_admin() e com o menu do painel)
DROP POLICY IF EXISTS "site_content_admin_write" ON public.site_content;
CREATE POLICY "site_content_admin_write" ON public.site_content FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- 10. updated_at, ÍNDICES, ANTI-SPAM
-- ============================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cultural_events','cultural_spaces','cultural_projects','cultural_workshops',
                           'library_books','municipal_symbols','carousel_images','cultural_products','site_content'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', t, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_areas_category      ON public.agent_areas(category_id);
CREATE INDEX IF NOT EXISTS idx_agent_typologies_typology ON public.agent_typologies(typology_id);
CREATE INDEX IF NOT EXISTS idx_agents_reviewed_by        ON public.cultural_agents(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_events_space              ON public.cultural_events(space_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by         ON public.cultural_events(created_by);
CREATE INDEX IF NOT EXISTS idx_spaces_created_by         ON public.cultural_spaces(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_by       ON public.cultural_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_workshops_created_by      ON public.cultural_workshops(created_by);
CREATE INDEX IF NOT EXISTS idx_carousel_created_by       ON public.carousel_images(created_by);
CREATE INDEX IF NOT EXISTS idx_site_content_updated_by   ON public.site_content(updated_by);
CREATE INDEX IF NOT EXISTS idx_editais_category          ON public.editais(category_id);
CREATE INDEX IF NOT EXISTS idx_editais_published_by      ON public.editais(published_by);
CREATE INDEX IF NOT EXISTS idx_inscriptions_reviewed_by  ON public.inscriptions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_artist_awards_artist      ON public.artist_awards(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_projects_artist    ON public.artist_projects(artist_id);
CREATE INDEX IF NOT EXISTS idx_memberships_agent_status  ON public.agent_memberships(agent_id, invite_status);

-- Fichas de matrícula: no máximo 5 envios por hora por telefone (freio simples contra spam)
CREATE OR REPLACE FUNCTION public.throttle_enrollments()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND (
    SELECT count(*) FROM public.workshop_enrollments
    WHERE phone = NEW.phone AND created_at > now() - interval '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'Muitas fichas enviadas com este telefone. Tente novamente mais tarde.' USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.throttle_enrollments() FROM anon, authenticated, PUBLIC;
DROP TRIGGER IF EXISTS trg_throttle_enrollments ON public.workshop_enrollments;
CREATE TRIGGER trg_throttle_enrollments
  BEFORE INSERT ON public.workshop_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.throttle_enrollments();
