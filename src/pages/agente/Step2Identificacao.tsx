import type { WizardStep1, WizardStep2 } from './useAgentWizard'

interface Step2Props {
  data: WizardStep2
  step1: WizardStep1
  onChange: (values: Partial<WizardStep2>) => void
  onNext: () => void
  onBack: () => void
  errors: Record<string, string>
}

const genderOptions = [
  { value: '', label: 'Prefiro não informar' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'nao_binario', label: 'Não-binário' },
  { value: 'outro', label: 'Outro' },
]

// Padrão IBGE
const raceOptions = [
  { value: '', label: 'Prefiro não informar' },
  { value: 'branca', label: 'Branca' },
  { value: 'preta', label: 'Preta' },
  { value: 'parda', label: 'Parda' },
  { value: 'amarela', label: 'Amarela' },
  { value: 'indigena', label: 'Indígena' },
]

function Field({
  label,
  hint,
  error,
  children,
  optional,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
  optional?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
        {optional && (
          <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>(opcional)</span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--error)' }}>{error}</p>
      )}
    </div>
  )
}

export function Step2Identificacao({ data, step1, onChange, onNext, onBack, errors }: Step2Props) {
  const isPJ = step1.person_type === 'juridica'

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!data.display_name.trim()) errs.display_name = 'Nome artístico/público é obrigatório'
    if (isPJ && !data.legal_name.trim()) errs.legal_name = 'Razão social é obrigatória para PJ'
    return errs
  }

  const handleNext = () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) return
    onNext()
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Identificação
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Preencha os dados que vão aparecer no seu perfil público.
        </p>
      </div>

      <div className="space-y-5">
        {/* Nome público */}
        <Field
          label={isPJ ? 'Nome fantasia / Nome público' : 'Nome artístico / Nome público'}
          error={errors.display_name}
          hint="Este é o nome que aparecerá no mapa cultural e no seu perfil público"
        >
          <input
            className={`input ${errors.display_name ? 'input-error' : ''}`}
            placeholder={isPJ ? 'Ex.: Teatro Municipal do Centro' : 'Ex.: Maria Silva'}
            value={data.display_name}
            onChange={(e) => onChange({ display_name: e.target.value })}
          />
        </Field>

        {/* Razão social (apenas PJ) */}
        {isPJ && (
          <Field
            label="Razão social"
            error={errors.legal_name}
            hint="Nome oficial registrado no CNPJ"
          >
            <input
              className={`input ${errors.legal_name ? 'input-error' : ''}`}
              placeholder="Ex.: Associação Cultural do Centro Ltda."
              value={data.legal_name}
              onChange={(e) => onChange({ legal_name: e.target.value })}
            />
          </Field>
        )}

        {/* Documento */}
        {isPJ ? (
          <Field label="CNPJ" optional hint="Apenas números — não será exibido publicamente">
            <input
              className="input"
              placeholder="00.000.000/0000-00"
              value={data.cnpj}
              onChange={(e) => onChange({ cnpj: e.target.value })}
            />
          </Field>
        ) : (
          <Field label="CPF" optional hint="Apenas números — não será exibido publicamente">
            <input
              className="input"
              placeholder="000.000.000-00"
              value={data.cpf}
              onChange={(e) => onChange({ cpf: e.target.value })}
            />
          </Field>
        )}

        {/* Telefone */}
        <Field label="Telefone" optional>
          <div className="flex gap-3">
            <input
              className="input"
              placeholder="(65) 99999-9999"
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={data.show_contact}
                onChange={(e) => onChange({ show_contact: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500"
              />
              Exibir no perfil
            </label>
          </div>
        </Field>

        {/* Dados pessoais — apenas PF */}
        {!isPJ && (
          <>
            <Field label="Data de nascimento" optional hint="Não será exibida publicamente">
              <input
                type="date"
                className="input"
                value={data.birth_date}
                onChange={(e) => onChange({ birth_date: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Gênero" optional>
                <select
                  className="input"
                  value={data.gender}
                  onChange={(e) => onChange({ gender: e.target.value })}
                >
                  {genderOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field
                label="Cor/Raça (IBGE)"
                optional
                hint="Dados para mapeamento cultural e políticas públicas. Nunca exibido publicamente."
              >
                <select
                  className="input"
                  value={data.race}
                  onChange={(e) => onChange({ race: e.target.value })}
                >
                  {raceOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </>
        )}

        {/* Apresentação */}
        <Field
          label="Apresentação / Biografia"
          optional
          hint={`${data.biography.length} caracteres — mínimo 50 para completar o perfil`}
        >
          <textarea
            className="input resize-none"
            rows={5}
            placeholder="Fale sobre você, sua trajetória, projetos e área de atuação cultural..."
            value={data.biography}
            onChange={(e) => onChange({ biography: e.target.value })}
          />
        </Field>
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="btn btn-secondary flex-1">
          Voltar
        </button>
        <button onClick={handleNext} className="btn btn-primary flex-2">
          Continuar
        </button>
      </div>
    </div>
  )
}
