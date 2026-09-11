-- ============================================================
-- Migration 6: Notificações, Currículo do Agente, Período das Oficinas
-- Idempotente: pode ser aplicada em bancos que já tenham parte disso.
-- ============================================================

-- 1. Tabela de notificações in-app
CREATE TABLE IF NOT EXISTS public.agent_notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          text NOT NULL, -- 'membership_invite' | 'membership_accepted' | 'membership_rejected' | 'status_change' | 'general'
  title         text NOT NULL,
  body          text,
  is_read       boolean NOT NULL DEFAULT false,
  meta          jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_notifications_recipient
  ON public.agent_notifications(recipient_id, is_read, created_at DESC);

ALTER TABLE public.agent_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_see_own_notifications"    ON public.agent_notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.agent_notifications;
DROP POLICY IF EXISTS "users_delete_own_notifications" ON public.agent_notifications;
DROP POLICY IF EXISTS "service_insert_notifications"   ON public.agent_notifications;

CREATE POLICY "users_see_own_notifications"
  ON public.agent_notifications FOR SELECT
  USING ((select auth.uid()) = recipient_id);

CREATE POLICY "users_update_own_notifications"
  ON public.agent_notifications FOR UPDATE
  USING ((select auth.uid()) = recipient_id)
  WITH CHECK ((select auth.uid()) = recipient_id);

CREATE POLICY "users_delete_own_notifications"
  ON public.agent_notifications FOR DELETE
  USING ((select auth.uid()) = recipient_id);

-- Inserção só por funções SECURITY DEFINER (review_agent, invite_agent_member, ...)
-- ou por administradores. Nunca por um usuário comum diretamente.
CREATE POLICY "admin_insert_notifications"
  ON public.agent_notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- 2. Coluna de status de convite na tabela de membros
ALTER TABLE public.agent_memberships
  ADD COLUMN IF NOT EXISTS invite_status text NOT NULL DEFAULT 'accepted'
    CHECK (invite_status IN ('pending', 'accepted', 'rejected'));

-- 3. Currículo do agente cultural (caminho no bucket agent-files)
ALTER TABLE public.cultural_agents
  ADD COLUMN IF NOT EXISTS curriculum_url text,
  ADD COLUMN IF NOT EXISTS show_curriculum boolean NOT NULL DEFAULT false;

-- 4. Períodos permitidos por oficina e público-alvo
ALTER TABLE public.cultural_workshops
  ADD COLUMN IF NOT EXISTS allowed_periods text[] NOT NULL DEFAULT ARRAY['manha','tarde'],
  ADD COLUMN IF NOT EXISTS target_audience text NOT NULL DEFAULT 'todos'
    CHECK (target_audience IN ('crianca','adolescente','adulto','todos'));

-- 5. Telefone do trabalho do responsável na matrícula
ALTER TABLE public.workshop_enrollments
  ADD COLUMN IF NOT EXISTS guardian_work_phone text;
