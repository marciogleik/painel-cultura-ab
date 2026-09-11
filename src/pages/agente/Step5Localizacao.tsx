import { useState } from 'react'
import { Search, Loader2, MapPin, Crosshair } from 'lucide-react'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { formatCEP, onlyDigits } from '@/lib/utils'
import { Field } from './Field'
import type { WizardStep5 } from './useAgentWizard'

interface Step5Props {
  data: WizardStep5
  onChange: (values: Partial<WizardStep5>) => void
  onNext: () => void
  onBack: () => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
  isSaving: boolean
}

const BRAZIL_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
]

interface ViaCepResponse {
  erro?: boolean
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
}

interface NominatimHit {
  lat: string
  lon: string
}

export function Step5Localizacao({ data, onChange, onNext, onBack, errors, setErrors, isSaving }: Step5Props) {
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoMessage, setGeoMessage] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null)

  const fetchCep = async (raw: string) => {
    const cleaned = onlyDigits(raw)
    if (cleaned.length !== 8) {
      setCepError('Informe os 8 dígitos do CEP.')
      return
    }
    setCepLoading(true)
    setCepError('')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
      if (!res.ok) throw new Error('ViaCEP indisponível')
      const d = (await res.json()) as ViaCepResponse
      if (d.erro) {
        setCepError('CEP não encontrado. Preencha o endereço manualmente.')
        return
      }
      onChange({
        cep: cleaned,
        street: d.logradouro || data.street || '',
        neighborhood: d.bairro || data.neighborhood || '',
        city: d.localidade || data.city || '',
        state: d.uf || data.state || '',
      })
    } catch {
      setCepError('Não foi possível consultar o CEP agora. Preencha manualmente.')
    } finally {
      setCepLoading(false)
    }
  }

  /** Geocodificação de melhor esforço (Nominatim/OpenStreetMap). Nunca bloqueia a etapa. */
  const locateOnMap = async () => {
    if (!data.city) {
      setGeoMessage({ kind: 'warn', text: 'Informe ao menos a cidade para localizar no mapa.' })
      return
    }
    setGeoLoading(true)
    setGeoMessage(null)
    const attempts = [
      [data.street && data.number ? `${data.street}, ${data.number}` : data.street, data.neighborhood, data.city, data.state, 'Brasil'],
      [data.street, data.city, data.state, 'Brasil'],
      [data.city, data.state, 'Brasil'],
    ].map((parts) => parts.filter(Boolean).join(', '))

    try {
      for (const q of Array.from(new Set(attempts))) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`
        const res = await fetch(url, { headers: { Accept: 'application/json' } })
        if (!res.ok) continue
        const hits = (await res.json()) as NominatimHit[]
        const hit = hits[0]
        if (hit) {
          const lat = Number(hit.lat)
          const lng = Number(hit.lon)
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            onChange({ lat, lng })
            setGeoMessage({
              kind: 'ok',
              text: q === attempts[0] ? 'Localização encontrada.' : 'Localização aproximada encontrada (pelo centro da cidade/rua).',
            })
            return
          }
        }
      }
      setGeoMessage({ kind: 'warn', text: 'Não encontramos este endereço no mapa. Você pode continuar mesmo assim.' })
    } catch {
      setGeoMessage({ kind: 'warn', text: 'Serviço de mapas indisponível no momento. Você pode continuar mesmo assim.' })
    } finally {
      setGeoLoading(false)
    }
  }

  const handleNext = () => {
    const errs: Record<string, string> = {}
    if (data.cep && onlyDigits(data.cep).length !== 8) errs.cep = 'CEP incompleto. Informe os 8 dígitos ou deixe em branco.'
    if (data.city && !data.state) errs.state = 'Selecione a UF.'
    if (data.state && !data.city) errs.city = 'Informe a cidade.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      document.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`)?.focus()
      return
    }
    onNext()
  }

  const hasCoords = typeof data.lat === 'number' && typeof data.lng === 'number'

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Localização
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Informe onde você atua. O endereço é usado para posicionar o agente no Mapa Cultural.
        </p>
      </div>

      <div className="space-y-4">
        {/* CEP com busca automática */}
        <Field label="CEP" optional error={errors.cep || cepError} hint="Digite o CEP para preencher o endereço automaticamente.">
          <div className="flex gap-2">
            <input
              name="cep"
              className={`input ${errors.cep || cepError ? 'input-error' : ''}`}
              placeholder="00000-000"
              inputMode="numeric"
              autoComplete="postal-code"
              value={formatCEP(data.cep)}
              onChange={(e) => {
                const digits = onlyDigits(e.target.value).slice(0, 8)
                setCepError('')
                onChange({ cep: digits || null })
                if (digits.length === 8) fetchCep(digits)
              }}
            />
            <button
              type="button"
              onClick={() => fetchCep(data.cep || '')}
              disabled={cepLoading}
              className="btn btn-secondary flex-shrink-0"
              aria-label="Buscar endereço pelo CEP"
              title="Buscar CEP"
            >
              {cepLoading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
            </button>
          </div>
        </Field>

        {/* Logradouro */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Rua / Avenida" optional className="col-span-2">
            <input
              name="street"
              className="input"
              placeholder="Nome da rua"
              autoComplete="address-line1"
              value={data.street || ''}
              onChange={(e) => onChange({ street: e.target.value })}
            />
          </Field>
          <Field label="Número" optional>
            <input
              name="number"
              className="input"
              placeholder="S/N"
              value={data.number || ''}
              onChange={(e) => onChange({ number: e.target.value })}
            />
          </Field>
        </div>

        {/* Complemento + Bairro */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Complemento" optional>
            <input
              name="complement"
              className="input"
              placeholder="Apto, sala..."
              autoComplete="address-line2"
              value={data.complement || ''}
              onChange={(e) => onChange({ complement: e.target.value })}
            />
          </Field>
          <Field label="Bairro" optional>
            <input
              name="neighborhood"
              className="input"
              placeholder="Nome do bairro"
              value={data.neighborhood || ''}
              onChange={(e) => onChange({ neighborhood: e.target.value })}
            />
          </Field>
        </div>

        {/* Cidade + Estado — obrigatórios para o mapa */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Cidade" required error={errors.city} className="col-span-2">
            <input
              name="city"
              className={`input ${errors.city ? 'input-error' : ''}`}
              placeholder="Nome da cidade"
              autoComplete="address-level2"
              value={data.city || ''}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </Field>
          <Field label="Estado" required error={errors.state}>
            <select
              name="state"
              className={`input ${errors.state ? 'input-error' : ''}`}
              autoComplete="address-level1"
              value={data.state || ''}
              onChange={(e) => onChange({ state: e.target.value })}
            >
              <option value="">UF</option>
              {BRAZIL_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {/* Localizar no mapa */}
        <div className="card p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Posição no mapa</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }} aria-live="polite">
                {hasCoords
                  ? `Latitude ${data.lat!.toFixed(5)} · Longitude ${data.lng!.toFixed(5)}`
                  : 'Opcional. Tenta localizar o endereço automaticamente (OpenStreetMap).'}
              </p>
            </div>
            <button
              type="button"
              onClick={locateOnMap}
              disabled={geoLoading || !data.city}
              className="btn btn-secondary text-xs flex-shrink-0"
            >
              {geoLoading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Crosshair size={14} aria-hidden="true" />}
              Localizar no mapa
            </button>
          </div>
          {geoMessage && (
            <p
              role={geoMessage.kind === 'warn' ? 'alert' : 'status'}
              className="text-xs mt-2"
              style={{ color: geoMessage.kind === 'ok' ? 'var(--success)' : 'var(--text-muted)' }}
            >
              {geoMessage.text}
            </p>
          )}
        </div>

        {/* Info de privacidade */}
        <div
          className="flex items-start gap-3 p-3 rounded-lg"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}
        >
          <MapPin size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} aria-hidden="true" />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <strong>Cidade e estado são sempre públicos</strong> — é assim que o agente aparece no Mapa Cultural.
            Rua, número, complemento e bairro só aparecem no perfil se você autorizar na etapa de privacidade.
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button type="button" onClick={onBack} disabled={isSaving} className="btn btn-secondary flex-1">Voltar</button>
        <LoadingButton type="button" onClick={handleNext} loading={isSaving} className="btn btn-primary flex-2">
          {!data.city ? 'Pular por enquanto' : 'Continuar'}
        </LoadingButton>
      </div>
    </div>
  )
}
