import { useState } from 'react'
import { Search, Loader2, MapPin } from 'lucide-react'
import type { WizardStep5 } from './useAgentWizard'

interface Step5Props {
  data: WizardStep5
  onChange: (values: Partial<WizardStep5>) => void
  onNext: () => void
  onBack: () => void
}

const BRAZIL_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO'
]

export function Step5Localizacao({ data, onChange, onNext, onBack }: Step5Props) {
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')

  const fetchCep = async (cep: string) => {
    const cleaned = cep.replace(/\D/g, '')
    if (cleaned.length !== 8) return

    setCepLoading(true)
    setCepError('')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
      const d = await res.json()
      if (d.erro) {
        setCepError('CEP não encontrado.')
        return
      }
      onChange({
        cep: cleaned,
        street: d.logradouro || '',
        neighborhood: d.bairro || '',
        city: d.localidade || '',
        state: d.uf || '',
      })
    } catch {
      setCepError('Erro ao buscar o CEP. Preencha manualmente.')
    } finally {
      setCepLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Localização
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Informe onde você atua. O endereço completo só será visível se você autorizar nas configurações de privacidade.
        </p>
      </div>

      <div className="space-y-4">
        {/* CEP com busca automática */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            CEP <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(opcional)</span>
          </label>
          <div className="flex gap-2">
            <input
              className={`input ${cepError ? 'input-error' : ''}`}
              placeholder="00000-000"
              maxLength={9}
              value={data.cep || ''}
              onChange={(e) => {
                const v = e.target.value
                onChange({ cep: v })
                if (v.replace(/\D/g, '').length === 8) fetchCep(v)
              }}
            />
            <button
              onClick={() => fetchCep(data.cep || '')}
              disabled={cepLoading}
              className="btn btn-secondary flex-shrink-0"
              title="Buscar CEP"
            >
              {cepLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>
          {cepError && <p className="mt-1 text-xs" style={{ color: 'var(--error)' }}>{cepError}</p>}
        </div>

        {/* Logradouro */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Rua / Avenida
            </label>
            <input
              className="input"
              placeholder="Nome da rua"
              value={data.street || ''}
              onChange={(e) => onChange({ street: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Número
            </label>
            <input
              className="input"
              placeholder="S/N"
              value={data.number || ''}
              onChange={(e) => onChange({ number: e.target.value })}
            />
          </div>
        </div>

        {/* Complemento + Bairro */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Complemento
            </label>
            <input
              className="input"
              placeholder="Apto, sala..."
              value={data.complement || ''}
              onChange={(e) => onChange({ complement: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Bairro
            </label>
            <input
              className="input"
              placeholder="Nome do bairro"
              value={data.neighborhood || ''}
              onChange={(e) => onChange({ neighborhood: e.target.value })}
            />
          </div>
        </div>

        {/* Cidade + Estado — obrigatórios para o mapa */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Cidade <span className="text-xs text-amber-500">*</span>
            </label>
            <input
              className="input"
              placeholder="Nome da cidade"
              value={data.city || ''}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Estado <span className="text-xs text-amber-500">*</span>
            </label>
            <select
              className="input"
              value={data.state || ''}
              onChange={(e) => onChange({ state: e.target.value })}
            >
              <option value="">UF</option>
              {BRAZIL_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Info de privacidade */}
        <div
          className="flex items-start gap-3 p-3 rounded-lg"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}
        >
          <MapPin size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Apenas <strong>cidade e estado</strong> serão exibidos publicamente por padrão.
            O endereço completo só aparece se você autorizar na etapa de privacidade.
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="btn btn-secondary flex-1">Voltar</button>
        <button onClick={onNext} className="btn btn-primary flex-2">
          {!data.city ? 'Pular por enquanto' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
