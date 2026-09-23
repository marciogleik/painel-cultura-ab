-- Change submit_agent to auto-approve the agent instead of setting it to 'enviado'.
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

  -- Auto-aprovado! is_public = true para já ser publicado no mapa.
  UPDATE public.cultural_agents
  SET registration_status = 'aprovado', submitted_at = now(), is_public = true
  WHERE id = p_agent_id
  RETURNING * INTO v_agent;

  -- Avisar a equipe da Secretaria
  FOR v_admin IN
    SELECT id FROM public.profiles WHERE is_active AND role IN ('SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR')
  LOOP
    INSERT INTO public.agent_notifications (recipient_id, type, title, body, meta)
    VALUES (v_admin, 'general', 'Novo agente cadastrado (Auto-aprovado)',
            'O agente "' || COALESCE(v_agent.display_name, 'Sem nome') || '" finalizou o cadastro e já foi publicado no mapa.',
            jsonb_build_object('agent_id', p_agent_id));
  END LOOP;

  RETURN v_agent;
END;
$$;

-- Also auto-approve any existing agents that are stuck in 'enviado' or 'em_analise'
UPDATE public.cultural_agents
SET registration_status = 'aprovado', is_public = true
WHERE registration_status IN ('enviado', 'em_analise');
