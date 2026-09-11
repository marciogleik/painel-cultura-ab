import type { ReactNode } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AdminColumn<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  /** Classe extra da célula (ex.: 'w-24', 'text-right') */
  className?: string
  align?: 'left' | 'right' | 'center'
}

interface AdminTableProps<T> {
  columns: AdminColumn<T>[]
  rows: T[]
  rowKey?: (row: T) => string
  /** Descrição da tabela para leitores de tela */
  caption?: string
  onRowClick?: (row: T) => void
  className?: string
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' }

/** Tabela administrativa responsiva: rola horizontalmente em telas estreitas. */
export function AdminTable<T extends { id: string }>({ columns, rows, rowKey, caption, onRowClick, className = '' }: AdminTableProps<T>) {
  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead style={{ background: 'var(--bg-secondary)' }}>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap', ALIGN[c.align ?? 'left'], c.className)}
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey ? rowKey(row) : row.id}
                className={cn('border-t transition-colors', onRowClick && 'cursor-pointer hover:bg-amber-500/5')}
                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 align-middle', ALIGN[c.align ?? 'left'], c.className)} style={{ color: 'var(--text-secondary)' }}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Botão só com ícone, sempre com rótulo acessível. */
export function IconButton({
  label, onClick, children, tone = 'neutral', disabled, className = '',
}: {
  label: string
  onClick: () => void
  children: ReactNode
  tone?: 'neutral' | 'primary' | 'danger' | 'success'
  disabled?: boolean
  className?: string
}) {
  const tones = {
    neutral: 'hover:bg-slate-500/10',
    primary: 'text-amber-600 hover:bg-amber-500/10',
    danger: 'text-red-500 hover:bg-red-500/10',
    success: 'text-emerald-600 hover:bg-emerald-500/10',
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn('p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed', tones[tone], className)}
      style={tone === 'neutral' ? { color: 'var(--text-secondary)' } : undefined}
    >
      {children}
    </button>
  )
}

/** Par Editar/Excluir usado na última coluna das listagens. */
export function RowActions({ onEdit, onDelete, canWrite = true, editLabel = 'Editar', deleteLabel = 'Excluir', children }: {
  onEdit?: () => void
  onDelete?: () => void
  canWrite?: boolean
  editLabel?: string
  deleteLabel?: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {children}
      {onEdit && (
        <IconButton label={canWrite ? editLabel : 'Ver detalhes'} onClick={onEdit} tone="primary">
          <Pencil size={14} />
        </IconButton>
      )}
      {onDelete && canWrite && (
        <IconButton label={deleteLabel} onClick={onDelete} tone="danger">
          <Trash2 size={14} />
        </IconButton>
      )}
    </div>
  )
}

/** Sim/Não com cor. */
export function BoolBadge({ value, yes = 'Sim', no = 'Não' }: { value: boolean | null | undefined; yes?: string; no?: string }) {
  return <span className={cn('badge text-xs', value ? 'badge-green' : 'badge-slate')}>{value ? yes : no}</span>
}
