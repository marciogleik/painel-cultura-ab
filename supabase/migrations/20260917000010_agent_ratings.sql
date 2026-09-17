-- Tabela de avaliações dos agentes
CREATE TABLE IF NOT EXISTS public.agent_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.cultural_agents(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(agent_id, evaluator_id)
);

-- Habilitar RLS
ALTER TABLE public.agent_ratings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Qualquer um pode ver as notas"
ON public.agent_ratings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Usuários logados podem avaliar"
ON public.agent_ratings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = evaluator_id);

CREATE POLICY "Usuários logados podem atualizar sua nota"
ON public.agent_ratings
FOR UPDATE
TO authenticated
USING (auth.uid() = evaluator_id)
WITH CHECK (auth.uid() = evaluator_id);

-- Recriar a visualização para incluir as notas
DROP VIEW IF EXISTS public.public_cultural_agents;

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
  ad.city,
  ad.state,
  CASE WHEN COALESCE(p.show_address, FALSE) THEN ad.neighborhood END AS neighborhood,
  COALESCE(p.show_address, FALSE)                           AS show_address,
  COALESCE(p.show_social, TRUE)                             AS show_social,
  a.registration_status,
  a.is_public,
  a.search_vector,
  a.created_at,
  a.updated_at,
  COALESCE(stats.avg_rating, 0::numeric) AS average_rating,
  COALESCE(stats.total_ratings, 0::bigint) AS total_ratings
FROM public.cultural_agents a
LEFT JOIN public.agent_privacy p   ON p.agent_id = a.id
LEFT JOIN public.agent_addresses ad ON ad.agent_id = a.id
LEFT JOIN (
    SELECT agent_id, ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as total_ratings
    FROM public.agent_ratings
    GROUP BY agent_id
) stats ON stats.agent_id = a.id
WHERE a.is_public = TRUE
  AND a.registration_status = 'aprovado';

GRANT SELECT ON public.public_cultural_agents TO anon, authenticated;
