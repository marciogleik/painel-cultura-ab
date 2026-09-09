-- ============================================================
-- Migration 6: Notificações, Currículo do Agente, Período das Oficinas
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

CREATE INDEX IF NOT EXISTS idx_agent_notifications_recipient ON public.agent_notifications(recipient_id, is_read, created_at DESC);

ALTER TABLE public.agent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_notifications"
  ON public.agent_notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "users_update_own_notifications"
  ON public.agent_notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "service_insert_notifications"
  ON public.agent_notifications FOR INSERT
  WITH CHECK (true);

-- 2. Coluna de status de convite na tabela de membros
ALTER TABLE public.agent_memberships
  ADD COLUMN IF NOT EXISTS invite_status text NOT NULL DEFAULT 'accepted'
    CHECK (invite_status IN ('pending', 'accepted', 'rejected'));

-- 3. Currículo do agente cultural (URL de PDF no storage)
ALTER TABLE public.cultural_agents
  ADD COLUMN IF NOT EXISTS curriculum_url text,
  ADD COLUMN IF NOT EXISTS show_curriculum boolean NOT NULL DEFAULT false;

-- 4. Períodos permitidos por oficina (array de texto: 'manha','tarde','noite')
ALTER TABLE public.cultural_workshops
  ADD COLUMN IF NOT EXISTS allowed_periods text[] NOT NULL DEFAULT ARRAY['manha','tarde'],
  ADD COLUMN IF NOT EXISTS target_audience text NOT NULL DEFAULT 'todos'
    CHECK (target_audience IN ('crianca','adolescente','adulto','todos'));

-- 5. Telefone do trabalho do responsável na matrícula
ALTER TABLE public.workshop_enrollments
  ADD COLUMN IF NOT EXISTS guardian_work_phone text;
