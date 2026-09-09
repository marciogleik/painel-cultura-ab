import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, Check, Plus, X, ListTree, SlidersHorizontal } from 'lucide-react'
import { useState, useMemo } from 'react'
import { getTypologyTree } from '@/services/culturalAgentService'
import type { CulturalTypology } from '@/types'
import type { WizardStep3 } from './useAgentWizard'

interface Step3Props {
  data: WizardStep3
  onChange: (values: Partial<WizardStep3>) => void
  onNext: () => void
  onBack: () => void
}

function TypologyNode({
  node,
  selectedIds,
  onToggle,
  depth,
}: {
  node: CulturalTypology
  selectedIds: Set<string>
  onToggle: (id: string) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(depth < 1)
  const hasChildren = (node.children?.length ?? 0) > 0
  const isSelected = selectedIds.has(node.id)

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-150 ${
          isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800/40'
        }`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
            className="flex-shrink-0 p-0.5 rounded"
            style={{ color: 'var(--text-muted)' }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${
            isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-400'
          }`}
        >
          {isSelected && <Check size={10} strokeWidth={3} className="text-slate-900" />}
        </button>

        {/* Label */}
        <span
          onClick={() => onToggle(node.id)}
          className="text-sm flex-1"
          style={{
            color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
            fontWeight: depth === 0 ? 600 : depth === 1 ? 500 : 400,
          }}
        >
          {node.name}
        </span>

        {/* Level badge */}
        {depth === 0 && (
          <span className="badge badge-amber text-xs hidden sm:inline-flex">
            Área
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TypologyNode
              key={child.id}
              node={child}
              selectedIds={selectedIds}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Step3Tipologia({ data, onChange, onNext, onBack }: Step3Props) {
  const { data: tree, isLoading } = useQuery({
    queryKey: ['typology-tree-agent'],
    queryFn: () => getTypologyTree('agent'),
    staleTime: 1000 * 60 * 10,
  })

  const [mode, setMode] = useState<'dropdown' | 'tree'>('dropdown')
  const [selectedTip1, setSelectedTip1] = useState<string>('')
  const [selectedTip2, setSelectedTip2] = useState<string>('')

  const selectedIds = useMemo(() => new Set(data.typology_ids), [data.typology_ids])

  // Lookup map: id -> { typology, parentName }
  const typologyMap = useMemo(() => {
    const map = new Map<string, { item: CulturalTypology; parentName?: string }>()
    tree?.forEach((root) => {
      map.set(root.id, { item: root })
      root.children?.forEach((child) => {
        map.set(child.id, { item: child, parentName: root.name })
      })
    })
    return map
  }, [tree])

  // Subcategorias disponíveis para a Tipologia 1 selecionada
  const tipologia2Options = useMemo(() => {
    if (!selectedTip1 || !tree) return []
    const root = tree.find((r) => r.id === selectedTip1)
    return root?.children ?? []
  }, [selectedTip1, tree])

  const toggleId = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange({ typology_ids: Array.from(next) })
  }

  const handleAddFromDropdown = () => {
    if (!selectedTip2) return
    if (!selectedIds.has(selectedTip2)) {
      const next = new Set(selectedIds)
      next.add(selectedTip2)
      // Se a Tipologia 1 raiz também for relevante, podemos adicioná-la ou manter a Tipologia 2
      onChange({ typology_ids: Array.from(next) })
    }
    setSelectedTip2('')
  }

  const handleRemove = (id: string) => {
    const next = new Set(selectedIds)
    next.delete(id)
    onChange({ typology_ids: Array.from(next) })
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Tipologia cultural
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Selecione a Tipologia 1 (Macroárea) e a Tipologia 2 (Atuação específica) conforme o padrão oficial do SMIIC.
        </p>
      </div>

      {/* Seletor de Modo (Dropdowns SMIIC vs Árvore Completa) */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Modo de seleção
        </span>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setMode('dropdown')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
              mode === 'dropdown'
                ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal size={13} />
            Seleção Rápida (SMIIC)
          </button>
          <button
            type="button"
            onClick={() => setMode('tree')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
              mode === 'tree'
                ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ListTree size={13} />
            Árvore Completa
          </button>
        </div>
      </div>

      {/* MODO 1: DROPDOWNS OFICIAIS SMIIC */}
      {mode === 'dropdown' && (
        <div className="card p-5 mb-5 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {/* Tipologia 1 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Tipologia 1:
            </label>
            <select
              value={selectedTip1}
              onChange={(e) => {
                setSelectedTip1(e.target.value)
                setSelectedTip2('')
              }}
              className="input w-full font-medium"
            >
              <option value="">✓ Selecione a Tipologia 1...</option>
              {tree?.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.name} ({root.children?.length ?? 0})
                </option>
              ))}
            </select>
          </div>

          {/* Tipologia 2 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Tipologia 2:
            </label>
            <div className="flex gap-2">
              <select
                value={selectedTip2}
                onChange={(e) => setSelectedTip2(e.target.value)}
                disabled={!selectedTip1 || tipologia2Options.length === 0}
                className="input flex-1 font-medium disabled:opacity-50"
              >
                <option value="">
                  {!selectedTip1
                    ? 'Selecione primeiro a Tipologia 1 acima'
                    : '✓ Selecione a Tipologia 2...'}
                </option>
                {tipologia2Options.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddFromDropdown}
                disabled={!selectedTip2}
                className="btn btn-primary flex-shrink-0 flex items-center gap-1.5 px-4"
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>
            {selectedTip1 && tipologia2Options.length > 0 && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                {tipologia2Options.length} categorias disponíveis para esta área.
              </p>
            )}
          </div>
        </div>
      )}

      {/* MODO 2: ÁRVORE HIERÁRQUICA COMPLETA */}
      {mode === 'tree' && (
        <div className="card p-2 mb-5 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-8 rounded" />
              ))}
            </div>
          ) : (
            tree?.map((root) => (
              <TypologyNode
                key={root.id}
                node={root}
                selectedIds={selectedIds}
                onToggle={toggleId}
                depth={0}
              />
            ))
          )}
        </div>
      )}

      {/* LISTA DE TIPOLOGIAS SELECIONADAS */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Tipologias Selecionadas ({selectedIds.size})
          </span>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => onChange({ typology_ids: [] })}
              className="text-xs text-red-500 hover:underline"
            >
              Limpar todas
            </button>
          )}
        </div>

        {selectedIds.size === 0 ? (
          <div className="p-4 rounded-xl border border-dashed text-center text-xs" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
            Nenhuma tipologia adicionada ainda. Escolha no seletor acima para adicionar.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedIds).map((id) => {
              const info = typologyMap.get(id)
              return (
                <div
                  key={id}
                  className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border text-xs font-semibold animate-scale-in"
                  style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div className="flex flex-col">
                    <span>{info?.item.name ?? id}</span>
                    {info?.parentName && (
                      <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>
                        {info.parentName}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(id)}
                    className="p-1 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remover tipologia"
                  >
                    <X size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn btn-secondary flex-1">
          Voltar
        </button>
        <button type="button" onClick={onNext} className="btn btn-primary flex-2">
          {selectedIds.size === 0 ? 'Pular por enquanto' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
