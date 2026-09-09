import type { WizardStep1 } from './useAgentWizard'

interface Step1Props {
  data: WizardStep1
  onChange: (values: Partial<WizardStep1>) => void
  onNext: () => void
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

export function Step1TipoAgente({ data, onChange, onNext }: Step1Props) {
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
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Natureza jurídica
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {personTypes.map((t) => (
            <button
              key={t.value}
              onClick={() => onChange({ person_type: t.value })}
              className={`card p-4 text-left transition-all duration-200 ${
                data.person_type === t.value ? 'card-glow' : ''
              }`}
              style={{
                borderColor: data.person_type === t.value ? 'var(--accent)' : undefined,
                background: data.person_type === t.value
                  ? 'rgba(245,158,11,0.06)'
                  : undefined,
              }}
            >
              <div className="text-2xl mb-2">{t.emoji}</div>
              <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {t.label}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t.desc}
              </div>
              {data.person_type === t.value && (
                <div
                  className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent)' }}
                >
                  <span className="text-slate-900 text-xs">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Individual / Coletivo */}
      <div className="mb-8">
        <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Modo de atuação
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {collectiveTypes.map((t) => (
            <button
              key={t.value}
              onClick={() => onChange({ collective_type: t.value })}
              className={`card p-4 text-left transition-all duration-200 relative`}
              style={{
                borderColor: data.collective_type === t.value ? 'var(--accent)' : undefined,
                background: data.collective_type === t.value
                  ? 'rgba(245,158,11,0.06)'
                  : undefined,
              }}
            >
              <div className="text-2xl mb-2">{t.emoji}</div>
              <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {t.label}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t.desc}
              </div>
              {data.collective_type === t.value && (
                <div
                  className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent)' }}
                >
                  <span className="text-slate-900 text-xs">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!canProceed}
        className="btn btn-primary w-full"
      >
        Continuar
      </button>
    </div>
  )
}
