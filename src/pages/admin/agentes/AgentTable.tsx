import { User, MapPin, MessageSquare, Eye } from 'lucide-react'
import { formatPhone, whatsappLink } from '@/lib/utils'
import type { CulturalAgentWithRelations } from '@/types'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { STATUS_META, documentOf, personTypeLabel, protocolOf, typologyLabel, type TypologyPaths } from './shared'

interface AgentTableProps {
  agents: CulturalAgentWithRelations[]
  typologyPaths: TypologyPaths
  onOpen: (agent: CulturalAgentWithRelations) => void
}

export function AgentTable({ agents, typologyPaths, onOpen }: AgentTableProps) {
  const columns: AdminColumn<CulturalAgentWithRelations>[] = [
    {
      key: 'agent', header: 'Agente cultural',
      render: (a) => (
        <div className="flex items-center gap-3 min-w-[14rem]">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-secondary)' }} aria-hidden="true">
            {a.photo_url ? <img src={a.photo_url} alt="" className="w-full h-full object-cover" /> : <User size={18} style={{ color: 'var(--text-muted)' }} />}
          </div>
          <div className="min-w-0">
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">{protocolOf(a.id)}</span>
            <p className="text-sm font-semibold leading-tight truncate mt-0.5" style={{ color: 'var(--text-primary)' }}>{a.display_name || 'Sem nome artístico'}</p>
            {a.legal_name && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{a.legal_name}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'document', header: 'Documento',
      render: (a) => (
        <div className="space-y-0.5">
          <span className="font-mono text-xs block" style={{ color: 'var(--text-primary)' }}>{documentOf(a)}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{personTypeLabel(a)}</span>
        </div>
      ),
    },
    {
      key: 'typologies', header: 'Tipologias',
      render: (a) => {
        const list = a.typologies ?? []
        if (list.length === 0) return <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Não informada</span>
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {list.slice(0, 2).map((t) => (
              <span key={t.id} className="badge badge-amber text-[11px] truncate max-w-[14rem]" title={typologyLabel(t, typologyPaths)}>{typologyLabel(t, typologyPaths)}</span>
            ))}
            {list.length > 2 && <span className="badge badge-slate text-[10px]">+{list.length - 2}</span>}
          </div>
        )
      },
    },
    {
      key: 'location', header: 'Localização',
      render: (a) => (
        <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
          <MapPin size={13} className="text-amber-500 flex-shrink-0" aria-hidden="true" />
          {a.address?.city ? `${a.address.neighborhood ? `${a.address.neighborhood}, ` : ''}${a.address.city} - ${a.address.state ?? 'MT'}` : 'Não informada'}
        </span>
      ),
    },
    {
      key: 'contact', header: 'Contato',
      render: (a) => {
        const wa = whatsappLink(a.phone)
        return (
          <span className="inline-flex items-center gap-2 text-xs whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
            {a.phone ? formatPhone(a.phone) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" aria-label={`Chamar ${a.display_name ?? 'agente'} no WhatsApp`} onClick={(e) => e.stopPropagation()}>
                <MessageSquare size={13} />
              </a>
            )}
          </span>
        )
      },
    },
    {
      key: 'status', header: 'Status',
      render: (a) => {
        const meta = STATUS_META[a.registration_status] ?? STATUS_META.rascunho
        return <span className={`badge ${meta.badge} text-[11px] font-semibold whitespace-nowrap`}>{meta.label}</span>
      },
    },
    {
      key: 'action', header: <span className="sr-only">Ação</span>, align: 'right',
      render: (a) => {
        const pending = a.registration_status === 'enviado' || a.registration_status === 'em_analise'
        return (
          <button type="button" onClick={() => onOpen(a)} className={`btn py-1.5 px-3 text-xs whitespace-nowrap ${pending ? 'btn-primary' : 'btn-secondary'}`}>
            <Eye size={14} /> {pending ? 'Avaliar' : 'Ver ficha'}
          </button>
        )
      },
    },
  ]

  return <AdminTable columns={columns} rows={agents} caption="Agentes culturais cadastrados" onRowClick={onOpen} />
}
