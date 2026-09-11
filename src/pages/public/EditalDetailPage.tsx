import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Clock, FileText, Users, Award, CheckCircle, Download, AlertCircle } from 'lucide-react'
import { getEditalById, isEditalOpen } from '@/services/editalService'
import { useAuth } from '@/contexts/AuthContext'
import { useMyAgents } from '@/hooks/useMyAgent'
import { daysUntil, formatDateLong, safeUrl } from '@/lib/utils'
import type { Edital } from '@/types'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'

/** Colunas adicionadas por migração e ainda não refletidas em src/types. */
type PublicEdital = Edital & { document_url?: string | null; cover_url?: string | null }

function InscriptionCta({ edital }: { edital: PublicEdital }) {
  const { user, isLoading: authLoading } = useAuth()
  const location = useLocation()
  const { approvedAgents, isLoading: agentsLoading } = useMyAgents()
  const untilEnd = daysUntil(edital.end_date) ?? 0

  let body: React.ReactNode
  if (authLoading || (user && agentsLoading)) {
    body = <Spinner size={20} />
  } else if (!user) {
    body = (
      <>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Entre na sua conta para se inscrever. Ainda não tem cadastro? Crie um agora.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/login" state={{ from: location }} className="btn btn-primary">
            Entrar e inscrever-se
          </Link>
          <Link to="/cadastro" state={{ from: location }} className="btn btn-secondary">
            Criar conta
          </Link>
        </div>
      </>
    )
  } else if (approvedAgents.length === 0) {
    body = (
      <>
        <p className="text-sm mb-5 flex items-start gap-2 justify-center text-left max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} aria-hidden="true" />
          <span>Para se inscrever, seu cadastro de agente cultural precisa estar aprovado.</span>
        </p>
        <Link to="/painel/agentes" className="btn btn-primary">
          Meus agentes culturais
        </Link>
      </>
    )
  } else {
    body = (
      <>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Seu cadastro está aprovado. Você já pode enviar sua inscrição.
        </p>
        <Link to={`/painel/inscricoes/nova/${edital.id}`} className="btn btn-primary">
          Fazer minha inscrição
        </Link>
      </>
    )
  }

  return (
    <div
      className="card p-6 text-center"
      style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.05))', borderColor: 'rgba(245,158,11,0.2)' }}
    >
      <FileText className="mx-auto h-10 w-10 text-amber-500 mb-3" aria-hidden="true" />
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        {untilEnd === 0 ? 'Último dia para se inscrever' : `${untilEnd} dia${untilEnd === 1 ? '' : 's'} para se inscrever`}
      </h2>
      {body}
    </div>
  )
}

export function EditalDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['edital', id],
    queryFn: () => getEditalById(id!),
    enabled: !!id,
  })
  const edital = data as PublicEdital | null | undefined

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="skeleton h-6 w-32 mb-8" />
        <div className="card p-8 space-y-4" aria-busy="true">
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    )
  }

  if (!edital) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          icon={FileText}
          title="Edital não encontrado"
          description="O edital pode ter sido removido ou o endereço está incorreto."
          action={<Link to="/editais" className="btn btn-primary">Ver todos os editais</Link>}
        />
      </div>
    )
  }

  const open = isEditalOpen(edital)
  const untilEnd = daysUntil(edital.end_date)
  const untilStart = daysUntil(edital.start_date)
  const opensLater = !open && edital.status === 'PUBLICADO' && untilStart !== null && untilStart > 0
  const documentUrl = safeUrl(edital.document_url)

  const info: { icon: typeof Calendar; label: string; value: string; highlight?: boolean }[] = [
    { icon: Calendar, label: 'Início', value: formatDateLong(edital.start_date) },
    { icon: Clock, label: 'Prazo', value: formatDateLong(edital.end_date), highlight: open && untilEnd !== null && untilEnd <= 7 },
  ]
  if (edital.total_slots) info.push({ icon: Users, label: 'Vagas', value: String(edital.total_slots) })
  if (edital.prize_value) info.push({ icon: Award, label: 'Valor', value: `R$ ${edital.prize_value.toLocaleString('pt-BR')}` })

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <Link to="/editais" className="inline-flex items-center gap-2 text-sm mb-8 hover:text-amber-600 dark:hover:text-amber-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar aos editais
      </Link>

      {/* Header */}
      <article className="card overflow-hidden mb-6">
        {edital.cover_url && (
          <img
            src={edital.cover_url}
            alt={`Capa do edital ${edital.title}`}
            className="w-full max-h-72 object-cover"
            decoding="async"
          />
        )}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {open ? (
              <span className="badge badge-green">
                <span className="h-2 w-2 rounded-full bg-current inline-block" aria-hidden="true" />
                Inscrições abertas
              </span>
            ) : opensLater ? (
              <span className="badge badge-blue">Abre em {untilStart} dia{untilStart === 1 ? '' : 's'}</span>
            ) : (
              <span className="badge badge-slate">Encerrado</span>
            )}
            {edital.categories && (
              <span className="badge badge-amber">
                {edital.categories.icon} {edital.categories.name}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{edital.title}</h1>

          <p className="text-sm leading-relaxed mb-6 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
            {edital.description}
          </p>

          {/* Key info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {info.map(({ icon: Icon, label, value, highlight }) => (
              <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-secondary)' }}>
                <Icon className="mx-auto mb-1 h-5 w-5 text-amber-500" aria-hidden="true" />
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-sm font-semibold" style={{ color: highlight ? 'var(--error)' : 'var(--text-primary)' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {documentUrl && (
            <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Edital completo</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Baixe o documento oficial com todas as regras e anexos.</p>
              </div>
              <a href={documentUrl} target="_blank" rel="noopener noreferrer" download className="btn btn-secondary">
                <Download size={16} aria-hidden="true" />
                Baixar edital
              </a>
            </div>
          )}
        </div>
      </article>

      {/* Requirements */}
      {edital.requirements && (
        <section className="card p-6 mb-6" aria-labelledby="requisitos">
          <h2 id="requisitos" className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CheckCircle className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Requisitos e documentos
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {edital.requirements}
          </p>
        </section>
      )}

      {/* CTA */}
      {open && <InscriptionCta edital={edital} />}
    </div>
  )
}
