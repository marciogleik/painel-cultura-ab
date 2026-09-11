import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getMyAgents } from '@/services/culturalAgentService'

/** Agentes culturais do usuário logado (membership aceita), o principal primeiro. */
export function useMyAgents() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['my-agents', user?.id],
    queryFn: () => getMyAgents(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  })
  const agents = query.data ?? []
  return {
    ...query,
    agents,
    primaryAgent: agents.find((a) => a.is_primary) ?? agents[0] ?? null,
    approvedAgents: agents.filter((a) => a.registration_status === 'aprovado'),
  }
}
