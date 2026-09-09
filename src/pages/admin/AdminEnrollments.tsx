import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import {
  ClipboardList, Search, Eye, CheckCircle, XCircle, Printer,
  X, User, Phone, MapPin, Calendar, Shield, ChevronDown,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
}

const STATUS_BADGE: Record<string, string> = {
  PENDENTE: 'badge-amber',
  CONFIRMADA: 'badge-green',
  CANCELADA: 'badge-red',
}

export function AdminEnrollments() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [workshopFilter, setWorkshopFilter] = useState('ALL')
  const [selected, setSelected] = useState<any>(null)
  const [adminNotes, setAdminNotes] = useState('')

  // Oficinas para filtro
  const { data: workshops } = useQuery({
    queryKey: ['workshops_filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cultural_workshops')
        .select('id, title')
        .order('title')
      return data ?? []
    },
  })

  // Matrículas
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['workshop_enrollments', statusFilter, workshopFilter],
    queryFn: async () => {
      let query = supabase
        .from('workshop_enrollments')
        .select('*, cultural_workshops(title)')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'ALL') query = query.eq('status', statusFilter)
      if (workshopFilter !== 'ALL') query = query.eq('workshop_id', workshopFilter)

      const { data } = await query
      return data ?? []
    },
  })

  // Atualizar status
  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      await supabase
        .from('workshop_enrollments')
        .update({ status, admin_notes: notes })
        .eq('id', id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workshop_enrollments'] })
      setSelected(null)
    },
  })

  // Filtro local por nome
  const filtered = enrollments?.filter((e: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.student_name?.toLowerCase().includes(q) ||
      e.guardian_name?.toLowerCase().includes(q) ||
      e.workshop_name?.toLowerCase().includes(q)
    )
  })


  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ClipboardList size={24} style={{ color: 'var(--accent)' }} />
            Fichas de Matrícula
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Oficinas Culturais e Escolinhas Esportivas
          </p>
        </div>
        <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
          <p>{filtered?.length ?? 0} ficha(s)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por aluno, responsável ou oficina..."
            className="input pl-10 w-full"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input pr-8 appearance-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        </div>

        {/* Workshop filter */}
        <div className="relative">
          <select
            value={workshopFilter}
            onChange={e => setWorkshopFilter(e.target.value)}
            className="input pr-8 appearance-none"
          >
            <option value="ALL">Todas as Oficinas</option>
            {workshops?.map((ws: any) => (
              <option key={ws.id} value={ws.id}>{ws.title}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['ALL', 'PENDENTE', 'CONFIRMADA', 'CANCELADA'].map(s => {
          const count = s === 'ALL'
            ? enrollments?.length
            : enrollments?.filter((e: any) => e.status === s).length
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`badge cursor-pointer transition-all ${statusFilter === s
                ? s === 'ALL' ? 'badge-blue' : STATUS_BADGE[s] ?? 'badge-amber'
                : 'badge-slate opacity-60'}`}
            >
              {s === 'ALL' ? 'Todas' : STATUS_LABELS[s]} ({count ?? 0})
            </button>
          )
        })}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 rounded-xl skeleton" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="rounded-2xl border overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'var(--bg-secondary)' }}>
                <tr>
                  {['Aluno', 'Oficina/Escolinha', 'Responsável', 'Data', 'Status', 'Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((enrollment: any) => (
                  <tr
                    key={enrollment.id}
                    className="border-t transition-colors hover:bg-amber-500/5 cursor-pointer"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                    onClick={() => { setSelected(enrollment); setAdminNotes(enrollment.admin_notes ?? '') }}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {enrollment.student_name}
                      </p>
                      {enrollment.age && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{enrollment.age} anos</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {enrollment.workshop_name ?? enrollment.cultural_workshops?.title ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <p>{enrollment.guardian_name ?? '—'}</p>
                      {enrollment.phone && <p style={{ color: 'var(--text-muted)' }}>{enrollment.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(enrollment.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${STATUS_BADGE[enrollment.status] ?? 'badge-slate'}`}>
                        {STATUS_LABELS[enrollment.status] ?? enrollment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(enrollment); setAdminNotes(enrollment.admin_notes ?? '') }}
                        className="btn btn-ghost text-xs py-1 px-2"
                        title="Ver detalhes"
                      >
                        <Eye size={14} /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
          <ClipboardList size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhuma ficha encontrada</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {search || statusFilter !== 'ALL' ? 'Tente ajustar os filtros' : 'As fichas submetidas aparecerão aqui'}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div
            className="w-full max-w-2xl rounded-2xl shadow-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  Ficha de Matrícula
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Enviada em {formatDate(selected.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="btn btn-secondary text-xs py-1.5 gap-1"
                >
                  <Printer size={14} /> Imprimir
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto" id="print-modal">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`badge ${STATUS_BADGE[selected.status] ?? 'badge-slate'}`}>
                  {STATUS_LABELS[selected.status] ?? selected.status}
                </span>
                {selected.image_authorization && (
                  <span className="badge badge-green flex items-center gap-1">
                    <Shield size={12} /> Imagem Autorizada
                  </span>
                )}
              </div>

              {/* Dados da Inscrição */}
              <ModalSection icon={<Calendar size={15} />} title="Dados da Inscrição">
                <DetailGrid>
                  <DetailItem label="Data da Inscrição" value={selected.enrollment_date ? new Date(selected.enrollment_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} />
                  <DetailItem label="Período" value={selected.period} />
                  <DetailItem label="Oficina / Escolinha" value={selected.workshop_name} span2 />
                  <DetailItem label="Instrutor" value={selected.instructor} />
                  <DetailItem label="Dias e Horários" value={selected.schedule} />
                  <DetailItem label="Local" value={selected.location} span2 />
                </DetailGrid>
              </ModalSection>

              {/* Dados do Aluno */}
              <ModalSection icon={<User size={15} />} title="Dados do Aluno">
                <DetailGrid>
                  <DetailItem label="Nome Completo" value={selected.student_name} span2 />
                  <DetailItem label="Escola" value={selected.school} span2 />
                  <DetailItem label="Ano/Série" value={selected.grade} />
                  <DetailItem label="Período Escolar" value={selected.school_period} />
                  <DetailItem label="Idade" value={selected.age ? `${selected.age} anos` : undefined} />
                </DetailGrid>
              </ModalSection>

              {/* Dados do Responsável */}
              <ModalSection icon={<Phone size={15} />} title="Dados do Responsável">
                <DetailGrid>
                  <DetailItem label="Nome do Responsável" value={selected.guardian_name} span2 />
                  <DetailItem label="Telefone" value={selected.phone} />
                  <DetailItem label="Endereço" value={selected.address} span2 />
                </DetailGrid>
              </ModalSection>

              {/* Autorização de busca */}
              <ModalSection icon={<MapPin size={15} />} title="Autorização de Busca">
                <DetailGrid>
                  <DetailItem
                    label="Acompanhado por responsável"
                    value={selected.accompanied_by_guardian ? 'Sim' : 'Não'}
                  />
                  <DetailItem label="Pessoa Autorizada para Buscar" value={selected.authorized_person} span2 />
                </DetailGrid>
              </ModalSection>

              {/* Termo de Imagem */}
              <ModalSection icon={<Shield size={15} />} title="Termo de Imagem e Voz" accent>
                <DetailGrid>
                  <DetailItem label="Nome do Responsável (Termo)" value={selected.image_auth_guardian_name} span2 />
                  <DetailItem label="CPF do Responsável" value={selected.image_auth_guardian_cpf} />
                  <DetailItem
                    label="Autorização concedida"
                    value={selected.image_authorization ? '✓ Sim — Autorizado eletronicamente' : '✗ Não autorizado'}
                  />
                </DetailGrid>
              </ModalSection>

              {/* Admin notes + actions */}
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Observações Internas
                </label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={2}
                  className="input w-full text-sm"
                  placeholder="Anotações internas sobre esta matrícula..."
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateMutation.mutate({ id: selected.id, status: 'CONFIRMADA', notes: adminNotes })}
                    disabled={updateMutation.isPending || selected.status === 'CONFIRMADA'}
                    className="btn btn-primary text-xs py-1.5 gap-1 flex-1"
                  >
                    <CheckCircle size={14} /> Confirmar Matrícula
                  </button>
                  <button
                    onClick={() => updateMutation.mutate({ id: selected.id, status: 'CANCELADA', notes: adminNotes })}
                    disabled={updateMutation.isPending || selected.status === 'CANCELADA'}
                    className="btn btn-danger text-xs py-1.5 gap-1 flex-1"
                  >
                    <XCircle size={14} /> Cancelar Matrícula
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-modal { display: block !important; position: fixed; top: 0; left: 0; width: 100%; background: white; color: black; padding: 2rem; }
        }
      `}</style>
    </div>
  )
}

// ─── HELPER COMPONENTS ──────────────────────────────────────────────────────

function ModalSection({
  icon, title, children, accent,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: accent ? 'rgba(245,158,11,0.3)' : 'var(--border)' }}>
      <div
        className="flex items-center gap-2 px-4 py-2 border-b text-xs font-semibold uppercase tracking-wide"
        style={{
          background: accent ? 'rgba(245,158,11,0.08)' : 'var(--bg-secondary)',
          borderColor: accent ? 'rgba(245,158,11,0.2)' : 'var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        {title}
      </div>
      <div className="p-4" style={{ background: 'var(--bg-card)' }}>
        {children}
      </div>
    </div>
  )
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
}

function DetailItem({
  label, value, span2,
}: {
  label: string
  value?: string | null
  span2?: boolean
}) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {value ?? '—'}
      </p>
    </div>
  )
}
