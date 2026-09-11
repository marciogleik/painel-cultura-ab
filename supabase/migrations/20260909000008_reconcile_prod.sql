-- ============================================================
-- Migration 8: Reconciliação com o banco de produção
-- Produção recebeu, pelo dashboard, mudanças que o repositório não tinha.
-- Esta migration é idempotente: em produção é quase um no-op; em um banco
-- criado a partir do repositório ela traz o schema ao mesmo estado.
-- ============================================================

-- 1. cultural_agents.created_by (existe em produção, faltava no repositório)
ALTER TABLE public.cultural_agents
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agents_created_by ON public.cultural_agents(created_by);

-- Preencher created_by a partir do owner da membership, quando estiver nulo
UPDATE public.cultural_agents a
SET created_by = m.user_id
FROM public.agent_memberships m
WHERE m.agent_id = a.id
  AND m.role = 'owner'
  AND a.created_by IS NULL;

-- Garantir membership owner para agentes que só têm created_by
INSERT INTO public.agent_memberships (user_id, agent_id, role, is_primary)
SELECT a.created_by, a.id, 'owner', FALSE
FROM public.cultural_agents a
WHERE a.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.agent_memberships m WHERE m.agent_id = a.id)
ON CONFLICT (user_id, agent_id) DO NOTHING;

-- 2. Nota sobre produção: existe um trigger `trg_auto_confirm_user` em auth.users
--    (função public.auto_confirm_new_user) que confirma o e-mail de todo cadastro.
--    Ele NÃO é criado aqui de propósito: é uma decisão de produto (cadastro sem
--    verificação de e-mail) que deve ser revista. Ver relatório de auditoria, item C7.
