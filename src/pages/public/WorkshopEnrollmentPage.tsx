import { useState, useEffect, useId, cloneElement, isValidElement, type ReactElement, type ReactNode, type AriaAttributes } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { errorMessage, todayISO, formatDate } from '@/lib/utils'
import {
  ClipboardList, CheckCircle2, ChevronRight, User,
  Phone, MapPin, Shield, AlertCircle, Printer, ArrowLeft,
  Calendar,
} from 'lucide-react'

interface WorkshopOption {
  id: string
  title: string
  instructor: string | null
  schedule: string | null
  location: string | null
  category: string | null
  vacancies: number | null
}

/** Imprime apenas a ficha (#print-area), sem esconder o restante da árvore do DOM. */
const PRINT_CSS = `
  @media print {
    body * { visibility: hidden; }
    #print-area, #print-area * { visibility: visible; }
    #print-area { position: absolute; left: 0; top: 0; width: 100%; }
  }
`

interface EnrollmentFormData {
  // Dados da inscrição
  enrollment_date: string
  period: string
  workshop_id: string
  workshop_name: string
  instructor: string
  schedule: string
  location: string
  // Dados do aluno
  student_name: string
  school: string
  grade: string
  school_period: string
  age: string
  cpf?: string
  // Dados do responsável
  guardian_name: string
  phone: string
  guardian_work_phone: string
  address: string
  // Autorização de busca
  accompanied_by_guardian: boolean
  authorized_person: string
  // Termo de imagem
  image_authorization: boolean
  image_auth_guardian_name: string
  image_auth_guardian_cpf: string
}

export function WorkshopEnrollmentPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [submittedData, setSubmittedData] = useState<EnrollmentFormData | null>(null)
  const [accompanied, setAccompanied] = useState(true)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<EnrollmentFormData>({
    defaultValues: {
      enrollment_date: todayISO(),
      accompanied_by_guardian: true,
      image_authorization: false,
    },
  })

  // Estados para busca de rematrícula
  const [searchStudent, setSearchStudent] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const handleSearch = async () => {
    if (!searchStudent || !searchPhone) {
      setSearchError('Preencha o nome do aluno e o telefone para buscar')
      return
    }
    setIsSearching(true)
    setSearchError('')
    try {
      const { data, error } = await supabase.rpc('find_my_enrollment', {
        p_student_name: searchStudent,
        p_phone: searchPhone
      })
      if (error) throw error
      if (!data || data.length === 0) {
        setSearchError('Matrícula anterior não encontrada. Verifique os dados ou preencha manualmente.')
      } else {
        const prev = data[0]
        setValue('student_name', prev.student_name)
        setValue('school', prev.school || '')
        setValue('school_period', prev.school_period || '')
        setValue('guardian_name', prev.guardian_name || '')
        setValue('phone', prev.phone || '')
        setValue('address', prev.address || '')
        setValue('authorized_person', prev.authorized_person || '')
        setValue('accompanied_by_guardian', prev.accompanied_by_guardian)
        setAccompanied(prev.accompanied_by_guardian)
        setValue('image_authorization', prev.image_authorization)
        setValue('image_auth_guardian_name', prev.image_auth_guardian_name || '')
        setValue('image_auth_guardian_cpf', prev.image_auth_guardian_cpf || '')
        
        toast.success('Dados recuperados com sucesso! Atualize a idade, a série e a oficina desejada.')
      }
    } catch (err: any) {
      setSearchError('Erro ao buscar matrícula: ' + err.message)
    } finally {
      setIsSearching(false)
    }
  }

  // Carregar lista de oficinas
  const { data: workshops } = useQuery({
    queryKey: ['workshops_for_enrollment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cultural_workshops')
        .select('id, title, instructor, schedule, location, category, vacancies')
        .eq('is_active', true)
        .order('title')
      if (error) throw error
      return (data ?? []) as WorkshopOption[]
    },
  })

  // Pré-selecionar oficina se vier pela URL
  const selectedWorkshopId = watch('workshop_id')
  useEffect(() => {
    if (id && workshops) {
      const ws = workshops.find((w) => w.id === id)
      if (ws) {
        setValue('workshop_id', ws.id)
        setValue('workshop_name', ws.title)
        setValue('instructor', ws.instructor ?? '')
        setValue('schedule', ws.schedule ?? '')
        setValue('location', ws.location ?? '')
      }
    }
  }, [id, workshops, setValue])

  // Auto-preencher campos ao selecionar oficina
  useEffect(() => {
    if (selectedWorkshopId && workshops) {
      const ws = workshops.find((w) => w.id === selectedWorkshopId)
      if (ws) {
        setValue('workshop_name', ws.title)
        setValue('instructor', ws.instructor ?? '')
        setValue('schedule', ws.schedule ?? '')
        setValue('location', ws.location ?? '')
      }
    }
  }, [selectedWorkshopId, workshops, setValue])

  const mutation = useMutation({
    mutationFn: async (data: EnrollmentFormData) => {
      // A7: Check if workshop has vacancies
      if (data.workshop_id) {
        const ws = workshops?.find((w) => w.id === data.workshop_id)
        if (ws && typeof ws.vacancies === 'number' && ws.vacancies <= 0) {
          throw new Error('Esta oficina não possui vagas disponíveis no momento.')
        }
      }

      // B10: Validate CPF loosely and Phone loosely
      if (data.cpf && !/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(data.cpf)) {
        throw new Error('CPF com formato inválido')
      }
      if (!/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(data.phone)) {
        throw new Error('Telefone com formato inválido')
      }
      
      const payload = {
        ...data,
        age: data.age ? parseInt(data.age, 10) : null,
        workshop_id: data.workshop_id || null,
        accompanied_by_guardian: accompanied,
      }
      const { error } = await supabase.from('workshop_enrollments').insert(payload)
      if (error) throw error
      return payload
    },
    onSuccess: (_, variables) => {
      setSubmittedData({ ...variables, accompanied_by_guardian: accompanied })
      setStep('success')
      toast.success('Ficha de matrícula enviada com sucesso!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err, 'Erro ao enviar a ficha. Verifique os campos e tente novamente.'))
    },
  })

  function onSubmit(data: EnrollmentFormData) {
    mutation.mutate(data)
  }

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // ─── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (step === 'success' && submittedData) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="mx-auto max-w-2xl px-4 py-16">
          {/* Success card */}
          <div className="rounded-2xl border text-center p-10 animate-slide-up"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Ficha enviada com sucesso!
            </h1>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              A ficha de matrícula de <strong>{submittedData?.student_name}</strong> foi registrada.
              <br />
              <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                Havendo vagas, entraremos em contato pelo número fornecido.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button type="button" onClick={() => window.print()}
                className="btn btn-secondary gap-2">
                <Printer size={16} aria-hidden="true" /> Imprimir Ficha
              </button>
              <button type="button" onClick={() => navigate('/oficinas')}
                className="btn btn-primary gap-2">
                <ArrowLeft size={16} aria-hidden="true" /> Voltar às Oficinas
              </button>
            </div>
          </div>

          {/* Printable version */}
          <div id="print-area" className="mt-8 rounded-2xl border p-8 print:block"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <PrintableEnrollment data={submittedData} workshops={workshops ?? []} today={today} />
          </div>
          <style>{PRINT_CSS}</style>
        </div>
      </div>
    )
  }

  // ─── FORM ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-inst-header)', borderBottom: '3px solid var(--accent)' }}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm mb-4 opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-inst-subtitle)' }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList size={32} style={{ color: 'var(--accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-inst-title)' }}>
              Ficha de Matrícula
            </h1>
          </div>
          <p style={{ color: 'var(--text-inst-subtitle)' }}>
            Oficinas Culturais e Escolinhas Esportivas · Secretaria Municipal de Esporte, Cultura e Lazer
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">

        {/* ── SEÇÃO DE REMATRÍCULA ── */}
        <div className="mb-8 p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <User size={20} style={{ color: 'var(--accent)' }} />
            Já foi aluno no ano passado? Puxe seus dados
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Se você fez matrícula no ano anterior, preencha os campos abaixo para buscar suas informações e agilizar o cadastro.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Nome Completo do Aluno
              </label>
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="input"
                placeholder="Ex: João da Silva"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Telefone de Contato
              </label>
              <input
                type="text"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="input"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          {searchError && (
            <p className="text-sm text-red-500 mb-4">{searchError}</p>
          )}
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="btn btn-primary w-full sm:w-auto"
          >
            {isSearching ? 'Buscando...' : 'Buscar Meus Dados'}
          </button>
        </div>
        {mutation.isError && (
          <div role="alert" className="flex items-center gap-3 p-4 mb-6 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600">
            <AlertCircle size={18} aria-hidden="true" />
            <p className="text-sm">{errorMessage(mutation.error, 'Erro ao enviar a ficha. Verifique os campos e tente novamente.')}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

          {/* ── SEÇÃO 1: DADOS DA INSCRIÇÃO ── */}
          <Section icon={<Calendar size={18} />} title="Dados da Inscrição">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Data da Inscrição" required error={errors.enrollment_date?.message}>
                <input type="date" {...register('enrollment_date', { required: 'Obrigatório' })} className="input" />
              </Field>
              <Field label="Período" error={errors.period?.message}>
                <select {...register('period')} className="input">
                  <option value="">Selecione...</option>
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noite">Noite</option>
                </select>
              </Field>
            </div>

            <Field label="Oficina / Escolinha">
              <select {...register('workshop_id')} className="input">
                <option value="">Selecione uma oficina ou preencha manualmente abaixo</option>
                {workshops?.map((ws) => (
                  <option key={ws.id} value={ws.id}>{ws.title}</option>
                ))}
              </select>
            </Field>

            <Field label="Nome da Oficina / Escolinha (texto livre)" required error={errors.workshop_name?.message}>
              <input
                {...register('workshop_name', { required: 'Obrigatório' })}
                className="input"
                placeholder="Ex: Escolinha de Futebol, Oficina de Teatro..."
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Instrutor">
                <input {...register('instructor')} className="input" placeholder="Nome do instrutor" />
              </Field>
              <Field label="Dias e Horários">
                <input {...register('schedule')} className="input" placeholder="Ex: Segundas e Quartas 14h-16h" />
              </Field>
            </div>

            <Field label="Local">
              <input {...register('location')} className="input" placeholder="Local das atividades" />
            </Field>
          </Section>

          {/* ── SEÇÃO 2: DADOS DO ALUNO ── */}
          <Section icon={<User size={18} />} title="Dados do Aluno">
            <Field label="Nome Completo do Aluno" required error={errors.student_name?.message}>
              <input
                {...register('student_name', { required: 'Nome do aluno é obrigatório' })}
                className="input"
                placeholder="Nome completo"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Field label="Escola em que Estuda">
                  <input {...register('school')} className="input" placeholder="Nome da escola" />
                </Field>
              </div>
              <Field label="Idade">
                <input
                  type="number"
                  min={0}
                  max={99}
                  {...register('age')}
                  className="input"
                  placeholder="Ex: 10"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ano / Série">
                <input {...register('grade')} className="input" placeholder="Ex: 5º Ano, 2º Série" />
              </Field>
              <Field label="Período Escolar">
                <select {...register('school_period')} className="input">
                  <option value="">Selecione...</option>
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Integral">Integral</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* ── SEÇÃO 3: DADOS DO RESPONSÁVEL ── */}
          <Section icon={<Phone size={18} />} title="Dados do Responsável">
            <Field label="Nome do Responsável" required error={errors.guardian_name?.message}>
              <input
                {...register('guardian_name', { required: 'Nome do responsável é obrigatório' })}
                className="input"
                placeholder="Nome completo"
              />
            </Field>

            <Field label="Telefone Residencial" required error={errors.phone?.message}>
              <input
                {...register('phone', { required: 'Telefone é obrigatório' })}
                className="input"
                placeholder="(xx) xxxxx-xxxx"
              />
            </Field>

            <Field label="Telefone do Trabalho">
              <input
                {...register('guardian_work_phone')}
                className="input"
                placeholder="(xx) xxxxx-xxxx — para contato alternativo"
              />
            </Field>

            <Field label="Endereço Residencial / Trabalho">
              <input
                {...register('address')}
                className="input"
                placeholder="Rua, número, bairro"
              />
            </Field>
          </Section>

          {/* ── SEÇÃO 4: AUTORIZAÇÃO DE BUSCA ── */}
          <Section icon={<MapPin size={18} />} title="Autorização de Busca">
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                O aluno virá para a atividade e irá para casa acompanhado(a) de um responsável?
              </legend>
              <div className="flex gap-6">
                <label htmlFor="accompanied-yes" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="accompanied-yes"
                    type="radio"
                    name="accompanied"
                    value="sim"
                    checked={accompanied}
                    onChange={() => setAccompanied(true)}
                    className="accent-amber-500 w-4 h-4"
                  />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Sim</span>
                </label>
                <label htmlFor="accompanied-no" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="accompanied-no"
                    type="radio"
                    name="accompanied"
                    value="nao"
                    checked={!accompanied}
                    onChange={() => setAccompanied(false)}
                    className="accent-amber-500 w-4 h-4"
                  />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Não</span>
                </label>
              </div>
            </fieldset>

            <Field label="Nome da Pessoa Autorizada para Buscar a Criança/Adolescente">
              <input
                {...register('authorized_person')}
                className="input"
                placeholder="Nome completo da pessoa autorizada"
              />
            </Field>
          </Section>

          {/* ── SEÇÃO 5: TERMO DE AUTORIZAÇÃO DE IMAGEM E VOZ ── */}
          <Section icon={<Shield size={18} />} title="Termo de Autorização de Uso de Imagem e Voz" accent>
            <div
              className="rounded-xl p-5 text-sm space-y-4 leading-relaxed max-h-96 overflow-y-auto"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <p className="font-bold text-center uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                Termo de Autorização de Uso de Imagem e Voz
              </p>

              <p style={{ color: 'var(--text-secondary)' }}>
                Eu, <span className="underline decoration-dotted px-1" style={{ color: 'var(--text-primary)' }}>
                  {watch('image_auth_guardian_name') || '___________________________________'}
                </span>, portador(a) do CPF nº <span className="underline decoration-dotted px-1" style={{ color: 'var(--text-primary)' }}>
                  {watch('image_auth_guardian_cpf') || '______________________'}
                </span>, responsável legal pelo(a) <span className="underline decoration-dotted px-1" style={{ color: 'var(--text-primary)' }}>
                  {watch('student_name') || '___________________________________'}
                </span>, inscrito(a) nas atividades/oficinas desenvolvidas pela Secretaria Municipal de Esporte, Cultura e Lazer, <strong>AUTORIZO</strong> o uso de sua imagem e voz, nos termos abaixo:
              </p>

              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>FINALIDADE</p>
                <p style={{ color: 'var(--text-secondary)' }}>A utilização da imagem e/ou voz do(a) aluno(a) será realizada exclusivamente para fins:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <li>Pedagógicos;</li>
                  <li>Institucionais;</li>
                  <li>Educacionais;</li>
                  <li>Informativos e de divulgação das atividades/oficinas culturais, esportivas e recreativas promovidas pela Secretaria Municipal de Esporte, Cultura e Lazer.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>FORMAS DE UTILIZAÇÃO</p>
                <p style={{ color: 'var(--text-secondary)' }}>A imagem e/ou voz poderão ser utilizadas nos seguintes meios institucionais:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <li>Redes sociais oficiais da Prefeitura Municipal de Água Boa e da Secretaria Municipal de Esporte, Cultura e Lazer;</li>
                  <li>Sites institucionais;</li>
                  <li>Materiais gráficos, pedagógicos e informativos;</li>
                  <li>Relatórios institucionais;</li>
                  <li>Divulgação de eventos, projetos e ações públicas;</li>
                  <li>Compartilhamentos realizados pelo(a) professor(a) responsável pela oficina, exclusivamente para divulgação institucional e pedagógica das atividades desenvolvidas, respeitando os princípios de ética, segurança e proteção da imagem do(a) aluno(a).</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>LIMITAÇÕES</p>
                <p style={{ color: 'var(--text-secondary)' }}>Fica expressamente vedado:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <li>O uso para fins comerciais;</li>
                  <li>Qualquer utilização fora das finalidades institucionais autorizadas;</li>
                  <li>Exposição que possa causar constrangimento, risco ou violação da dignidade, honra ou imagem do(a) aluno(a).</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>PROTEÇÃO DE DADOS</p>
                <p style={{ color: 'var(--text-secondary)' }}>A Secretaria Municipal de Esporte, Cultura e Lazer compromete-se a:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <li>Garantir a segurança e proteção das imagens e dados;</li>
                  <li>Utilizar as informações em conformidade com a Lei Geral de Proteção de Dados – LGPD (Lei nº 13.709/2018);</li>
                  <li>Evitar exposição excessiva, inadequada ou desnecessária.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>PRAZO E REVOGAÇÃO</p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Esta autorização terá validade durante o período de participação do(a) aluno(a) nas atividades/oficinas da Secretaria Municipal de Esporte, Cultura e Lazer, podendo ser revogada a qualquer momento mediante solicitação formal do responsável legal.
                </p>
              </div>
            </div>

            {/* Dados do responsável para o termo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="Nome do Responsável (para o Termo)">
                <input
                  {...register('image_auth_guardian_name')}
                  className="input"
                  placeholder="Nome completo do responsável"
                />
              </Field>
              <Field label="CPF do Responsável">
                <input
                  {...register('image_auth_guardian_cpf')}
                  className="input"
                  placeholder="000.000.000-00"
                />
              </Field>
            </div>

            {/* Aceite */}
            <label className="flex items-start gap-3 cursor-pointer mt-2 p-4 rounded-xl border transition-all"
              style={{
                borderColor: watch('image_authorization') ? 'var(--accent)' : 'var(--border)',
                background: watch('image_authorization') ? 'rgba(245,158,11,0.05)' : 'transparent',
              }}>
              <input
                type="checkbox"
                {...register('image_authorization')}
                className="w-5 h-5 mt-0.5 accent-amber-500 flex-shrink-0"
              />
              <span className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                <strong>Declaro que li e estou de acordo com os termos acima.</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>
                  Autorizo o uso da imagem e voz do(a) aluno(a) conforme as condições estabelecidas.
                </span>
              </span>
            </label>
          </Section>

          {/* ── SUBMIT ── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn btn-primary gap-2"
            >
              {mutation.isPending ? (
                <>Enviando... <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /></>
              ) : (
                <>Enviar Ficha de Matrícula <ChevronRight size={18} /></>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Estilos de impressão */}
      <style>{PRINT_CSS}</style>
    </div>
  )
}

// ─── HELPER COMPONENTS ──────────────────────────────────────────────────────

function Section({
  icon, title, children, accent,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  accent?: boolean
}) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: accent ? 'rgba(245,158,11,0.3)' : 'var(--border)' }}>
      <div
        className="flex items-center gap-3 px-5 py-3 border-b"
        style={{
          background: accent ? 'rgba(245,158,11,0.08)' : 'var(--bg-secondary)',
          borderColor: accent ? 'rgba(245,158,11,0.2)' : 'var(--border)',
        }}
      >
        <span style={{ color: 'var(--accent)' }} aria-hidden="true">{icon}</span>
        <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
      </div>
      <div className="p-5 space-y-4" style={{ background: 'var(--bg-card)' }}>
        {children}
      </div>
    </div>
  )
}

type ControlProps = Pick<AriaAttributes, 'aria-invalid' | 'aria-describedby' | 'aria-required'> & { id?: string }

function Field({
  label, required, error, children,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactElement<ControlProps>
}) {
  const id = useId()
  const errorId = `${id}-error`
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
        'aria-required': required || undefined,
      })
    : children
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      {control}
      {error && <p id={errorId} role="alert" className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ─── PRINTABLE ENROLLMENT FORM ───────────────────────────────────────────────

function PrintableEnrollment({
  data, workshops, today,
}: {
  data: EnrollmentFormData
  workshops: WorkshopOption[]
  today: string
}) {
  const ws = workshops.find(w => w.id === data.workshop_id)

  return (
    <div className="font-sans text-sm" style={{ color: '#1e293b' }}>
      {/* Header */}
      <div className="text-center mb-6 pb-4 border-b-2" style={{ borderColor: '#d97706' }}>
        <p className="font-bold text-base uppercase tracking-wider">Prefeitura Municipal de Água Boa – MT</p>
        <p className="text-sm">Secretaria Municipal de Esporte, Cultura e Lazer</p>
        <p className="font-bold text-lg mt-2 uppercase tracking-wide" style={{ color: '#d97706' }}>
          Ficha de Matrícula
        </p>
        <p className="text-xs">Oficinas Culturais e Escolinhas Esportivas</p>
      </div>

      {/* Dados da inscrição */}
      <div className="mb-4">
        <p className="font-bold text-xs uppercase tracking-wider mb-2 border-b pb-1">Dados da Inscrição</p>
        <PrintRow label="Data da Inscrição" value={formatDate(data.enrollment_date)} />
        <PrintRow label="Período" value={data.period} />
        <PrintRow label="Oficina / Escolinha" value={data.workshop_name ?? ws?.title} />
        <PrintRow label="Instrutor" value={data.instructor} />
        <PrintRow label="Dias e Horários" value={data.schedule} />
        <PrintRow label="Local" value={data.location} />
      </div>

      {/* Dados do aluno */}
      <div className="mb-4">
        <p className="font-bold text-xs uppercase tracking-wider mb-2 border-b pb-1">Dados do Aluno</p>
        <PrintRow label="Nome Completo" value={data.student_name} />
        <PrintRow label="Escola em que Estuda" value={data.school} />
        <div className="grid grid-cols-3 gap-2">
          <PrintRow label="Ano/Série" value={data.grade} />
          <PrintRow label="Período" value={data.school_period} />
          <PrintRow label="Idade" value={data.age?.toString()} />
        </div>
      </div>

      {/* Dados do responsável */}
      <div className="mb-4">
        <p className="font-bold text-xs uppercase tracking-wider mb-2 border-b pb-1">Dados do Responsável</p>
        <PrintRow label="Nome do Responsável" value={data.guardian_name} />
        <PrintRow label="Telefone Residencial" value={data.phone} />
        <PrintRow label="Telefone do Trabalho" value={data.guardian_work_phone} />
        <PrintRow label="Endereço Residencial / Trabalho" value={data.address} />
      </div>

      {/* Autorização */}
      <div className="mb-6">
        <p className="font-bold text-xs uppercase tracking-wider mb-2 border-b pb-1">Autorização de Busca</p>
        <p className="mb-2">
          O aluno virá para a atividade e irá para casa acompanhado(a) de um responsável:{' '}
          <strong>({data.accompanied_by_guardian ? ' X ' : '   '}) Sim</strong>{' '}
          <strong>({!data.accompanied_by_guardian ? ' X ' : '   '}) Não</strong>
        </p>
        <PrintRow label="Nome da Pessoa Autorizada para Buscar a Criança/Adolescente" value={data.authorized_person} />
      </div>

      {/* Termo de Imagem */}
      <div className="mb-6 p-4 rounded border" style={{ borderColor: '#d97706', background: '#fffbeb' }}>
        <p className="font-bold text-center text-xs uppercase tracking-wider mb-3">
          Termo de Autorização de Uso de Imagem e Voz
        </p>
        <p className="mb-2">
          Eu, <strong>{data.image_auth_guardian_name || '_____________________________'}</strong>, portador(a) do CPF nº{' '}
          <strong>{data.image_auth_guardian_cpf || '______________________'}</strong>, responsável legal pelo(a){' '}
          <strong>{data.student_name || '_____________________________'}</strong>, inscrito(a) nas atividades/oficinas desenvolvidas pela
          Secretaria Municipal de Esporte, Cultura e Lazer, AUTORIZO o uso de sua imagem e voz para fins pedagógicos, institucionais,
          educacionais e de divulgação das atividades, conforme os termos completos apresentados no momento da inscrição.
        </p>
        <p className="mb-3">
          A autorização inclui redes sociais, sites institucionais, materiais gráficos e outros meios institucionais da
          Prefeitura Municipal de Água Boa e da Secretaria Municipal de Esporte, Cultura e Lazer, vedado o uso comercial.
          Conformidade com a LGPD (Lei nº 13.709/2018).
        </p>
        <p className="font-semibold">
          Aceite eletrônico: {data.image_authorization ? '✓ Autorizado' : '✗ Não autorizado'}
        </p>
      </div>

      {/* Assinaturas */}
      <div className="mt-8">
        <p className="text-center text-xs mb-6">Local e data: Água Boa – MT, {today}.</p>
        <div className="grid grid-cols-2 gap-12 mt-4">
          <div className="text-center">
            <div className="border-t pt-2" style={{ borderColor: '#475569' }}>
              <p className="text-xs">Assinatura do Responsável</p>
              <p className="text-xs font-medium mt-1">{data.guardian_name}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t pt-2" style={{ borderColor: '#475569' }}>
              <p className="text-xs">Assinatura da Secretaria</p>
              <p className="text-xs font-medium mt-1">Secretaria Municipal de Esporte, Cultura e Lazer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PrintRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2 mb-1">
      <span className="font-semibold text-xs min-w-max">{label}:</span>
      <span className="border-b flex-1 border-dotted text-xs" style={{ borderColor: '#94a3b8', minHeight: '1.2em' }}>
        {value ?? ''}
      </span>
    </div>
  )
}
