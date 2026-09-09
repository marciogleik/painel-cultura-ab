import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Send, User, MapPin, Globe, Tag, Loader2, Edit } from 'lucide-react'
import type { WizardData } from './useAgentWizard'

interface Step9Props {
  data: WizardData
  agentId: string | null
  onBack: () => void
  onGoToStep: (step: number) => void
  onSubmit: () => Promise<void>
  isSaving: boolean
}

function ReviewRow({ label, value, step, onEdit }: {
  label: string
  value: string | null | undefined
  step: number
  onEdit: (step: number) => void
}) {
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex-1">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-medium mt-0.5" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {value || '—'}
        </p>
      </div>
      <button
        onClick={() => onEdit(step)}
        className="flex-shrink-0 p-1.5 rounded-lg hover:opacity-70 transition-opacity"
        style={{ color: 'var(--accent)' }}
      >
        <Edit size={13} />
      </button>
    </div>
  )
}

export function Step9Revisao({ data, onBack, onGoToStep, onSubmit, isSaving }: Step9Props) {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    await onSubmit()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="animate-fade-in text-center py-8">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)' }}
        >
          <CheckCircle size={40} style={{ color: 'var(--success)' }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Cadastro enviado! 🎉
        </h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          Seu cadastro foi enviado para análise da Secretaria Municipal de Cultura.
        </p>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Você receberá uma notificação quando seu perfil for aprovado e publicado no Mapa Cultural.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate('/painel')}
            className="btn btn-secondary"
          >
            Ir para o painel
          </button>
          <button
            onClick={() => navigate('/painel/agentes')}
            className="btn btn-primary"
          >
            Ver meus agentes
          </button>
        </div>
      </div>
    )
  }

  const { step1, step2, step3, step4, step5, step6, step7 } = data

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Revisar e enviar
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Confira as informações antes de enviar. Você pode editar qualquer etapa.
        </p>
      </div>

      {/* Foto + nome */}
      <div className="card p-4 mb-4 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)' }}
        >
          {step7.photo_url ? (
            <img src={step7.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={28} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
        <div className="flex-1">
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
            {step2.display_name || 'Nome não informado'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {step1.person_type === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'} ·{' '}
            {step1.collective_type === 'individual' ? 'Individual' : 'Coletivo'}
          </p>
        </div>
        <button onClick={() => onGoToStep(7)} style={{ color: 'var(--accent)' }}>
          <Edit size={14} />
        </button>
      </div>

      {/* Dados principais */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={14} style={{ color: 'var(--accent)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Identificação
          </h3>
        </div>
        <ReviewRow label="Nome público" value={step2.display_name} step={2} onEdit={onGoToStep} />
        {step1.person_type === 'juridica' && (
          <ReviewRow label="Razão social" value={step2.legal_name} step={2} onEdit={onGoToStep} />
        )}
        <ReviewRow
          label="Apresentação"
          value={step2.biography ? `${step2.biography.substring(0, 80)}...` : null}
          step={2}
          onEdit={onGoToStep}
        />
        <ReviewRow label="Telefone" value={step2.phone} step={2} onEdit={onGoToStep} />
      </div>

      {/* Localização */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={14} style={{ color: 'var(--accent)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Localização
          </h3>
        </div>
        <ReviewRow
          label="Endereço"
          value={step5.city ? `${step5.city}${step5.state ? ` — ${step5.state}` : ''}` : null}
          step={5}
          onEdit={onGoToStep}
        />
      </div>

      {/* Tipologia + Áreas */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Tag size={14} style={{ color: 'var(--accent)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Classificação
          </h3>
        </div>
        <ReviewRow
          label="Tipologias"
          value={step3.typology_ids.length > 0 ? `${step3.typology_ids.length} selecionada(s)` : null}
          step={3}
          onEdit={onGoToStep}
        />
        <ReviewRow
          label="Áreas de atuação"
          value={step4.category_ids.length > 0 ? `${step4.category_ids.length} selecionada(s)` : null}
          step={4}
          onEdit={onGoToStep}
        />
      </div>

      {/* Redes sociais */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={14} style={{ color: 'var(--accent)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Redes sociais
          </h3>
        </div>
        <ReviewRow
          label="Links cadastrados"
          value={step6.links.length > 0 ? `${step6.links.length} link(s)` : null}
          step={6}
          onEdit={onGoToStep}
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-secondary flex-1">Voltar</button>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="btn btn-primary flex-2"
        >
          {isSaving ? (
            <><Loader2 size={16} className="animate-spin" /> Enviando...</>
          ) : (
            <><Send size={16} /> Enviar cadastro</>
          )}
        </button>
      </div>
    </div>
  )
}
