import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Check } from 'lucide-react'
import type { Category } from '@/types'
import type { WizardStep4 } from './useAgentWizard'

interface Step4Props {
  data: WizardStep4
  onChange: (values: Partial<WizardStep4>) => void
  onNext: () => void
  onBack: () => void
}

export function Step4Areas({ data, onChange, onNext, onBack }: Step4Props) {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as Category[]
    },
    staleTime: 1000 * 60 * 10,
  })

  const selectedIds = new Set(data.category_ids)

  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange({ category_ids: Array.from(next) })
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Áreas de atuação
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Selecione as áreas culturais com que você trabalha ou tem interesse. Ajuda na visibilidade do seu perfil.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[...Array(9)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {categories?.map((cat) => {
            const isSelected = selectedIds.has(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => toggle(cat.id)}
                className="card p-3 text-left transition-all duration-200 relative"
                style={{
                  borderColor: isSelected ? 'var(--accent)' : undefined,
                  background: isSelected ? 'rgba(245,158,11,0.06)' : undefined,
                }}
              >
                {cat.icon && <span className="text-2xl mb-1 block">{cat.icon}</span>}
                <span
                  className="text-xs font-medium block"
                  style={{ color: isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  {cat.name}
                </span>
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent)' }}
                  >
                    <Check size={10} strokeWidth={3} className="text-slate-900" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {selectedIds.size > 0 && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          {selectedIds.size} {selectedIds.size === 1 ? 'área selecionada' : 'áreas selecionadas'}
        </p>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-secondary flex-1">Voltar</button>
        <button onClick={onNext} className="btn btn-primary flex-2">
          {selectedIds.size === 0 ? 'Pular por enquanto' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
