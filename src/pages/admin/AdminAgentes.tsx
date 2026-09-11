import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { adminGetAgentStatusCounts, adminGetAllAgents, flattenTypologyTree, getTypologyTree } from '@/services/culturalAgentService'
import type { AgentPersonType, AgentRegistrationStatus } from '@/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { AgentStatsCards } from './agentes/AgentStatsCards'
import { AgentFilters } from './agentes/AgentFilters'
import { AgentTable } from './agentes/AgentTable'
import { AgentDossierModal } from './agentes/AgentDossierModal'
import type { TypologyPaths } from './agentes/shared'

const PAGE_SIZE = 25

export function AdminAgentes() {
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AgentRegistrationStatus | ''>('')
  const [personType, setPersonType] = useState<AgentPersonType | ''>('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const counts = useQuery({ queryKey: ['admin-agent-counts'], queryFn: adminGetAgentStatusCounts })

  const list = useQuery({
    queryKey: ['admin-agents', search, status, personType, page],
    queryFn: () => adminGetAllAgents({
      search: search || undefined,
      person_type: personType || undefined,
      registration_status: status || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    staleTime: 15_000,
  })

  const typologies = useQuery({
    queryKey: ['typology-tree', 'agent'],
    queryFn: () => getTypologyTree('agent'),
    staleTime: 10 * 60_000,
  })
  const typologyPaths = useMemo<TypologyPaths>(() => {
    const out: TypologyPaths = new Map()
    if (typologies.data) for (const [id, { path }] of flattenTypologyTree(typologies.data)) out.set(id, path)
    return out
  }, [typologies.data])

  const agents = list.data?.data ?? []
  const selected = agents.find((a) => a.id === selectedId) ?? null

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ['admin-agents'] })
    qc.invalidateQueries({ queryKey: ['admin-agent-counts'] })
    qc.invalidateQueries({ queryKey: ['home-featured-agents'] })
    qc.invalidateQueries({ queryKey: ['home-stats'] })
  }

  function changeStatus(next: AgentRegistrationStatus | '') { setStatus(next); setPage(1) }
  function changePersonType(next: AgentPersonType | '') { setPersonType(next); setPage(1) }
  function changeSearch(next: string) { setSearch(next); setPage(1) }

  const hasFilters = !!(search || status || personType)

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        icon={Layers}
        eyebrow="Secretaria Municipal de Cultura · Água Boa/MT"
        title="Agentes Culturais (SMIIC)"
        description="Homologação cadastral, tipologias e dossiê dos artistas e fazedores de cultura."
        actions={
          <button type="button" onClick={refreshAll} className="btn btn-secondary text-sm" disabled={list.isFetching}>
            <RefreshCw size={14} className={list.isFetching ? 'animate-spin' : ''} /> Atualizar
          </button>
        }
      />

      {counts.error ? (
        <ErrorState error={counts.error} onRetry={() => counts.refetch()} className="mb-6" />
      ) : (
        <AgentStatsCards counts={counts.data} isLoading={counts.isLoading} active={status} onSelect={changeStatus} />
      )}

      <AgentFilters
        search={search}
        onSearch={changeSearch}
        status={status}
        onStatus={changeStatus}
        personType={personType}
        onPersonType={changePersonType}
        counts={counts.data}
      />

      {list.isLoading ? (
        <SkeletonList rows={6} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhum agente cultural encontrado"
          description={hasFilters ? 'Nenhum cadastro corresponde aos filtros atuais.' : 'Os cadastros enviados pelos agentes culturais aparecerão aqui.'}
          action={hasFilters && <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setStatus(''); setPersonType(''); setPage(1) }}>Limpar filtros</button>}
        />
      ) : (
        <>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }} aria-live="polite">
            {list.data?.count ?? 0} agente(s) · página {page} de {Math.max(list.data?.totalPages ?? 1, 1)}
          </p>
          <AgentTable agents={agents} typologyPaths={typologyPaths} onOpen={(a) => setSelectedId(a.id)} />
          {list.data && list.data.totalPages > 1 && (
            <nav className="flex justify-center items-center gap-2 mt-6" aria-label="Paginação">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary py-1.5 px-3 text-xs">Anterior</button>
              <span className="text-xs font-semibold px-2" style={{ color: 'var(--text-muted)' }}>Página {page} de {list.data.totalPages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(list.data.totalPages, p + 1))} disabled={page === list.data.totalPages} className="btn btn-secondary py-1.5 px-3 text-xs">Próxima</button>
            </nav>
          )}
        </>
      )}

      {selected && (
        <AgentDossierModal
          key={selected.id}
          agent={selected}
          typologyPaths={typologyPaths}
          isAdmin={isAdmin}
          onClose={() => setSelectedId(null)}
          onChanged={refreshAll}
        />
      )}
    </div>
  )
}
