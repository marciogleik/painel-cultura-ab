import { Info } from 'lucide-react'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { formatCPF, formatCNPJ, formatPhone, onlyDigits, todayISO } from '@/lib/utils'
import { Field } from './Field'
import { validateStep2, GENDER_OPTIONS, RACE_OPTIONS } from './step2Validation'
import type { AgentPersonType } from '@/types'
import type { WizardStep1, WizardStep2 } from './useAgentWizard'

interface Step2Props {
  data: WizardStep2
  step1: WizardStep1
  /** E-mail da conta (somente leitura) */
  email: string | null | undefined
  onChange: (values: Partial<WizardStep2>) => void
  /** Grupos podem trocar o documento (CPF do responsável ou CNPJ) sem voltar à etapa 1 */
  onPersonTypeChange: (personType: AgentPersonType) => void
  onNext: () => void
  onBack: () => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
  isSaving: boolean
}

export function Step2Identificacao({
  data, step1, email, onChange, onPersonTypeChange, onNext, onBack, errors, setErrors, isSaving,
}: Step2Props) {
  const isCollective = step1.collective_type === 'coletivo'
  const isPJ = step1.person_type === 'juridica'

  const handleNext = () => {
    const errs = validateStep2(data, isPJ, isCollective)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      const first = Object.keys(errs)[0]
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    onNext()
  }

  const docToggleStyle = (active: boolean) => ({
    background: active ? 'var(--accent)' : 'transparent',
    borderColor: active ? 'var(--accent)' : 'var(--border)',
    color: active ? '#0f172a' : 'var(--text-secondary)',
  })

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {isCollective ? 'Identificação da Companhia / Grupo' : 'Identificação'}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {isCollective
            ? 'Dados cadastrais da companhia, grupo ou coletivo cultural. Os campos com * são obrigatórios.'
            : 'Dados de quem está se cadastrando. Os campos marcados com * são obrigatórios para enviar o cadastro.'}
        </p>
      </div>

      <div className="space-y-5">
        {/* Seletor de CPF vs CNPJ para companhias e grupos */}
        {isCollective && (
          <fieldset
            className="p-4 rounded-xl mb-2 border-0"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <legend className="text-xs font-semibold px-1" style={{ color: 'var(--accent)' }}>
              DOCUMENTO DE IDENTIFICAÇÃO DO GRUPO
            </legend>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Companhias de teatro, dança, bandas ou coletivos podem ser cadastrados com o <strong>CPF do responsável</strong> ou com o <strong>CNPJ da entidade / MEI</strong>.
            </p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Documento de identificação do grupo">
              <button
                type="button"
                role="radio"
                aria-checked={!isPJ}
                onClick={() => onPersonTypeChange('fisica')}
                disabled={isSaving}
                className="py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
                style={docToggleStyle(!isPJ)}
              >
                <span aria-hidden="true">👤 </span>CPF do Responsável
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isPJ}
                onClick={() => onPersonTypeChange('juridica')}
                disabled={isSaving}
                className="py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
                style={docToggleStyle(isPJ)}
              >
                <span aria-hidden="true">🏢 </span>CNPJ da Entidade / MEI
              </button>
            </div>
          </fieldset>
        )}

        {/* Nome de exibição */}
        <Field
          label={isCollective ? 'Nome da Companhia / Grupo' : 'Nome de exibição'}
          required
          error={errors.display_name}
          hint={
            isCollective
              ? 'Nome artístico ou público do grupo (ex.: Cia de Dança Ritmos, Grupo Teatral Água Boa).'
              : 'É o nome que aparecerá no Mapa Cultural e no seu perfil público (nome artístico, nome fantasia, nome do grupo).'
          }
        >
          <input
            name="display_name"
            className={`input ${errors.display_name ? 'input-error' : ''}`}
            placeholder={
              isCollective
                ? 'Ex.: Cia de Teatro Arte Viva'
                : isPJ
                ? 'Ex.: Associação Cultural do Centro'
                : 'Ex.: Maria Silva'
            }
            value={data.display_name}
            maxLength={120}
            autoComplete="nickname"
            onChange={(e) => onChange({ display_name: e.target.value })}
          />
        </Field>

        {isPJ ? (
          <>
            <Field
              label={isCollective ? 'Razão social / Nome da Entidade' : 'Razão social'}
              required
              error={errors.legal_name}
              hint="Nome oficial registrado no CNPJ."
            >
              <input
                name="legal_name"
                className={`input ${errors.legal_name ? 'input-error' : ''}`}
                placeholder="Ex.: Associação Cultural do Centro"
                value={data.legal_name}
                maxLength={200}
                autoComplete="organization"
                onChange={(e) => onChange({ legal_name: e.target.value })}
              />
            </Field>

            <Field label="CNPJ" required error={errors.cnpj} hint="Não será exibido publicamente.">
              <input
                name="cnpj"
                className={`input ${errors.cnpj ? 'input-error' : ''}`}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                autoComplete="off"
                value={formatCNPJ(data.cnpj)}
                onChange={(e) => onChange({ cnpj: onlyDigits(e.target.value).slice(0, 14) })}
              />
            </Field>
          </>
        ) : (
          <>
            <Field
              label={isCollective ? 'Nome do responsável pelo grupo' : 'Nome completo'}
              required
              error={errors.full_name}
              hint="Nome civil do responsável, como no documento. Não será exibido publicamente."
            >
              <input
                name="full_name"
                className={`input ${errors.full_name ? 'input-error' : ''}`}
                placeholder="Ex.: Maria da Silva Santos"
                value={data.full_name}
                maxLength={200}
                autoComplete="name"
                onChange={(e) => onChange({ full_name: e.target.value })}
              />
            </Field>

            <Field
              label={isCollective ? 'CPF do responsável' : 'CPF'}
              required
              error={errors.cpf}
              hint="Não será exibido publicamente."
            >
              <input
                name="cpf"
                className={`input ${errors.cpf ? 'input-error' : ''}`}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
                value={formatCPF(data.cpf)}
                onChange={(e) => onChange({ cpf: onlyDigits(e.target.value).slice(0, 11) })}
              />
            </Field>
          </>
        )}

        {/* E-mail (somente leitura) */}
        <Field label="E-mail" hint="Vem da sua conta de acesso. Para alterar, mude o e-mail nas configurações da conta.">
          <input
            name="email"
            type="email"
            className="input opacity-80"
            value={email ?? ''}
            readOnly
            aria-readonly="true"
            autoComplete="email"
          />
        </Field>

        {/* Celular + exibir contato */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:items-end">
          <Field label="Celular" optional error={errors.phone} hint="Com DDD. Ex.: (66) 99999-9999">
            <input
              name="phone"
              type="tel"
              className={`input ${errors.phone ? 'input-error' : ''}`}
              placeholder="(66) 99999-9999"
              inputMode="tel"
              autoComplete="tel"
              value={formatPhone(data.phone)}
              onChange={(e) => onChange({ phone: onlyDigits(e.target.value).slice(0, 11) })}
            />
          </Field>
          <label
            className="flex items-center gap-2 text-sm cursor-pointer sm:mb-6 select-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            <input
              type="checkbox"
              name="show_contact"
              checked={data.show_contact}
              onChange={(e) => onChange({ show_contact: e.target.checked })}
              className="w-4 h-4 rounded accent-amber-500"
            />
            Exibir contato no perfil
          </label>
        </div>

        {/* Dados pessoais — apenas PF */}
        {!isPJ && (
          <>
            <Field
              label={isCollective ? 'Data de nascimento do responsável' : 'Data de nascimento'}
              optional
              error={errors.birth_date}
              hint="Não será exibida publicamente."
            >
              <input
                name="birth_date"
                type="date"
                className={`input ${errors.birth_date ? 'input-error' : ''}`}
                value={data.birth_date}
                max={todayISO()}
                autoComplete="bday"
                onChange={(e) => onChange({ birth_date: e.target.value })}
              />
            </Field>

            {!isCollective && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Gênero" optional>
                  <select
                    name="gender"
                    className="input"
                    value={data.gender}
                    onChange={(e) => onChange({ gender: e.target.value })}
                  >
                    {GENDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Cor/Raça (IBGE)"
                  optional
                  hint="Usado apenas para mapeamento cultural e políticas públicas. Nunca exibido."
                >
                  <select
                    name="race"
                    className="input"
                    value={data.race}
                    onChange={(e) => onChange({ race: e.target.value })}
                  >
                    {RACE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </>
        )}

        {/* Apresentação */}
        <Field
          label="Apresentação / Biografia"
          optional
          hint={`${data.biography.length} caracteres — mínimo 50 para completar o perfil.`}
        >
          <textarea
            name="biography"
            className="input resize-none"
            rows={5}
            maxLength={2000}
            placeholder="Fale sobre você, sua trajetória, projetos e área de atuação cultural..."
            value={data.biography}
            onChange={(e) => onChange({ biography: e.target.value })}
          />
        </Field>

        <div
          className="flex items-start gap-2 p-3 rounded-lg text-xs"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: 'var(--text-muted)' }}
        >
          <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} aria-hidden="true" />
          <span>
            CPF, CNPJ, nome civil, data de nascimento, gênero e cor/raça ficam restritos à Secretaria e nunca aparecem no perfil público.
          </span>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button type="button" onClick={onBack} disabled={isSaving} className="btn btn-secondary flex-1">
          Voltar
        </button>
        <LoadingButton type="button" onClick={handleNext} loading={isSaving} className="btn btn-primary flex-2">
          Continuar
        </LoadingButton>
      </div>
    </div>
  )
}
