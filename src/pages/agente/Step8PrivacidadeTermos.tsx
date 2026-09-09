import { Shield, Eye, FileText, ExternalLink } from 'lucide-react'
import type { WizardStep8 } from './useAgentWizard'

interface Step8Props {
  data: WizardStep8
  onChange: (values: Partial<WizardStep8>) => void
  onNext: () => void
  onBack: () => void
  errors: Record<string, string>
}

function PrivacyToggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 mt-0.5"
        style={{ background: checked ? 'var(--accent)' : 'var(--border)' }}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export function Step8PrivacidadeTermos({ data, onChange, onNext, onBack, errors }: Step8Props) {
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
          <Shield size={16} style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            O que será visível no perfil público
          </h3>
        </div>

        <PrivacyToggle
          label="Redes sociais"
          desc="Links e perfis nas plataformas"
          checked={data.show_social}
          onChange={(v) => onChange({ show_social: v })}
        />
        <PrivacyToggle
          label="Telefone"
          desc="Número de contato cadastrado"
          checked={data.show_phone}
          onChange={(v) => onChange({ show_phone: v })}
        />
        <PrivacyToggle
          label="E-mail"
          desc="Endereço de e-mail da conta"
          checked={data.show_email}
          onChange={(v) => onChange({ show_email: v })}
        />
        <PrivacyToggle
          label="Endereço completo"
          desc="Rua, número e bairro (cidade sempre visível)"
          checked={data.show_address}
          onChange={(v) => onChange({ show_address: v })}
        />
        <PrivacyToggle
          label="Data de nascimento"
          desc="Dia e mês de nascimento"
          checked={data.show_birthdate}
          onChange={(v) => onChange({ show_birthdate: v })}
        />

        <div className="mt-3 pt-3">
          <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.06)' }}>
            <Eye size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Independente dessas configurações, <strong>CPF, CNPJ, raça e data de nascimento completa</strong> nunca
              serão exibidos publicamente. Você pode alterar estas preferências a qualquer momento.
            </p>
          </div>
        </div>
      </div>

      {/* Termos de uso */}
      <div
        className="card p-4 mb-2"
        style={{
          borderColor: errors.terms_accepted ? 'var(--error)' : undefined,
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <FileText size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Termos de Uso e Responsabilidade
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              O agente cultural é responsável pela veracidade das informações cadastradas.
              Os dados serão utilizados pela Secretaria Municipal de Cultura para mapeamento cultural,
              elaboração de políticas públicas e divulgação da cultura local, conforme a LGPD (Lei n.º 13.709/2018).
            </p>

            {/* Termos expandíveis via <details> nativo */}
            <details className="mt-3 group">
              <summary
                className="inline-flex items-center gap-1 text-xs cursor-pointer select-none list-none"
                style={{ color: 'var(--accent)' }}
              >
                <ExternalLink size={11} />
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
                <p>As informações pessoais serão utilizadas exclusivamente para fins de coleta, sistematização e interpretação de dados culturais, conforme os objetivos do SMIIC e a Lei n.º 13.709/2018 (LGPD).</p>
                <p className="font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>Sanções</p>
                <p>O fornecimento de informação falsa pode causar suspensão ou cancelamento do acesso, além das sanções previstas no Art. 299 do Código Penal Brasileiro.</p>
                <p className="mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                  Termos regidos pela Lei n.º 12.965/2014 (Marco Civil da Internet) e demais legislação brasileira vigente.
                  SECTUR — Secretaria Municipal de Cultura e Turismo, Campo Grande — MS.
                </p>
              </div>
            </details>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.terms_accepted}
            onChange={(e) => onChange({ terms_accepted: e.target.checked })}
            className="mt-0.5 w-4 h-4 rounded accent-amber-500 flex-shrink-0"
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Li e concordo com os Termos de Uso e Responsabilidade da Plataforma Municipal de Cultura de Água Boa — MT.
          </span>
        </label>
      </div>

      {errors.terms_accepted && (
        <p className="text-xs mb-4 ml-1" style={{ color: 'var(--error)' }}>
          {errors.terms_accepted}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="btn btn-secondary flex-1">Voltar</button>
        <button
          onClick={() => {
            if (!data.terms_accepted) return
            onNext()
          }}
          disabled={!data.terms_accepted}
          className="btn btn-primary flex-2"
        >
          Revisar cadastro
        </button>
      </div>
    </div>
  )
}
