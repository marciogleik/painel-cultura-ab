import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronRight, List, ListTree, Plus, RefreshCw, X } from 'lucide-react'
import { getTypologyTree, flattenTypologyTree } from '@/services/culturalAgentService'
import { OFFICIAL_SMIIC_TYPOLOGIES } from '@/data/smiicTypologies'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { Field } from './Field'
import type { CulturalTypology } from '@/types'
import type { WizardStep3 } from './useAgentWizard'

interface Step3Props {
  data: WizardStep3
  onChange: (values: Partial<WizardStep3>) => void
  /** Recebe a lista final de tipologias (já limpa) para o pai salvar sem closure velha */
  onNext: (typologyIds: string[]) => void
  onBack: () => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
  isSaving: boolean
}

type Mode = 'lists' | 'tree'

const activeChildren = (node: CulturalTypology | undefined | null) =>
  (node?.children ?? []).filter((c) => c.is_active !== false)

export function Step3Tipologia({ data, onChange, onNext, onBack, errors, setErrors, isSaving }: Step3Props) {
  const {
    data: tree = OFFICIAL_SMIIC_TYPOLOGIES,
    isPending,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['typology-tree', 'agent'],
    queryFn: () => getTypologyTree('agent'),
    // A lista oficial embutida aparece na hora; o banco atualiza em segundo plano.
    placeholderData: OFFICIAL_SMIIC_TYPOLOGIES,
    staleTime: 10 * 60_000,
  })

  const roots = useMemo(() => tree.filter((r) => r.is_active !== false), [tree])
  const flat = useMemo(() => flattenTypologyTree(roots), [roots])

  const [mode, setMode] = useState<Mode>('lists')

  // Tipologia 1 › 2 › 3 (modo listas) — os rascunhos vivem no estado do wizard
  const level1 = roots.find((r) => r.id === data.draftTip1)
  const level2Options = activeChildren(level1)
  const level2 = level2Options.find((c) => c.id === data.draftTip2)
  const level3Options = activeChildren(level2)
  const level3 = level3Options.find((c) => c.id === data.draftTip3)

  /** Só nós de nível ≥ 2 contam como tipologia escolhida (a macroárea sozinha não classifica). */
  const selectedIds = data.typology_ids.filter((id) => (flat.get(id)?.node.level ?? 1) >= 2)
  const selected = new Set(selectedIds)

  const setIds = (ids: string[], extra: Partial<WizardStep3> = {}) => {
    onChange({ typology_ids: ids, ...extra })
  }

  const addId = (id: string) => {
    if (selected.has(id)) return
    setIds([...selectedIds, id])
  }

  const removeId = (id: string) => {
    setIds(selectedIds.filter((x) => x !== id))
  }

  const toggleId = (id: string) => (selected.has(id) ? removeId(id) : addId(id))

  const pendingLeaf = level3 ?? level2 ?? null
  const canAdd = !!pendingLeaf && !selected.has(pendingLeaf.id)

  const handleAddFromLists = () => {
    if (!pendingLeaf) return
    setIds(selected.has(pendingLeaf.id) ? selectedIds : [...selectedIds, pendingLeaf.id], {
      draftTip1: '',
      draftTip2: '',
      draftTip3: '',
    })
  }

  const handleNext = () => {
    // Macroárea sem subnível selecionada nas listas e nada adicionado ainda
    if (selectedIds.length === 0 && data.draftTip1 && !pendingLeaf) {
      setErrors({ typology: 'Escolha também a Tipologia 2 (e a 3, quando houver) — a macroárea sozinha não classifica o agente.' })
      return
    }
    // Havia uma escolha completa nas listas que o usuário esqueceu de adicionar: adiciona por ele.
    const finalIds = pendingLeaf && !selected.has(pendingLeaf.id) ? [...selectedIds, pendingLeaf.id] : selectedIds
    setIds(finalIds, { draftTip1: '', draftTip2: '', draftTip3: '' })
    setErrors({})
    onNext(finalIds)
  }

  const pathLabel = (id: string) => flat.get(id)?.path.join(' › ') ?? id

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Tipologia cultural
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Classifique sua atuação em até três níveis, conforme o padrão oficial do SMIIC
          (ex.: Demais Agentes Culturais › Músico › Compositor). Você pode adicionar mais de uma tipologia.
        </p>
      </div>

      {/* Estado da lista oficial */}
      {isPending && (
        <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }} aria-live="polite">
          <RefreshCw size={12} className="animate-spin" aria-hidden="true" />
          Carregando a lista oficial de tipologias…
        </p>
      )}
      {isError && (
        <div
          role="alert"
          className="mb-3 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--text-secondary)' }}
        >
          <span>Não foi possível atualizar a lista do servidor. Usando a lista oficial embutida.</span>
          <button type="button" className="btn btn-secondary text-xs py-1 px-2" onClick={() => refetch()} disabled={isFetching}>
            Tentar de novo
          </button>
        </div>
      )}

      {/* Alternador de modo */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-secondary)' }} role="tablist" aria-label="Modo de seleção">
        {([
          { value: 'lists', label: 'Listas', icon: List },
          { value: 'tree', label: 'Árvore completa', icon: ListTree },
        ] as { value: Mode; label: string; icon: typeof List }[]).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
            style={{
              background: mode === value ? 'var(--bg-card)' : 'transparent',
              color: mode === value ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: mode === value ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            <Icon size={13} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {mode === 'lists' ? (
        <div className="card p-5 sm:p-6 mb-5 space-y-4">
          <Field label="Tipologia 1 (macroárea)" required>
            <select
              className="input font-medium text-sm py-2.5 cursor-pointer"
              value={data.draftTip1}
              onChange={(e) => onChange({ draftTip1: e.target.value, draftTip2: '', draftTip3: '' })}
            >
              <option value="">Selecione…</option>
              {roots.map((root) => (
                <option key={root.id} value={root.id}>{root.name}</option>
              ))}
            </select>
          </Field>

          <Field
            label="Tipologia 2"
            required
            hint={!data.draftTip1 ? 'Escolha primeiro a Tipologia 1.' : level2Options.length === 0 ? 'Esta macroárea não possui subníveis.' : undefined}
          >
            <select
              className="input font-medium text-sm py-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              value={data.draftTip2}
              disabled={!data.draftTip1 || level2Options.length === 0}
              onChange={(e) => onChange({ draftTip2: e.target.value, draftTip3: '' })}
            >
              <option value="">Selecione…</option>
              {level2Options.map((child) => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </Field>

          {level3Options.length > 0 && (
            <Field label="Tipologia 3" hint="Detalhe a atuação, se quiser. Se não escolher, vale a Tipologia 2.">
              <select
                className="input font-medium text-sm py-2.5 cursor-pointer"
                value={data.draftTip3}
                onChange={(e) => onChange({ draftTip3: e.target.value })}
              >
                <option value="">Selecione…</option>
                {level3Options.map((child) => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            </Field>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }} aria-live="polite">
              {pendingLeaf
                ? <>Pronto para adicionar: <strong style={{ color: 'var(--text-primary)' }}>{pathLabel(pendingLeaf.id)}</strong></>
                : data.draftTip1
                ? 'Agora escolha a Tipologia 2.'
                : 'Escolha a macroárea para começar.'}
            </p>
            <button
              type="button"
              onClick={handleAddFromLists}
              disabled={!canAdd}
              className="btn btn-primary text-xs py-1.5 px-3"
            >
              <Plus size={14} aria-hidden="true" />
              Adicionar tipologia
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-3 sm:p-4 mb-5 max-h-[26rem] overflow-y-auto">
          <p className="text-xs mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
            Abra as macroáreas e marque uma ou mais tipologias. Só os subníveis podem ser marcados.
          </p>
          <ul className="list-none p-0 m-0 space-y-0.5" role="tree" aria-label="Árvore de tipologias">
            {roots.map((root) => (
              <TreeNode key={root.id} node={root} depth={0} selected={selected} onToggle={toggleId} />
            ))}
          </ul>
        </div>
      )}

      {/* Tipologias escolhidas */}
      <div className="mb-5">
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
          Tipologias escolhidas {selectedIds.length > 0 && `(${selectedIds.length})`}
        </p>
        {selectedIds.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhuma tipologia adicionada ainda.</p>
        ) : (
          <ul className="list-none p-0 m-0 flex flex-wrap gap-2" aria-label="Tipologias escolhidas">
            {selectedIds.map((id) => (
              <li
                key={id}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--text-primary)' }}
              >
                <Check size={12} style={{ color: 'var(--accent)' }} aria-hidden="true" />
                <span>{pathLabel(id)}</span>
                <button
                  type="button"
                  onClick={() => removeId(id)}
                  className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"
                  aria-label={`Remover ${pathLabel(id)}`}
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {errors.typology && (
          <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--error)' }}>{errors.typology}</p>
        )}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} disabled={isSaving} className="btn btn-secondary flex-1">
          Voltar
        </button>
        <LoadingButton type="button" onClick={handleNext} loading={isSaving} className="btn btn-primary flex-2">
          {selectedIds.length === 0 && !pendingLeaf ? 'Pular por enquanto' : 'Continuar'}
        </LoadingButton>
      </div>
    </div>
  )
}

function TreeNode({
  node,
  depth,
  selected,
  onToggle,
}: {
  node: CulturalTypology
  depth: number
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  const children = activeChildren(node)
  const hasChildren = children.length > 0
  const [open, setOpen] = useState(false)
  const selectable = node.level >= 2
  const isSelected = selected.has(node.id)

  return (
    <li role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected={selectable ? isSelected : undefined}>
      <div
        className="flex items-center gap-1 rounded-lg px-1 py-0.5"
        style={{ paddingLeft: `${depth * 16 + 4}px`, background: isSelected ? 'rgba(245,158,11,0.08)' : undefined }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0"
            aria-label={`${open ? 'Recolher' : 'Expandir'} ${node.name}`}
            aria-expanded={open}
          >
            {open ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
          </button>
        ) : (
          <span className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
        )}

        {selectable ? (
          <label className="flex items-center gap-2 text-sm py-1 cursor-pointer flex-1 min-w-0" style={{ color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-amber-500 flex-shrink-0"
              checked={isSelected}
              onChange={() => onToggle(node.id)}
            />
            <span className="truncate">{node.name}</span>
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-sm font-semibold py-1 text-left flex-1 min-w-0 truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            {node.name}
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="list-none p-0 m-0" role="group">
          {children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} selected={selected} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  )
}
