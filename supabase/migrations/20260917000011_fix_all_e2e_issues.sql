-- 20260917000011_fix_all_e2e_issues.sql
-- A3, M3: Corrigir RPC submit_agent
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
  IF COALESCE(trim(v_agent.display_name), '') = '' THEN v_missing := array_append(v_missing, 'nome de exibição'); END IF;
  IF v_agent.person_type = 'juridica' AND COALESCE(trim(v_agent.legal_name), '') = '' THEN v_missing := array_append(v_missing, 'razão social'); END IF;
  IF v_agent.person_type = 'fisica' AND COALESCE(trim(v_agent.cpf), '') = '' THEN v_missing := array_append(v_missing, 'CPF'); END IF;
  IF v_agent.person_type = 'juridica' AND COALESCE(trim(v_agent.cnpj), '') = '' THEN v_missing := array_append(v_missing, 'CNPJ'); END IF;
  IF NOT v_agent.terms_accepted THEN v_missing := array_append(v_missing, 'aceite dos termos de uso'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agent_typologies WHERE agent_id = p_agent_id) THEN v_missing := array_append(v_missing, 'tipologia'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agent_addresses WHERE agent_id = p_agent_id AND COALESCE(city, '') <> '') THEN v_missing := array_append(v_missing, 'cidade'); END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Cadastro incompleto. Falta: %', array_to_string(v_missing, ', ') USING ERRCODE = '23514';
  END IF;

  -- A3: Reverter auto-aprovação. Status deve ser 'enviado'. Opcionalmente is_public só depois de aprovado, mas vamos manter o default.
  UPDATE public.cultural_agents
  SET registration_status = 'enviado', submitted_at = now()
  WHERE id = p_agent_id
  RETURNING * INTO v_agent;

  -- Avisar a equipe da Secretaria
  FOR v_admin IN
    SELECT id FROM public.profiles WHERE is_active AND role IN ('SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR')
  LOOP
    INSERT INTO public.agent_notifications (recipient_id, type, title, body, meta)
    VALUES (v_admin, 'general', 'Novo agente enviado para homologação',
            'O agente "' || COALESCE(v_agent.display_name, 'Sem nome') || '" enviou o cadastro para análise.',
            jsonb_build_object('agent_id', p_agent_id));
  END LOOP;

  RETURN v_agent;
END;
$$;

-- M23: Indexes para Foreign Keys (Performance)
CREATE INDEX IF NOT EXISTS idx_cultural_agents_created_by ON public.cultural_agents(created_by);
CREATE INDEX IF NOT EXISTS idx_cultural_agents_reviewed_by ON public.cultural_agents(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_agent_memberships_user_id ON public.agent_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memberships_agent_id ON public.agent_memberships(agent_id);

CREATE INDEX IF NOT EXISTS idx_workshop_enrollments_workshop_id ON public.workshop_enrollments(workshop_id);

-- Fechar agent_notifications para não anônimos (M23, B15)
DROP POLICY IF EXISTS "notifications_select" ON public.agent_notifications;
CREATE POLICY "notifications_select" ON public.agent_notifications FOR SELECT
  USING (recipient_id = (select auth.uid()) OR public.is_servidor_or_above());

-- B15: Fechar audit_logs
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT
  USING (public.is_servidor_or_above());

-- C3: Bloquear leitura publica da tabela base (cultural_agents)
DROP POLICY IF EXISTS "agents_select_public" ON public.cultural_agents;
CREATE POLICY "agents_select_public" ON public.cultural_agents FOR SELECT
  USING (
    -- Só os donos/admins do agente e os servidores publicos podem ler a tabela base.
    -- O público em geral deve usar a view public_cultural_agents.
    public.is_agent_member(id, 'admin') OR public.is_servidor_or_above() OR public.is_agent_member(id, 'owner')
  );

-- A5: Moderar produtos públicos
DROP POLICY IF EXISTS "products_public_read" ON public.cultural_products;
CREATE POLICY "products_public_read" ON public.cultural_products FOR SELECT
  USING (
    is_active = TRUE 
    AND EXISTS (
      SELECT 1 FROM public.cultural_agents a 
      WHERE a.id = agent_id AND a.is_public = TRUE AND a.registration_status = 'aprovado'
    )
  );

-- M7, M22, B7: Trigger faltante de avaliação
CREATE OR REPLACE FUNCTION public.handle_evaluation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status != OLD.status AND NEW.status IN ('aprovada', 'rejeitada') THEN
    NEW.evaluated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enrollment_evaluation ON public.workshop_enrollments;
CREATE TRIGGER trg_enrollment_evaluation
  BEFORE UPDATE ON public.workshop_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_evaluation_timestamp();

-- M22: auto-invite accepted 
CREATE OR REPLACE FUNCTION public.handle_agent_member_auto_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.user_id = (select auth.uid()) THEN
    NEW.invite_status = 'accepted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_member_auto_accept ON public.agent_memberships;
CREATE TRIGGER trg_agent_member_auto_accept
  BEFORE INSERT ON public.agent_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_agent_member_auto_accept();
