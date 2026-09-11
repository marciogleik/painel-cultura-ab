import { LoadingButton } from '@/components/ui/ConfirmDialog'
import type { WizardStep1 } from './useAgentWizard'

interface Step1Props {
  data: WizardStep1
  onChange: (values: Partial<WizardStep1>) => void
  onNext: () => void
  isSaving: boolean
  /** Agente já existe: trocar o tipo apaga campos específicos (CPF/CNPJ) */
  isExisting?: boolean
}

const personTypes = [
  {
    value: 'fisica' as const,
    label: 'Pessoa Física',
    desc: 'Artista, produtor, educador ou qualquer agente individual',
    emoji: '👤',
  },
  {
    value: 'juridica' as const,
    label: 'Pessoa Jurídica',
    desc: 'Empresa, associação, cooperativa ou organização cultural',
    emoji: '🏢',
  },
]

const collectiveTypes = [
  {
    value: 'individual' as const,
    label: 'Individual',
    desc: 'Representa apenas você ou uma única organização',
    emoji: '🎭',
  },
  {
    value: 'coletivo' as const,
    label: 'Coletivo / Grupo',
    desc: 'Banda, grupo de teatro, coletivo artístico, companhia etc.',
    emoji: '🎪',
  },
]

function OptionCard({
  selected,
  onSelect,
  emoji,
  label,
  desc,
  disabled,
}: {
  selected: boolean
  onSelect: () => void
  emoji: string
  label: string
  desc: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      disabled={disabled}
      className={`card p-4 text-left transition-all duration-200 relative ${selected ? 'card-glow' : ''}`}
      style={{
        borderColor: selected ? 'var(--accent)' : undefined,
        background: selected ? 'rgba(245,158,11,0.06)' : undefined,
      }}
    >
      <div className="text-2xl mb-2" aria-hidden="true">{emoji}</div>
      <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        {label}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {desc}
      </div>
      {selected && (
        <div
          aria-hidden="true"
          className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent)' }}
        >
          <span className="text-slate-900 text-xs">✓</span>
        </div>
      )}
    </button>
  )
}

export function Step1TipoAgente({ data, onChange, onNext, isSaving, isExisting }: Step1Props) {
  const canProceed = !!data.person_type && !!data.collective_type

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Que tipo de agente cultural você é?
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Essa informação define quais campos serão solicitados no cadastro.
        </p>
      </div>

      {/* Pessoa Física / Jurídica */}
      <fieldset className="mb-6 border-0 p-0 m-0">
        <legend className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Pessoa
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Pessoa">
          {personTypes.map((t) => (
            <OptionCard
              key={t.value}
              selected={data.person_type === t.value}
              onSelect={() => onChange({ person_type: t.value })}
              emoji={t.emoji}
              label={t.label}
              desc={t.desc}
              disabled={isSaving}
            />
          ))}
        </div>
        {isExisting && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Ao trocar entre pessoa física e jurídica, confira o documento (CPF ou CNPJ) na próxima etapa.
          </p>
        )}
      </fieldset>

      {/* Individual / Coletivo */}
      <fieldset className="mb-8 border-0 p-0 m-0">
        <legend className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Tipo de agente
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de agente">
          {collectiveTypes.map((t) => (
            <OptionCard
              key={t.value}
              selected={data.collective_type === t.value}
              onSelect={() => onChange({ collective_type: t.value })}
              emoji={t.emoji}
              label={t.label}
              desc={t.desc}
              disabled={isSaving}
            />
          ))}
        </div>
      </fieldset>

      <LoadingButton
        type="button"
        onClick={onNext}
        disabled={!canProceed}
        loading={isSaving}
        className="btn btn-primary w-full"
      >
        Continuar
      </LoadingButton>
    </div>
  )
}
