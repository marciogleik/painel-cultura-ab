import { useId } from 'react'
import { SearchInput } from '@/components/ui/SearchInput'
import type { AgentPersonType, AgentRegistrationStatus } from '@/types'
import { ALL_STATUSES, STATUS_META } from './shared'

interface AgentFiltersProps {
  search: string
  onSearch: (value: string) => void
  status: AgentRegistrationStatus | ''
  onStatus: (value: AgentRegistrationStatus | '') => void
  personType: AgentPersonType | ''
  onPersonType: (value: AgentPersonType | '') => void
  counts?: Record<AgentRegistrationStatus, number>
}

const STATUS_VALUES = new Set<string>(ALL_STATUSES)
const PERSON_VALUES = new Set<string>(['fisica', 'juridica'])

export function AgentFilters({ search, onSearch, status, onStatus, personType, onPersonType, counts }: AgentFiltersProps) {
  const statusId = useId()
  const personId = useId()
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-4">
      <SearchInput
        value={search}
        onChange={onSearch}
        label="Buscar agentes"
        placeholder="Nome artístico, razão social ou CPF/CNPJ (5+ dígitos)"
        className="flex-1"
      />
      <div className="flex gap-2">
        <div>
          <label htmlFor={statusId} className="sr-only">Filtrar por status</label>
          <select
            id={statusId}
            className="input text-sm"
            value={status}
            onChange={(e) => onStatus(STATUS_VALUES.has(e.target.value) ? (e.target.value as AgentRegistrationStatus) : '')}
          >
            <option value="">Status: todos</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}{counts ? ` (${counts[s] ?? 0})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={personId} className="sr-only">Filtrar por natureza</label>
          <select
            id={personId}
            className="input text-sm"
            value={personType}
            onChange={(e) => onPersonType(PERSON_VALUES.has(e.target.value) ? (e.target.value as AgentPersonType) : '')}
          >
            <option value="">Natureza: todas</option>
            <option value="fisica">Pessoa física</option>
            <option value="juridica">Pessoa jurídica</option>
          </select>
        </div>
      </div>
    </div>
  )
}
