import { useId } from 'react'
import { Shield, Eye, FileText, ChevronDown } from 'lucide-react'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import type { WizardStep8 } from './useAgentWizard'

interface Step8Props {
  data: WizardStep8
  onChange: (values: Partial<WizardStep8>) => void
  onNext: () => void
  onBack: () => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
  isSaving: boolean
}

function PrivacyToggle({
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex-1">
        <p id={`${id}-label`} className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p id={`${id}-desc`} className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 mt-0.5 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: checked ? 'var(--accent)' : 'var(--border)' }}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export function Step8PrivacidadeTermos({ data, onChange, onNext, onBack, errors, setErrors, isSaving }: Step8Props) {
  const termsId = useId()

  const handleNext = () => {
    if (!data.terms_accepted) {
      setErrors({ terms_accepted: 'É preciso aceitar os Termos de Uso e Responsabilidade para enviar o cadastro.' })
      document.getElementById(termsId)?.focus()
      return
    }
    setErrors({})
    onNext()
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Privacidade e Termos
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Defina quais informações ficam visíveis no seu perfil público e aceite os termos de uso.
        </p>
      </div>

      {/* Configurações de privacidade */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            O que será visível no perfil público
          </h3>
        </div>

        <PrivacyToggle
          label="Redes sociais"
          desc="Links e perfis nas plataformas"
          checked={data.show_social}
          disabled={isSaving}
          onChange={(v) => onChange({ show_social: v })}
        />
        <PrivacyToggle
          label="Telefone"
          desc="Número de contato cadastrado"
          checked={data.show_phone}
          disabled={isSaving}
          onChange={(v) => onChange({ show_phone: v })}
        />
        <PrivacyToggle
          label="E-mail"
          desc="Endereço de e-mail da conta"
          checked={data.show_email}
          disabled={isSaving}
          onChange={(v) => onChange({ show_email: v })}
        />
        <PrivacyToggle
          label="Endereço completo"
          desc="Rua, número e bairro (cidade e estado são sempre visíveis)"
          checked={data.show_address}
          disabled={isSaving}
          onChange={(v) => onChange({ show_address: v })}
        />
        <PrivacyToggle
          label="Data de nascimento"
          desc="Dia e mês de nascimento"
          checked={data.show_birthdate}
          disabled={isSaving}
          onChange={(v) => onChange({ show_birthdate: v })}
        />

        <div className="mt-3 pt-3">
          <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.06)' }}>
            <Eye size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} aria-hidden="true" />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Independente dessas configurações, <strong>CPF, CNPJ, cor/raça, gênero e o ano de nascimento</strong> nunca
              serão exibidos publicamente. Você pode alterar estas preferências a qualquer momento.
            </p>
          </div>
        </div>
      </div>

      {/* Termos de uso */}
      <div
        className="card p-4 mb-2"
        style={{ borderColor: errors.terms_accepted ? 'var(--error)' : undefined }}
      >
        <div className="flex items-start gap-3 mb-4">
          <FileText size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Termos de Uso e Responsabilidade
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              O agente cultural é responsável pela veracidade das informações cadastradas.
              Os dados serão utilizados pela Secretaria de Esporte, Cultura, Lazer e Eventos da Prefeitura Municipal
              de Água Boa/MT para mapeamento cultural, elaboração de políticas públicas e divulgação da cultura local,
              conforme a LGPD (Lei n.º 13.709/2018).
            </p>

            <details className="mt-3 group">
              <summary
                className="inline-flex items-center gap-1 text-xs cursor-pointer select-none list-none"
                style={{ color: 'var(--accent)' }}
              >
                <ChevronDown size={12} className="transition-transform group-open:rotate-180" aria-hidden="true" />
                Ler os termos completos
              </summary>
              <div
                className="mt-3 p-3 rounded-lg text-xs space-y-2 max-h-52 overflow-y-auto"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.65',
                }}
              >
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Deveres do Agente Cultural</p>
                <p>1. Responsabilizar-se pelas informações cadastradas e pelo conteúdo publicado.</p>
                <p>2. Não fornecer informações falsas ou enganosas.</p>
                <p>3. Manter login e senha sob seu controle pessoal e não compartilhá-los com terceiros.</p>
                <p>4. Comunicar imediatamente qualquer suspeita de acesso indevido à conta.</p>
                <p>5. Utilizar o sistema somente para propósitos lícitos, sem afetar direitos de terceiros.</p>
                <p>6. Não transmitir conteúdo ilícito, difamatório, abusivo ou que viole direitos individuais.</p>
                <p className="font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>Uso de Dados Pessoais</p>
                <p>
                  As informações pessoais serão utilizadas exclusivamente para fins de coleta, sistematização e
                  interpretação de dados culturais, conforme os objetivos do Sistema Municipal de Informações e
                  Indicadores Culturais (SMIIC) e a Lei n.º 13.709/2018 (LGPD).
                </p>

                <p className="font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>Sanções</p>
                <p>
                  O fornecimento de informação falsa pode causar suspensão ou cancelamento do acesso, além das sanções
                  previstas no Art. 299 do Código Penal Brasileiro.
                </p>
                <p className="mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                  Termos regidos pela Lei n.º 12.965/2014 (Marco Civil da Internet) e demais legislação brasileira vigente.
                  Secretaria de Esporte, Cultura, Lazer e Eventos — Prefeitura Municipal de Água Boa/MT.
                  {data.saved_terms_version && ` Versão aceita anteriormente: ${data.saved_terms_version}.`} Versão atual: {data.terms_version}.
                </p>
              </div>
            </details>
          </div>
        </div>

        <label htmlFor={termsId} className="flex items-start gap-3 cursor-pointer">
          <input
            id={termsId}
            type="checkbox"
            checked={data.terms_accepted}
            disabled={isSaving}
            aria-invalid={errors.terms_accepted ? true : undefined}
            aria-describedby={errors.terms_accepted ? `${termsId}-error` : undefined}
            onChange={(e) => { onChange({ terms_accepted: e.target.checked }); setErrors({}) }}
            className="mt-0.5 w-4 h-4 rounded accent-amber-500 flex-shrink-0"
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Li e concordo com os Termos de Uso e Responsabilidade da Plataforma Municipal de Cultura —
            Secretaria de Esporte, Cultura, Lazer e Eventos, Prefeitura Municipal de Água Boa/MT.
          </span>
        </label>
      </div>

      {errors.terms_accepted && (
        <p id={`${termsId}-error`} role="alert" className="text-xs mb-4 ml-1" style={{ color: 'var(--error)' }}>
          {errors.terms_accepted}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button type="button" onClick={onBack} disabled={isSaving} className="btn btn-secondary flex-1">Voltar</button>
        <LoadingButton type="button" onClick={handleNext} loading={isSaving} className="btn btn-primary flex-2">
          Revisar cadastro
        </LoadingButton>
      </div>
    </div>
  )
}
