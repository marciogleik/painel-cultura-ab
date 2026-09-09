import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, CheckCircle, XCircle, User, Eye, RefreshCw,
  MapPin, Phone, FileText, Tag, Globe, ExternalLink,
  Download, Layers, X, MessageSquare, ShieldCheck,
  Building2, Sparkles, AlertCircle, Check, Copy, Clock,
  Plus, FileCheck, Map
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  adminGetAllAgents,
  adminReviewAgent,
  createCulturalAgent,
  updateCulturalAgent,
  setAgentTypologies,
  upsertAgentAddress,
  setAgentSocialLinks,
  submitAgent
} from '@/services/culturalAgentService'
import type { AgentRegistrationStatus, CulturalAgentWithRelations } from '@/types'

const STATUS_LABELS: Record<AgentRegistrationStatus, { label: string; badge: string; desc: string }> = {
  rascunho: { label: 'Rascunho', badge: 'badge-slate', desc: 'Em preenchimento pelo agente' },
  enviado: { label: 'Aguardando Aprovação', badge: 'badge-blue', desc: 'Submetido para análise municipal' },
  em_analise: { label: 'Em Análise', badge: 'badge-amber', desc: 'Em avaliação técnica pela Secretaria' },
  aprovado: { label: 'Aprovado (SMIIC)', badge: 'badge-green', desc: 'Agente homologado e público no Mapa' },
  rejeitado: { label: 'Ajustes Solicitados', badge: 'badge-red', desc: 'Devolvido com parecer para correção' },
  suspenso: { label: 'Suspenso', badge: 'badge-red', desc: 'Cadastro temporariamente suspenso' },
}

function formatDocument(cpf?: string | null, cnpj?: string | null) {
  if (cnpj) {
    const clean = cnpj.replace(/\D/g, '')
    if (clean.length === 14) {
      return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    }
    return cnpj
  }
  if (cpf) {
    const clean = cpf.replace(/\D/g, '')
    if (clean.length === 11) {
      return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
    }
    return cpf
  }
  return 'Não informado'
}

function formatPhone(phone?: string | null) {
  if (!phone) return 'Não informado'
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 11) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }
  if (clean.length === 10) {
    return clean.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  }
  return phone
}

function calculateAge(birthDate?: string | null): string | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age >= 0 ? `${age} anos` : null
}

function getWhatsAppLink(phone?: string | null, name?: string | null) {
  if (!phone) return null
  const clean = phone.replace(/\D/g, '')
  if (clean.length < 10) return null
  const text = encodeURIComponent(
    `Olá ${name || 'Agente Cultural'}, aqui é da Secretaria Municipal de Cultura de Água Boa/MT referente à validação do seu cadastro no SMIIC.`
  )
  return `https://wa.me/55${clean}?text=${text}`
}

function getGoogleMapsLink(address?: any) {
  if (!address) return null
  const parts = [
    address.street ? `${address.street}, ${address.number || 'S/N'}` : null,
    address.neighborhood,
    address.city || 'Água Boa',
    address.state || 'MT',
    'Brasil'
  ].filter(Boolean)
  if (parts.length === 0) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`
}

export function AdminAgentes() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AgentRegistrationStatus | ''>('')
  const [personTypeFilter, setPersonTypeFilter] = useState<'fisica' | 'juridica' | ''>('')
  const [page, setPage] = useState(1)
  const [selectedAgent, setSelectedAgent] = useState<CulturalAgentWithRelations | null>(null)
  const [modalTab, setModalTab] = useState<'sintese' | 'tipologias' | 'localizacao' | 'portfolio' | 'governanca'>('sintese')
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isCreatingSample, setIsCreatingSample] = useState(false)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    setTimeout(() => setCopiedField(null), 2500)
  }

  // Buscar agentes com todas as relações oficiais
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-agents', search, statusFilter, personTypeFilter, page],
    queryFn: () =>
      adminGetAllAgents({
        search: search || undefined,
        person_type: personTypeFilter || undefined,
        registration_status: statusFilter || undefined,
        page,
        pageSize: 25,
      }),
    staleTime: 15000,
  })

  // Mutação para aprovar ou rejeitar o agente
  const reviewMutation = useMutation({
    mutationFn: ({
      agentId,
      decision,
      notes,
    }: { agentId: string; decision: 'aprovado' | 'rejeitado'; notes?: string }) =>
      adminReviewAgent(agentId, user!.id, decision, notes),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-agents'] })
      setActionSuccess(
        vars.decision === 'aprovado'
          ? 'Agente cultural homologado e aprovado com sucesso! Já está público no Mapa Cultural de Água Boa.'
          : 'Cadastro do agente devolvido com apontamento de ajustes.'
      )
      setTimeout(() => setActionSuccess(null), 5000)
      setSelectedAgent(null)
      setReviewNotes('')
    },
  })

  const handleReview = async (decision: 'aprovado' | 'rejeitado') => {
    if (!selectedAgent) return
    if (decision === 'rejeitado' && !reviewNotes.trim()) {
      alert('Por favor, informe no parecer o motivo da rejeição ou quais ajustes o agente cultural deve realizar.')
      return
    }
    setReviewLoading(true)
    try {
      await reviewMutation.mutateAsync({ agentId: selectedAgent.id, decision, notes: reviewNotes })
    } finally {
      setReviewLoading(false)
    }
  }

  // Criação de agente demonstrativo para homologação imediata
  const handleCreateSampleAgent = async () => {
    if (!user) return
    setIsCreatingSample(true)
    try {
      // 1. Cria o agente
      const agent = await createCulturalAgent(user.id, {
        person_type: 'fisica',
        collective_type: 'individual',
      })
      // 2. Atualiza dados
      await updateCulturalAgent(agent.id, {
        display_name: 'Mestre Tião do Catira',
        legal_name: 'Sebastião Alves dos Santos',
        biography: 'Mestre da cultura popular e violeiro tradicional com mais de 25 anos de dedicação à preservação do Catira, Cururu e moda de viola no Vale do Araguaia. Fundador do Grupo de Catira Estrela do Araguaia em Água Boa/MT, atuando em festivais estaduais, escolas municipais e oficinas comunitárias para jovens da região.',
        phone: '66999887766',
        show_contact: true,
        birth_date: '1968-06-24',
        gender: 'Masculino',
        race: 'Pardo',
        cpf: '74125896300',
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: 'v1.0-SMIIC',
        photo_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
        curriculum_url: 'https://cultura.aguaboamt.gov.br/docs/portfoliopdf_exemplo.pdf',
        show_curriculum: true,
      })
      // 3. Tipologia SMIIC Nível 2 (Cultura Popular / Catira e Viola)
      await setAgentTypologies(agent.id, ['00000001-0000-0000-0000-000000000004', '00000001-0000-0000-0000-000000000008'])
      // 4. Endereço
      await upsertAgentAddress(agent.id, {
        street: 'Avenida Araguaia',
        number: '1420',
        complement: 'Casa 02',
        neighborhood: 'Centro',
        city: 'Água Boa',
        state: 'MT',
        cep: '78635-000',
      })
      // 5. Redes Sociais
      await setAgentSocialLinks(agent.id, [
        { platform: 'INSTAGRAM', url: 'https://instagram.com/tiao.catira', username: '@tiao.catira' },
        { platform: 'YOUTUBE', url: 'https://youtube.com/@tiao.catira', username: 'Catira Estrela do Araguaia' },
      ])
      // 6. Submete para análise
      await submitAgent(agent.id)
      qc.invalidateQueries({ queryKey: ['admin-agents'] })
      setActionSuccess('Agente cultural de exemplo criado e enviado para análise com sucesso!')
      setTimeout(() => setActionSuccess(null), 5000)
    } catch (err: any) {
      alert('Erro ao criar agente de teste: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setIsCreatingSample(false)
    }
  }

  // Estatísticas rápidas
  const totalAgents = data?.count ?? 0
  const pendingCount = useMemo(() => {
    return data?.data.filter(
      (a) => a.registration_status === 'enviado' || a.registration_status === 'em_analise'
    ).length ?? 0
  }, [data])

  const approvedCount = useMemo(() => {
    return data?.data.filter((a) => a.registration_status === 'aprovado').length ?? 0
  }, [data])

  const rejectedCount = useMemo(() => {
    return data?.data.filter((a) => a.registration_status === 'rejeitado').length ?? 0
  }, [data])

  // Relações do agente selecionado para o modal
  const address = selectedAgent ? (
    Array.isArray((selectedAgent as any).agent_addresses)
      ? (selectedAgent as any).agent_addresses[0]
      : (selectedAgent as any).agent_addresses ?? (selectedAgent as any).address
  ) : null

  const typologies = selectedAgent ? (
    (selectedAgent as any).agent_typologies ?? selectedAgent.typologies ?? []
  ) : []

  const areas = selectedAgent ? (
    (selectedAgent as any).agent_areas ?? []
  ) : []

  const socialLinks = selectedAgent ? (
    (selectedAgent as any).agent_social_links ?? selectedAgent.social_links ?? []
  ) : []

  const memberships = selectedAgent ? (
    (selectedAgent as any).agent_memberships ?? selectedAgent.memberships ?? []
  ) : []
  const ownerProfile = memberships[0]?.profiles

  const formattedProtocol = selectedAgent ? `#SMIIC-${selectedAgent.id.slice(0, 8).toUpperCase()}` : ''
  const calculatedAge = selectedAgent ? calculateAge(selectedAgent.birth_date) : null
  const whatsappUrl = selectedAgent ? getWhatsAppLink(selectedAgent.phone, selectedAgent.display_name) : null
  const googleMapsUrl = address ? getGoogleMapsLink(address) : null

  return (
    <div className="animate-fade-in pb-16">
      {/* Alerta de sucesso */}
      {actionSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 animate-slide-up shadow-sm">
          <CheckCircle size={20} className="flex-shrink-0" />
          <span className="text-sm font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* Header com Identidade Oficial SMIIC */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-amber text-xs font-bold uppercase tracking-wider">
              Secretaria Municipal de Cultura · Água Boa / MT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
            <Layers size={28} className="text-amber-500" />
            Aprovação e Gestão de Agentes Culturais (SMIIC)
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Dossiê completo, homologação cadastral, tipologias e validação documental de artistas e fazedores de cultura.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleCreateSampleAgent()}
            disabled={isCreatingSample}
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
            title="Cria um agente com cadastro completo para testar a homologação"
          >
            <Plus size={14} className="text-amber-500" />
            {isCreatingSample ? 'Criando Teste...' : 'Criar Agente de Teste'}
          </button>

          <button onClick={() => refetch()} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards de Métricas e Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3.5 border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-500">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{totalAgents}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total Cadastrados</p>
          </div>
        </div>

        <div
          className={`card p-4 flex items-center gap-3.5 border shadow-sm transition-all ${pendingCount > 0 ? 'ring-2 ring-blue-500/30 bg-blue-500/5' : ''
            }`}
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-500">
            <Clock size={22} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-2xl font-black text-blue-500">{pendingCount}</p>
              {pendingCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white animate-pulse">
                  Pendente
                </span>
              )}
            </div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Para Homologação</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-500">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-500">{approvedCount}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Aprovados / Ativos</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="w-11 h-11 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0 text-red-500">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-red-500">{rejectedCount}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Devolvidos p/ Ajuste</p>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input pl-10 w-full text-sm font-medium"
            placeholder="Buscar agente por nome artístico, razão social, CPF/CNPJ..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            className="input text-xs font-semibold py-2"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1) }}
          >
            <option value="">Status: Todos</option>
            <option value="enviado">Aguardando Aprovação ({pendingCount})</option>
            <option value="em_analise">Em Análise Técnica</option>
            <option value="aprovado">Aprovados (SMIIC)</option>
            <option value="rejeitado">Ajustes Solicitados</option>
            <option value="rascunho">Rascunhos</option>
          </select>

          <select
            className="input text-xs font-semibold py-2"
            value={personTypeFilter}
            onChange={(e) => { setPersonTypeFilter(e.target.value as any); setPage(1) }}
          >
            <option value="">Tipo: Todos</option>
            <option value="fisica">Pessoa Física (PF)</option>
            <option value="juridica">Pessoa Jurídica (PJ/MEI)</option>
          </select>
        </div>
      </div>

      {/* Filtros Rápidos em Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-[11px] font-bold uppercase tracking-wider mr-1" style={{ color: 'var(--text-muted)' }}>
          Filtro Rápido:
        </span>
        <button
          onClick={() => { setStatusFilter(''); setPage(1) }}
          className={`badge cursor-pointer transition-all text-xs ${statusFilter === '' ? 'badge-primary font-bold' : 'badge-slate'}`}
        >
          Todos ({totalAgents})
        </button>
        <button
          onClick={() => { setStatusFilter('enviado'); setPage(1) }}
          className={`badge cursor-pointer transition-all text-xs ${statusFilter === 'enviado' ? 'badge-blue font-bold shadow-sm' : 'badge-slate'}`}
        >
          Para Homologação ({pendingCount})
        </button>
        <button
          onClick={() => { setStatusFilter('aprovado'); setPage(1) }}
          className={`badge cursor-pointer transition-all text-xs ${statusFilter === 'aprovado' ? 'badge-green font-bold' : 'badge-slate'}`}
        >
          Aprovados ({approvedCount})
        </button>
        <button
          onClick={() => { setStatusFilter('rejeitado'); setPage(1) }}
          className={`badge cursor-pointer transition-all text-xs ${statusFilter === 'rejeitado' ? 'badge-red font-bold' : 'badge-slate'}`}
        >
          Com Pendência ({rejectedCount})
        </button>
      </div>

      {/* Tabela Limpa e Organizada de Agentes */}
      <div className="card overflow-hidden border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]" style={{ color: 'var(--text-muted)' }}>Agente Cultural</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]" style={{ color: 'var(--text-muted)' }}>Documento / Natureza</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]" style={{ color: 'var(--text-muted)' }}>Classificação SMIIC</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]" style={{ color: 'var(--text-muted)' }}>Localização</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]" style={{ color: 'var(--text-muted)' }}>Contato</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px] text-right" style={{ color: 'var(--text-muted)' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td colSpan={7} className="px-4 py-4">
                      <div className="skeleton h-6 w-full rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3">
                        <Layers size={28} />
                      </div>
                      <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                        Nenhum agente cultural encontrado
                      </h3>
                      <p className="text-xs text-slate-400 mb-4">
                        Não encontramos registros para os filtros atuais. Você pode criar um agente de teste para homologar a aprovação.
                      </p>
                      <button
                        onClick={() => handleCreateSampleAgent()}
                        disabled={isCreatingSample}
                        className="btn btn-primary text-xs inline-flex items-center gap-1.5"
                      >
                        <Plus size={14} />
                        {isCreatingSample ? 'Criando...' : 'Criar Agente de Teste para Homologação'}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data.map((agent) => {
                  const s = STATUS_LABELS[agent.registration_status] ?? STATUS_LABELS.rascunho
                  const agentAddress = Array.isArray((agent as any).agent_addresses)
                    ? (agent as any).agent_addresses[0]
                    : (agent as any).agent_addresses ?? (agent as any).address
                  const city = agentAddress?.city || 'Água Boa'
                  const neighborhood = agentAddress?.neighborhood || ''
                  const agentTyps = (agent as any).agent_typologies ?? []
                  const isPending = agent.registration_status === 'enviado' || agent.registration_status === 'em_analise'
                  const protocol = `#SMIIC-${agent.id.slice(0, 8).toUpperCase()}`
                  const agentWa = getWhatsAppLink(agent.phone, agent.display_name)

                  return (
                    <tr
                      key={agent.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Agente */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 border shadow-sm"
                            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                          >
                            {agent.photo_url ? (
                              <img src={agent.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={20} style={{ color: 'var(--text-muted)' }} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                {protocol}
                              </span>
                            </div>
                            <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                              {agent.display_name || 'Sem nome artístico'}
                            </p>
                            <p className="text-xs truncate font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {agent.legal_name || 'Razão Social não informada'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Documento & Natureza */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
                            {formatDocument(agent.cpf, agent.cnpj)}
                          </span>
                          <span className="badge badge-slate text-[10px] py-0 px-1.5">
                            {agent.person_type === 'fisica' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'} · {agent.collective_type === 'individual' ? 'Individual' : 'Coletivo'}
                          </span>
                        </div>
                      </td>

                      {/* Tipologias SMIIC */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {agentTyps.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Não informada</span>
                          ) : (
                            agentTyps.slice(0, 2).map((t: any, idx: number) => {
                              const typ = t.cultural_typologies
                              return (
                                <span
                                  key={idx}
                                  className="badge badge-amber text-[11px] py-0.5 px-2 truncate font-medium flex items-center gap-1"
                                >
                                  <Tag size={10} />
                                  {typ?.name ?? t.typology_id}
                                </span>
                              )
                            })
                          )}
                          {agentTyps.length > 2 && (
                            <span className="badge badge-slate text-[10px] py-0.5 px-1.5 font-bold">
                              +{agentTyps.length - 2} mais
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Localização */}
                      <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex items-center gap-1.5 font-medium">
                          <MapPin size={13} className="text-amber-500 flex-shrink-0" />
                          <span className="truncate">
                            {neighborhood ? `${neighborhood}, ` : ''}{city} - MT
                          </span>
                        </div>
                      </td>

                      {/* Contato & WhatsApp */}
                      <td className="px-4 py-3.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {formatPhone(agent.phone)}
                          </span>
                          {agentWa && (
                            <a
                              href={agentWa}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                              title="Chamar no WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`badge ${s.badge} text-[11px] font-bold py-1 px-2.5`}>
                          {s.label}
                        </span>
                      </td>

                      {/* Ação: Avaliar Dossiê */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedAgent(agent)
                            setReviewNotes(agent.reviewer_notes || '')
                            setModalTab('sintese')
                          }}
                          className={`btn py-1.5 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm ${isPending
                            ? 'btn-primary'
                            : 'btn-secondary'
                            }`}
                        >
                          <Eye size={14} />
                          {isPending ? 'Avaliar Dossiê' : 'Ver Ficha'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary py-1.5 px-3 text-xs"
          >
            ← Anterior
          </button>
          <span className="btn btn-ghost py-1.5 px-3 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
            Página {page} de {data.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="btn btn-secondary py-1.5 px-3 text-xs"
          >
            Próxima →
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL / DOSSIÊ COMPLETO E ORGANIZADO DE HOMOLOGAÇÃO       */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedAgent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setSelectedAgent(null)}
        >
          <div
            className="card w-full max-w-5xl animate-slide-up flex flex-col shadow-2xl border overflow-hidden"
            style={{ maxHeight: '94vh', background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            {/* Header Oficial do Dossiê */}
            <div className="p-5 sm:p-6 border-b flex items-start justify-between gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <div className="flex items-start sm:items-center gap-4">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 border-2 shadow-md"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--accent)' }}
                >
                  {selectedAgent.photo_url ? (
                    <img src={selectedAgent.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={34} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {formattedProtocol}
                    </span>
                    <span className={`badge ${STATUS_LABELS[selectedAgent.registration_status]?.badge ?? 'badge-slate'} font-bold`}>
                      {STATUS_LABELS[selectedAgent.registration_status]?.label}
                    </span>
                    <span className="badge badge-slate text-xs font-semibold">
                      {selectedAgent.person_type === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'} · {selectedAgent.collective_type === 'individual' ? 'Individual' : 'Coletivo'}
                    </span>
                    {selectedAgent.is_public ? (
                      <span className="badge badge-green text-xs font-medium">Público no Mapa</span>
                    ) : (
                      <span className="badge badge-slate text-xs">Visibilidade Restrita</span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                    {selectedAgent.display_name || 'Sem nome artístico informado'}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Razão Social / Nome Civil: <strong className="text-slate-800 dark:text-slate-200">{selectedAgent.legal_name || 'Não informada'}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Fechar Dossiê"
              >
                <X size={22} />
              </button>
            </div>

            {/* Abas de Navegação do Dossiê */}
            <div className="flex border-b px-6 gap-2 sm:gap-4 overflow-x-auto" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              {[
                { id: 'sintese', label: '📋 Ficha Síntese', desc: 'Resumo Geral' },
                { id: 'tipologias', label: '🏛️ Tipologias SMIIC', desc: 'Classificação' },
                { id: 'localizacao', label: '📍 Localização & Contatos', desc: 'Endereço e Redes' },
                { id: 'portfolio', label: '🎨 Trajetória & Portfólio', desc: 'Bio e Currículo' },
                { id: 'governanca', label: '⚖️ Governança & Auditoria', desc: 'Termos e Histórico' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id as any)}
                  className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${modalTab === tab.id
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo Dinâmico das Abas */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs sm:text-sm">

              {/* ABA 1: FICHA SÍNTESE (TUDO DE FORMA CLARA E ORGANIZADA) */}
              {modalTab === 'sintese' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Bloco 1: Dados Fiscais e Sociodemográficos */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                      <Building2 size={15} />
                      Identificação Civil e Fiscal
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                        <span className="text-[11px] uppercase tracking-wider font-bold block mb-1 text-slate-400">
                          {selectedAgent.person_type === 'fisica' ? 'CPF' : 'CNPJ'}
                        </span>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {formatDocument(selectedAgent.cpf, selectedAgent.cnpj)}
                          </span>
                          {(selectedAgent.cpf || selectedAgent.cnpj) && (
                            <button
                              onClick={() => copyToClipboard(selectedAgent.cpf || selectedAgent.cnpj || '', 'doc')}
                              className="text-slate-400 hover:text-amber-500 p-1"
                              title="Copiar documento"
                            >
                              {copiedField === 'doc' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                        <span className="text-[11px] uppercase tracking-wider font-bold block mb-1 text-slate-400">
                          Nascimento / Fundação
                        </span>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {selectedAgent.birth_date
                            ? new Date(selectedAgent.birth_date).toLocaleDateString('pt-BR')
                            : 'Não informado'}
                          {calculatedAge && (
                            <span className="text-xs font-normal text-slate-400 ml-1.5">
                              ({calculatedAge})
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                        <span className="text-[11px] uppercase tracking-wider font-bold block mb-1 text-slate-400">
                          Gênero & Raça / Etnia (IBGE)
                        </span>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {[selectedAgent.gender, selectedAgent.race].filter(Boolean).join(' · ') || 'Não informado'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                        <span className="text-[11px] uppercase tracking-wider font-bold block mb-1 text-slate-400">
                          Usuário do Sistema
                        </span>
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {ownerProfile?.full_name || 'Titular da conta'}
                        </p>
                        {ownerProfile?.phone && (
                          <span className="text-[11px] text-slate-400 block font-mono">
                            {formatPhone(ownerProfile.phone)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Tipologias Oficiais SMIIC */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                        <Tag size={15} />
                        Tipologias Culturais SMIIC ({typologies.length})
                      </h3>
                      <button
                        onClick={() => setModalTab('tipologias')}
                        className="text-xs text-amber-500 hover:underline font-semibold"
                      >
                        Ver detalhes →
                      </button>
                    </div>

                    {typologies.length === 0 ? (
                      <div className="p-4 rounded-2xl border border-dashed text-slate-400 text-xs italic text-center">
                        Nenhuma tipologia oficial selecionada pelo agente.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {typologies.map((t: any, idx: number) => {
                          const typ = t.cultural_typologies
                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-2xl border flex items-center justify-between gap-2 shadow-sm"
                              style={{
                                background: 'rgba(245, 158, 11, 0.05)',
                                borderColor: 'rgba(245, 158, 11, 0.25)',
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                                <span className="font-bold text-xs sm:text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                  {typ?.name ?? t.typology_id}
                                </span>
                              </div>
                              <span className="badge badge-amber text-[10px] font-extrabold flex-shrink-0">
                                Nível {typ?.level ?? 2}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bloco 3: Localização & Contato */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Endereço */}
                    <div className="p-4 rounded-2xl border space-y-2 shadow-sm" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          <MapPin size={14} className="text-amber-500" />
                          Endereço no Município
                        </h4>
                        {googleMapsUrl && (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-amber-500 hover:underline flex items-center gap-1"
                          >
                            <Map size={12} />
                            Google Maps ↗
                          </a>
                        )}
                      </div>

                      {address ? (
                        <div className="text-xs space-y-1" style={{ color: 'var(--text-primary)' }}>
                          <p className="font-bold text-sm">
                            {address.street ? `${address.street}, ${address.number || 'S/N'}` : 'Logradouro não informado'}
                            {address.complement && <span className="font-normal text-slate-400"> ({address.complement})</span>}
                          </p>
                          <p style={{ color: 'var(--text-secondary)' }}>
                            Bairro: <strong className="text-slate-800 dark:text-slate-200">{address.neighborhood || 'Não informado'}</strong>
                          </p>
                          <p style={{ color: 'var(--text-secondary)' }}>
                            CEP: {address.cep || '78635-000'} · <strong className="text-slate-800 dark:text-slate-200">{address.city || 'Água Boa'} - {address.state || 'MT'}</strong>
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Endereço ainda não cadastrado.</p>
                      )}
                    </div>

                    {/* Contatos Imediatos */}
                    <div className="p-4 rounded-2xl border space-y-2 shadow-sm" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <Phone size={14} className="text-amber-500" />
                        Comunicação Direta
                      </h4>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[11px] text-slate-400 block">Telefone / WhatsApp</span>
                            <span className="font-bold text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                              {formatPhone(selectedAgent.phone)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {whatsappUrl && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn py-1 px-2.5 text-xs font-bold inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                              >
                                <MessageSquare size={13} />
                                WhatsApp
                              </a>
                            )}
                            {selectedAgent.phone && (
                              <a
                                href={`tel:${selectedAgent.phone.replace(/\D/g, '')}`}
                                className="btn btn-secondary py-1 px-2 text-xs"
                                title="Ligar"
                              >
                                <Phone size={13} />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Redes Sociais */}
                        <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-[11px] text-slate-400 block mb-1">Redes Sociais:</span>
                          {socialLinks.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Nenhuma rede informada.</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {socialLinks.map((s: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={s.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="badge badge-slate text-[11px] hover:text-amber-500 flex items-center gap-1 py-1 px-2"
                                >
                                  <ExternalLink size={10} />
                                  {s.platform}: {s.username || 'Link'}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 4: Biografia / Apresentação Artística */}
                  <div className="p-4 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                      <FileText size={14} />
                      Biografia / Histórico de Atuação Cultural
                    </h4>
                    {selectedAgent.biography ? (
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal" style={{ color: 'var(--text-primary)' }}>
                        {selectedAgent.biography}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Biografia artística não preenchida pelo agente.</p>
                    )}
                  </div>

                  {/* Bloco 5: Currículo & Portfólio Anexo */}
                  <div className="p-4 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                          <Download size={14} className="text-amber-500" />
                          Currículo / Portfólio Artístico (PDF)
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {selectedAgent.curriculum_url
                            ? 'Documento comprobatório anexado pelo agente cultural para avaliação.'
                            : 'Nenhum currículo ou portfólio em PDF foi anexado.'}
                        </p>
                      </div>

                      {selectedAgent.curriculum_url ? (
                        <a
                          href={selectedAgent.curriculum_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
                        >
                          <ExternalLink size={14} />
                          Visualizar Currículo (PDF)
                        </a>
                      ) : (
                        <span className="badge badge-slate text-xs">Sem anexo</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: TIPOLOGIAS SMIIC & ÁREAS CULTURAIS */}
              {modalTab === 'tipologias' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-4 rounded-2xl border bg-amber-500/5 border-amber-500/20">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-2">
                      <Sparkles size={16} />
                      Classificação Oficial no SMIIC
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      As tipologias definem a área de atuação do agente cultural segundo as diretrizes municipais e nacionais do Sistema de Indicadores Culturais.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Tag size={15} className="text-amber-500" />
                      Tipologias Vinculadas ({typologies.length})
                    </h4>

                    {typologies.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl italic text-xs">
                        Nenhuma tipologia cadastrada.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {typologies.map((t: any, idx: number) => {
                          const typ = t.cultural_typologies
                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-sm"
                              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                            >
                              <div>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-500 block mb-1">
                                  Tipologia SMIIC · Nível {typ?.level ?? 2}
                                </span>
                                <h5 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                  {typ?.name ?? t.typology_id}
                                </h5>
                                {typ?.slug && (
                                  <span className="font-mono text-[11px] text-slate-400 mt-1 block">
                                    Identificador: {typ.slug}
                                  </span>
                                )}
                              </div>
                              <span className="badge badge-amber text-xs font-bold">
                                Ativo
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Áreas Culturais (Categories) */}
                  {areas.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Layers size={15} className="text-amber-500" />
                        Áreas Artísticas Complementares ({areas.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {areas.map((a: any, idx: number) => (
                          <span key={idx} className="badge badge-slate text-xs py-1.5 px-3 font-semibold">
                            {a.categories?.name || 'Área Cultural'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 3: LOCALIZAÇÃO & CONTATOS */}
              {modalTab === 'localizacao' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-5 rounded-2xl border space-y-4 shadow-sm" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <MapPin size={18} className="text-amber-500" />
                        Endereço Completo & Territorialidade
                      </h3>
                      {googleMapsUrl && (
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary py-1.5 px-3 text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <ExternalLink size={13} />
                          Abrir no Google Maps
                        </a>
                      )}
                    </div>

                    {address ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                          <span className="text-[11px] text-slate-400 block font-semibold">Logradouro / Número</span>
                          <span className="font-bold text-xs sm:text-sm">
                            {address.street ? `${address.street}, ${address.number || 'S/N'}` : 'Não informado'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                          <span className="text-[11px] text-slate-400 block font-semibold">Bairro / Setor</span>
                          <span className="font-bold text-xs sm:text-sm">
                            {address.neighborhood || 'Não informado'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                          <span className="text-[11px] text-slate-400 block font-semibold">Município / Estado</span>
                          <span className="font-bold text-xs sm:text-sm">
                            {address.city || 'Água Boa'} - {address.state || 'MT'} (CEP: {address.cep || '78635-000'})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhum endereço cadastrado.</p>
                    )}
                  </div>

                  {/* Redes Sociais com cartões dedicados */}
                  <div>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Globe size={18} className="text-amber-500" />
                      Presença Digital e Redes Sociais ({socialLinks.length})
                    </h3>

                    {socialLinks.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 border border-dashed rounded-2xl italic text-xs">
                        Nenhuma rede social informada pelo agente.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {socialLinks.map((s: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-2xl border flex items-center justify-between gap-2 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase font-bold text-amber-500 block">
                                {s.platform}
                              </span>
                              <span className="text-xs font-semibold truncate block" style={{ color: 'var(--text-primary)' }}>
                                {s.username || 'Perfil'}
                              </span>
                            </div>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary py-1 px-2.5 text-xs font-bold inline-flex items-center gap-1"
                            >
                              <ExternalLink size={12} />
                              Acessar
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 4: TRAJETÓRIA & PORTFÓLIO */}
              {modalTab === 'portfolio' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-5 rounded-2xl border space-y-3 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <FileText size={18} className="text-amber-500" />
                      Release Artístico / Biografia Integral
                    </h3>
                    {selectedAgent.biography ? (
                      <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        {selectedAgent.biography}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">O agente não cadastrou biografia artística.</p>
                    )}
                  </div>

                  <div className="p-5 rounded-2xl border space-y-3 shadow-sm" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Download size={18} className="text-amber-500" />
                      Portfólio & Material Comprobatório
                    </h3>
                    {selectedAgent.curriculum_url ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0">
                            <FileCheck size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                              Currículo Artístico em PDF Anexado
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm">
                              {selectedAgent.curriculum_url}
                            </p>
                          </div>
                        </div>

                        <a
                          href={selectedAgent.curriculum_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary py-2 px-4 text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <ExternalLink size={14} />
                          Abrir em Nova Aba ↗
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhum portfólio anexado.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 5: GOVERNANÇA & AUDITORIA */}
              {modalTab === 'governanca' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Protocolo Único SMIIC
                      </span>
                      <span className="font-mono font-bold text-sm text-amber-500">
                        {formattedProtocol}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Data de Criação
                      </span>
                      <span className="font-semibold text-xs sm:text-sm">
                        {new Date(selectedAgent.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Submissão para Análise
                      </span>
                      <span className="font-semibold text-xs sm:text-sm">
                        {selectedAgent.submitted_at
                          ? new Date(selectedAgent.submitted_at).toLocaleString('pt-BR')
                          : 'Ainda não submetido formalmente'}
                      </span>
                    </div>
                  </div>

                  {/* Termos de Uso do SMIIC */}
                  <div className="p-5 rounded-2xl border space-y-2 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                      <ShieldCheck size={16} className="text-emerald-500" />
                      Conformidade Legal & Aceite de Termos (SMIIC / LGPD)
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      O agente cultural declarou a veracidade das informações prestadas e aceitou formalmente os Termos de Uso e Política de Privacidade do Sistema Municipal de Informações e Indicadores Culturais (SMIIC) de Água Boa/MT.
                    </p>
                    <div className="pt-2 flex items-center gap-3">
                      <span className="badge badge-green text-xs font-bold py-1 px-2.5">
                        Termos Aceitos: {selectedAgent.terms_version || 'v1.0'}
                      </span>
                      {selectedAgent.terms_accepted_at && (
                        <span className="text-xs text-slate-400">
                          em {new Date(selectedAgent.terms_accepted_at).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Histórico de Revisões Anteriores */}
                  {selectedAgent.reviewed_at && (
                    <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <Clock size={15} />
                        Avaliação Anterior Registrada
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Revisado em: <strong>{new Date(selectedAgent.reviewed_at).toLocaleString('pt-BR')}</strong>
                      </p>
                      {selectedAgent.reviewer_notes && (
                        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-amber-500/20 text-xs mt-2">
                          <span className="font-bold block text-slate-500 mb-1">Parecer anterior:</span>
                          <p className="italic">{selectedAgent.reviewer_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bloco Fixo de Parecer do Avaliador (Visível em todas as abas) */}
              <div className="p-4 sm:p-5 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-primary)' }}>
                  ✍️ Parecer Técnico do Avaliador / Justificativa Municipal:
                </label>
                <textarea
                  className="input w-full resize-none text-xs sm:text-sm font-medium"
                  rows={2}
                  placeholder="Insira as observações oficiais da Secretaria. Caso solicite ajustes, aponte detalhadamente o que o agente deve corrigir..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * Este parecer ficará registrado no histórico permanente do SMIIC e será notificado ao agente cultural.
                </p>
              </div>

            </div>

            {/* Rodapé Fixo de Ação Decisória */}
            <div className="p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="btn btn-secondary w-full sm:w-auto text-xs font-bold"
              >
                Fechar Dossiê
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleReview('rejeitado')}
                  disabled={reviewLoading}
                  className="btn btn-danger flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 text-xs font-bold shadow-sm"
                >
                  <XCircle size={16} />
                  Solicitar Ajustes / Devolver
                </button>

                <button
                  type="button"
                  onClick={() => handleReview('aprovado')}
                  disabled={reviewLoading}
                  className="btn flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-6 py-2.5 text-xs font-extrabold shadow-lg transition-transform active:scale-95"
                  style={{ background: '#10b981', borderColor: '#059669', color: '#ffffff' }}
                >
                  <CheckCircle size={16} />
                  Homologar e Aprovar Agente (SMIIC)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
