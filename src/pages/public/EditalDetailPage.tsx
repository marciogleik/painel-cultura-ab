import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getEditalById } from '@/services/editalService'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Calendar, Clock, FileText, Users, Award, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function EditalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isArtista } = useAuth()

  const { data: edital, isLoading } = useQuery({
    queryKey: ['edital', id],
    queryFn: () => getEditalById(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="skeleton h-6 w-32 mb-8" />
        <div className="card p-8 space-y-4">
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    )
  }

  if (!edital) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Edital não encontrado</h1>
        <Link to="/editais" className="btn btn-primary">Ver todos os editais</Link>
      </div>
    )
  }

  const daysLeft = Math.ceil(
    (new Date(edital.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const isOpen = edital.status === 'PUBLICADO' && daysLeft > 0

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <Link to="/editais" className="inline-flex items-center gap-2 text-sm mb-8 hover:text-amber-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="h-4 w-4" />
        Voltar aos editais
      </Link>

      {/* Header */}
      <div className="card p-6 sm:p-8 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {isOpen ? (
            <span className="badge badge-green">
              <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
              Inscrições abertas
            </span>
          ) : (
            <span className="badge badge-red">Encerrado</span>
          )}
          {(edital as any).categories && (
            <span className="badge badge-amber">
              {(edital as any).categories.icon} {(edital as any).categories.name}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">{edital.title}</h1>

        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
          {edital.description}
        </p>

        {/* Key info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              icon: Calendar,
              label: 'Início',
              value: formatDate(edital.start_date),
            },
            {
              icon: Clock,
              label: 'Prazo',
              value: formatDate(edital.end_date),
              highlight: daysLeft <= 7,
            },
            ...(edital.total_slots
              ? [{ icon: Users, label: 'Vagas', value: String(edital.total_slots) }]
              : []),
            ...(edital.prize_value
              ? [{ icon: Award, label: 'Valor', value: `R$ ${edital.prize_value.toLocaleString('pt-BR')}` }]
              : []),
          ].map(({ icon: Icon, label, value, highlight }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-secondary)' }}>
              <Icon className="mx-auto mb-1 h-5 w-5 text-amber-400" />
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className={`text-sm font-semibold ${highlight ? 'text-red-400' : 'text-slate-900 dark:text-white'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Requirements */}
      {edital.requirements && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-amber-400" />
            Requisitos e Documentos
          </h2>
          <div className="prose prose-sm prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
              {edital.requirements}
            </pre>
          </div>
        </div>
      )}

      {/* CTA */}
      {isOpen && (
        <div className="card p-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.05))', borderColor: 'rgba(245,158,11,0.2)' }}>
          <FileText className="mx-auto h-10 w-10 text-amber-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {daysLeft} dias para se inscrever
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            Você precisa ter um perfil de artista cadastrado para se inscrever.
          </p>
          {user && isArtista ? (
            <Link to={`/painel/inscricoes/nova/${edital.id}`} className="btn btn-primary">
              Fazer minha Inscrição
            </Link>
          ) : user ? (
            <Link to="/painel/agentes/cadastrar" className="btn btn-primary">
              Cadastrar Agente Cultural (SMIIC)
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={`/cadastro?redirect=/editais/${id}`} className="btn btn-primary">
                Cadastrar e Inscrever-se
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Já tenho conta
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
