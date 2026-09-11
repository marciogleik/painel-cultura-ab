import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Eye, CheckCircle, XCircle, Printer, User, Phone, MapPin, Calendar, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { errorMessage, formatDate, formatDateTime, formatPhone, formatCPF, whatsappLink } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { useConfirm, LoadingButton } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { AdminTable, IconButton, type AdminColumn } from '@/components/admin/AdminTable'

type EnrollmentStatus = 'PENDENTE' | 'CONFIRMADA' | 'CANCELADA'

interface Enrollment {
  id: string
  workshop_id: string | null
  enrollment_date: string | null
  period: string | null
  workshop_name: string | null
  instructor: string | null
  schedule: string | null
  location: string | null
  student_name: string
  school: string | null
  grade: string | null
  school_period: string | null
  age: number | null
  guardian_name: string | null
  phone: string | null
  guardian_work_phone: string | null
  address: string | null
  accompanied_by_guardian: boolean
  authorized_person: string | null
  image_authorization: boolean
  image_auth_guardian_name: string | null
  image_auth_guardian_cpf: string | null
  status: EnrollmentStatus
  admin_notes: string | null
  created_at: string
  cultural_workshops?: { title: string } | null
}

const STATUS_LABELS: Record<EnrollmentStatus, string> = { PENDENTE: 'Pendente', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada' }
const STATUS_BADGE: Record<EnrollmentStatus, string> = { PENDENTE: 'badge-amber', CONFIRMADA: 'badge-green', CANCELADA: 'badge-red' }
const PERIOD_LABELS: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }

type StatusFilter = EnrollmentStatus | 'ALL'

export function AdminEnrollments() {
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [workshopFilter, setWorkshopFilter] = useState('ALL')
  const [selected, setSelected] = useState<Enrollment | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  const { data: workshops } = useQuery({
    queryKey: ['workshops_filter'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cultural_workshops').select('id, title').order('title')
      if (error) throw error
      return (data ?? []) as { id: string; title: string }[]
    },
  })

  const enrollmentsQuery = useQuery({
    queryKey: ['workshop_enrollments', workshopFilter],
    queryFn: async () => {
      let q = supabase.from('workshop_enrollments').select('*, cultural_workshops(title)').order('created_at', { ascending: false })
      if (workshopFilter !== 'ALL') q = q.eq('workshop_id', workshopFilter)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Enrollment[]
    },
  })
  const enrollments = useMemo(() => enrollmentsQuery.data ?? [], [enrollmentsQuery.data])

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: EnrollmentStatus; notes: string }) => {
      const { error } = await supabase.from('workshop_enrollments').update({ status, admin_notes: notes.trim() || null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['workshop_enrollments'] })
      toast.success(vars.status === 'CONFIRMADA' ? 'Matrícula confirmada.' : vars.status === 'CANCELADA' ? 'Matrícula cancelada.' : 'Ficha atualizada.')
      setSelected(null)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enrollments.filter((e) => {
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false
      if (!q) return true
      const workshop = e.workshop_name ?? e.cultural_workshops?.title ?? ''
      return [e.student_name, e.guardian_name ?? '', workshop].some((v) => v.toLowerCase().includes(q))
    })
  }, [enrollments, search, statusFilter])

  function openDetail(e: Enrollment) {
    setSelected(e)
    setAdminNotes(e.admin_notes ?? '')
  }

  async function onCancel() {
    if (!selected) return
    const ok = await confirm({ title: 'Cancelar esta matrícula?', message: `A ficha de ${selected.student_name} será marcada como cancelada.`, danger: true, confirmLabel: 'Cancelar matrícula', cancelLabel: 'Voltar' })
    if (ok) updateMutation.mutate({ id: selected.id, status: 'CANCELADA', notes: adminNotes })
  }

  const columns: AdminColumn<Enrollment>[] = [
    {
      key: 'student', header: 'Aluno(a)',
      render: (e) => (
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{e.student_name}</p>
          {e.age != null && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.age} anos</p>}
        </div>
      ),
    },
    { key: 'workshop', header: 'Oficina', render: (e) => e.workshop_name ?? e.cultural_workshops?.title ?? '—' },
    { key: 'period', header: 'Período', render: (e) => (e.period ? PERIOD_LABELS[e.period] ?? e.period : '—') },
    {
      key: 'guardian', header: 'Responsável',
      render: (e) => (
        <div>
          <p>{e.guardian_name ?? '—'}</p>
          {e.phone && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatPhone(e.phone)}</p>}
        </div>
      ),
    },
    { key: 'date', header: 'Enviada em', render: (e) => formatDate(e.created_at) },
    { key: 'status', header: 'Status', render: (e) => <span className={`badge text-xs ${STATUS_BADGE[e.status] ?? 'badge-slate'}`}>{STATUS_LABELS[e.status] ?? e.status}</span> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, align: 'right', render: (e) => <IconButton label={`Ver ficha de ${e.student_name}`} tone="primary" onClick={() => openDetail(e)}><Eye size={15} /></IconButton> },
  ]

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { ALL: enrollments.length, PENDENTE: 0, CONFIRMADA: 0, CANCELADA: 0 }
    enrollments.forEach((e) => { c[e.status] = (c[e.status] ?? 0) + 1 })
    return c
  }, [enrollments])

  return (
    <div className="animate-fade-in">
      <PageHeader icon={ClipboardList} title="Fichas de Matrícula" description={`${filtered.length} ficha(s) · oficinas culturais e escolinhas`} />

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por aluno, responsável ou oficina" label="Buscar fichas" className="flex-1" />
        <div>
          <label htmlFor="enroll-workshop" className="sr-only">Filtrar por oficina</label>
          <select id="enroll-workshop" value={workshopFilter} onChange={(e) => setWorkshopFilter(e.target.value)} className="input">
            <option value="ALL">Todas as oficinas</option>
            {workshops?.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filtrar por status">
        {(['ALL', 'PENDENTE', 'CONFIRMADA', 'CANCELADA'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={statusFilter === s}
            onClick={() => setStatusFilter(s)}
            className={`badge cursor-pointer transition-all ${statusFilter === s ? (s === 'ALL' ? 'badge-blue' : STATUS_BADGE[s]) : 'badge-slate opacity-60'}`}
          >
            {s === 'ALL' ? 'Todas' : STATUS_LABELS[s]} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {enrollmentsQuery.isLoading ? (
        <SkeletonList rows={4} />
      ) : enrollmentsQuery.error ? (
        <ErrorState error={enrollmentsQuery.error} onRetry={() => enrollmentsQuery.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhuma ficha encontrada" description={search || statusFilter !== 'ALL' || workshopFilter !== 'ALL' ? 'Tente ajustar os filtros.' : 'As fichas enviadas pelo site aparecerão aqui.'} />
      ) : (
        <AdminTable columns={columns} rows={filtered} caption="Fichas de matrícula" onRowClick={openDetail} />
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Ficha de matrícula"
        description={selected ? `Enviada em ${formatDateTime(selected.created_at)}` : undefined}
        size="lg"
        locked={updateMutation.isPending}
        footer={selected && (
          <>
            <button type="button" onClick={() => window.print()} className="btn btn-secondary mr-auto"><Printer size={14} /> Imprimir</button>
            {isAdmin ? (
              <>
                <LoadingButton type="button" className="btn btn-danger" loading={updateMutation.isPending} disabled={selected.status === 'CANCELADA'} onClick={onCancel}>
                  <XCircle size={14} /> Cancelar matrícula
                </LoadingButton>
                <LoadingButton type="button" className="btn btn-primary" loading={updateMutation.isPending} disabled={selected.status === 'CONFIRMADA'} onClick={() => updateMutation.mutate({ id: selected.id, status: 'CONFIRMADA', notes: adminNotes })}>
                  <CheckCircle size={14} /> Confirmar matrícula
                </LoadingButton>
              </>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Fechar</button>
            )}
          </>
        )}
      >
        {selected && (
          <div id="print-modal" className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${STATUS_BADGE[selected.status] ?? 'badge-slate'}`}>{STATUS_LABELS[selected.status] ?? selected.status}</span>
              {selected.image_authorization && <span className="badge badge-green inline-flex items-center gap-1"><Shield size={12} /> Uso de imagem autorizado</span>}
            </div>

            <div className="rounded-xl border p-4 print:hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <label htmlFor="enroll-notes" className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>Observações internas</label>
              <textarea
                id="enroll-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                className="input w-full text-sm"
                placeholder="Anotações internas sobre esta matrícula"
                readOnly={!isAdmin}
              />
              {!isAdmin && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Somente administradores podem alterar o status da matrícula.</p>}
            </div>

            <Section icon={<Calendar size={15} />} title="Dados da inscrição">
              <DetailGrid>
                <DetailItem label="Data da inscrição" value={formatDate(selected.enrollment_date)} />
                <DetailItem label="Período" value={selected.period ? PERIOD_LABELS[selected.period] ?? selected.period : null} />
                <DetailItem label="Oficina / escolinha" value={selected.workshop_name ?? selected.cultural_workshops?.title} span2 />
                <DetailItem label="Instrutor(a)" value={selected.instructor} />
                <DetailItem label="Dias e horários" value={selected.schedule} />
                <DetailItem label="Local" value={selected.location} span2 />
              </DetailGrid>
            </Section>

            <Section icon={<User size={15} />} title="Dados do aluno(a)">
              <DetailGrid>
                <DetailItem label="Nome completo" value={selected.student_name} span2 />
                <DetailItem label="Escola" value={selected.school} span2 />
                <DetailItem label="Ano/série" value={selected.grade} />
                <DetailItem label="Período escolar" value={selected.school_period} />
                <DetailItem label="Idade" value={selected.age != null ? `${selected.age} anos` : null} />
              </DetailGrid>
            </Section>

            <Section icon={<Phone size={15} />} title="Dados do responsável">
              <DetailGrid>
                <DetailItem label="Nome do responsável" value={selected.guardian_name} span2 />
                <DetailItem label="Telefone" value={selected.phone ? formatPhone(selected.phone) : null} link={whatsappLink(selected.phone)} linkLabel="WhatsApp" />
                <DetailItem label="Telefone do trabalho" value={selected.guardian_work_phone ? formatPhone(selected.guardian_work_phone) : null} />
                <DetailItem label="Endereço" value={selected.address} span2 />
              </DetailGrid>
            </Section>

            <Section icon={<MapPin size={15} />} title="Autorização de busca">
              <DetailGrid>
                <DetailItem label="Acompanhado por responsável" value={selected.accompanied_by_guardian ? 'Sim' : 'Não'} />
                <DetailItem label="Pessoa autorizada a buscar" value={selected.authorized_person} span2 />
              </DetailGrid>
            </Section>

            <Section icon={<Shield size={15} />} title="Termo de uso de imagem e voz" accent>
              <DetailGrid>
                <DetailItem label="Nome do responsável (termo)" value={selected.image_auth_guardian_name} span2 />
                <DetailItem label="CPF do responsável" value={selected.image_auth_guardian_cpf ? formatCPF(selected.image_auth_guardian_cpf) : null} />
                <DetailItem label="Autorização" value={selected.image_authorization ? 'Concedida eletronicamente' : 'Não autorizado'} />
              </DetailGrid>
            </Section>

          </div>
        )}
      </Modal>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-modal, #print-modal * { visibility: visible; }
          #print-modal { position: absolute; inset: 0; width: 100%; height: auto; overflow: visible; padding: 1.5rem; background: #fff; color: #000; }
        }
      `}</style>
    </div>
  )
}

function Section({ icon, title, children, accent }: { icon: ReactNode; title: string; children: ReactNode; accent?: boolean }) {
  return (
    <section className="rounded-xl border overflow-hidden" style={{ borderColor: accent ? 'rgba(245,158,11,0.3)' : 'var(--border)' }}>
      <h3
        className="flex items-center gap-2 px-4 py-2 border-b text-xs font-semibold uppercase tracking-wide"
        style={{ background: accent ? 'rgba(245,158,11,0.08)' : 'var(--bg-secondary)', borderColor: accent ? 'rgba(245,158,11,0.2)' : 'var(--border)', color: 'var(--text-secondary)' }}
      >
        <span style={{ color: 'var(--accent)' }} aria-hidden="true">{icon}</span>
        {title}
      </h3>
      <div className="p-4" style={{ background: 'var(--bg-card)' }}>{children}</div>
    </section>
  )
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">{children}</dl>
}

function DetailItem({ label, value, span2, link, linkLabel }: { label: string; value?: string | null; span2?: boolean; link?: string | null; linkLabel?: string }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="text-sm flex items-center gap-2" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {value || '—'}
        {value && link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline print:hidden" style={{ color: 'var(--accent)' }}>{linkLabel ?? 'Abrir'}</a>
        )}
      </dd>
    </div>
  )
}
