import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getAgentById, calculateCompletion, uploadAgentCurriculum, updateAgentCurriculum } from '@/services/culturalAgentService'
import {
  ArrowLeft, User, MapPin, Globe, Tag, CheckCircle,
  Clock, XCircle, AlertCircle, Send, BarChart2,
  FileText, Upload, Eye, EyeOff, Loader2,
} from 'lucide-react'
import type { AgentRegistrationStatus } from '@/types'
import { useRef, useState } from 'react'

const STATUS_CONFIG: Record<AgentRegistrationStatus, {
  label: string
  badgeClass: string
  icon: React.ReactNode
  description: string
}> = {
  rascunho: {
    label: 'Rascunho',
    badgeClass: 'badge-slate',
    icon: <AlertCircle size={13} />,
    description: 'Cadastro ainda não foi enviado para análise.',
  },
  enviado: {
    label: 'Enviado',
    badgeClass: 'badge-blue',
    icon: <Send size={13} />,
    description: 'Aguardando análise da Secretaria Municipal de Cultura.',
  },
  em_analise: {
    label: 'Em análise',
    badgeClass: 'badge-amber',
    icon: <Clock size={13} />,
    description: 'A equipe da secretaria está revisando seu cadastro.',
  },
  aprovado: {
    label: 'Aprovado',
    badgeClass: 'badge-green',
    icon: <CheckCircle size={13} />,
    description: 'Seu perfil está publicado no Mapa Cultural.',
  },
  rejeitado: {
    label: 'Rejeitado',
    badgeClass: 'badge-red',
    icon: <XCircle size={13} />,
    description: 'Cadastro rejeitado. Consulte as observações do revisor.',
  },
  suspenso: {
    label: 'Suspenso',
    badgeClass: 'badge-red',
    icon: <XCircle size={13} />,
    description: 'Perfil suspenso. Entre em contato com a secretaria.',
  },
}

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cvUploading, setCvUploading] = useState(false)
  const [cvError, setCvError] = useState('')

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent-detail', id],
    queryFn: () => getAgentById(id!),
    enabled: !!id,
  })

  const curriculumMutation = useMutation({
    mutationFn: async ({ file, show }: { file?: File; show: boolean }) => {
      if (!agent?.id) return
      let url = agent.curriculum_url ?? ''
      if (file) url = await uploadAgentCurriculum(agent.id, file)
      await updateAgentCurriculum(agent.id, url, show)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agent-detail', id] }); setCvError('') },
    onError: (e: any) => setCvError(e?.message ?? 'Erro ao salvar currículo.'),
  })

  async function handleCvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setCvError('Arquivo muito grande. Máximo 5 MB.'); return }
    setCvUploading(true)
    curriculumMutation.mutate({ file, show: agent?.show_curriculum ?? false }, {
      onSettled: () => setCvUploading(false),
    })
  }


  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4 max-w-2xl mx-auto">
        <div className="skeleton h-8 w-40 rounded" />
        <div className="skeleton h-36 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="text-center py-20">
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Agente não encontrado.</p>
        <Link to="/painel/agentes" className="btn btn-secondary">Voltar</Link>
      </div>
    )
  }

  const status = STATUS_CONFIG[agent.registration_status]
  const completion = calculateCompletion(agent)
  const address = (agent as any).agent_addresses?.[0] ?? agent.address
  const typologies = (agent as any).agent_typologies ?? agent.typologies ?? []
  const areas = (agent as any).agent_areas ?? agent.areas ?? []
  const socialLinks = (agent as any).agent_social_links ?? agent.social_links ?? []

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/painel/agentes')}
        className="flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft size={16} />
        Meus agentes
      </button>

      {/* Header card */}
      <div
        className="card p-5 mb-4 flex items-start gap-4"
        style={{ border: '1px solid var(--border)' }}
      >
        {/* Foto */}
        <div
          className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)' }}
        >
          {agent.photo_url ? (
            <img src={agent.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={32} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {agent.display_name || 'Sem nome de exibição'}
              </h1>
              {agent.legal_name && (
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{agent.legal_name}</p>
              )}
            </div>
            <span className={`badge ${status.badgeClass} flex items-center gap-1`}>
              {status.icon}
              {status.label}
            </span>
          </div>

          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {agent.person_type === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'} ·{' '}
            {agent.collective_type === 'individual' ? 'Individual' : 'Coletivo'}
          </p>

          {/* Status description */}
          <p className="text-xs mt-2 px-2 py-1.5 rounded-lg" style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
          }}>
            {status.description}
            {agent.reviewer_notes && (
              <span className="block mt-1 italic" style={{ color: 'var(--text-muted)' }}>
                Obs: {agent.reviewer_notes}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Completude */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={14} style={{ color: 'var(--accent)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Completude do perfil
          </h3>
          <span className="ml-auto text-sm font-bold" style={{ color: 'var(--accent)' }}>
            {completion.percentage}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-2 rounded-full transition-all duration-700"
            style={{
              width: `${completion.percentage}%`,
              background: completion.percentage === 100
                ? 'var(--success)'
                : 'linear-gradient(90deg, var(--accent-dark), var(--accent-light))',
            }}
          />
        </div>
        {completion.missingSteps.length > 0 && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Pendente: {completion.missingSteps.map((s) => ({
              dados_basicos: 'dados básicos',
              foto: 'foto',
              tipologia: 'tipologia',
              areas: 'áreas de atuação',
              endereco: 'endereço',
              redes_sociais: 'redes sociais',
              apresentacao: 'apresentação (mín. 50 caracteres)',
            }[s])).join(', ')}
          </p>
        )}
      </div>

      {/* Biografia */}
      {agent.biography && (
        <div className="card p-4 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            Apresentação
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {agent.biography}
          </p>
        </div>
      )}

      {/* Localização */}
      {address && (
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Localização
            </h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {[address.city, address.state].filter(Boolean).join(' — ') || '—'}
          </p>
        </div>
      )}

      {/* Tipologias */}
      {typologies.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Tipologias
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {typologies.map((t: any) => (
              <span key={t.id} className="badge badge-slate text-xs">
                {t.cultural_typologies?.name ?? t.typology_id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Áreas de atuação */}
      {areas.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Áreas de atuação
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {areas.map((a: any) => (
              <span key={a.id} className="badge badge-slate text-xs">
                {a.categories?.icon} {a.categories?.name ?? a.category_id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Redes sociais */}
      {socialLinks.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Redes sociais
            </h3>
          </div>
          <div className="space-y-1.5">
            {socialLinks.map((s: any) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
                style={{ color: 'var(--accent)' }}
              >
                <Globe size={12} />
                <span>{s.platform}</span>
                <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.url}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Currículo */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Currículo
            </h3>
          </div>
          {agent.curriculum_url && (
            <button
              onClick={() => curriculumMutation.mutate({ show: !(agent.show_curriculum) })}
              disabled={curriculumMutation.isPending}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
              style={{
                background: agent.show_curriculum ? 'rgba(34,197,94,0.1)' : 'var(--bg-secondary)',
                color: agent.show_curriculum ? 'var(--success)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
              title={agent.show_curriculum ? 'Visível no perfil público' : 'Oculto no perfil público'}
            >
              {agent.show_curriculum ? <Eye size={11} /> : <EyeOff size={11} />}
              {agent.show_curriculum ? 'Público' : 'Privado'}
            </button>
          )}
        </div>

        {agent.curriculum_url ? (
          <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <FileText size={18} style={{ color: 'var(--accent)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                curriculo.pdf
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {agent.show_curriculum ? 'Visível na pesquisa pública' : 'Não aparece na pesquisa'}
              </p>
            </div>
            <a
              href={agent.curriculum_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--accent)' }}
            >
              Abrir
            </a>
          </div>
        ) : (
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            Nenhum currículo anexado. Faça upload de um PDF (máx. 5 MB).
          </p>
        )}

        {cvError && <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{cvError}</p>}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={handleCvFile}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={cvUploading}
          className="btn btn-secondary w-full mt-3 text-xs"
        >
          {cvUploading
            ? <><Loader2 size={13} className="animate-spin" /> Enviando...</>
            : <><Upload size={13} /> {agent.curriculum_url ? 'Substituir currículo' : 'Anexar currículo'}</>
          }
        </button>
      </div>

      {/* Ações */}

      <div className="flex gap-3">
        <Link to="/painel/agentes" className="btn btn-secondary flex-1">
          <ArrowLeft size={15} />
          Voltar
        </Link>
        {agent.registration_status === 'aprovado' && (
          <a
            href={`/artistas/${agent.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary flex-1"
          >
            <Globe size={15} />
            Ver perfil público
          </a>
        )}
      </div>
    </div>
  )
}
