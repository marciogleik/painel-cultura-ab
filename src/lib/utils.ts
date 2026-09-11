import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Datas
// Colunas DATE do Postgres chegam como "YYYY-MM-DD". `new Date('YYYY-MM-DD')`
// interpreta como meia-noite UTC e, em Mato Grosso (UTC-4), vira o dia anterior.
// parseDate trata "YYYY-MM-DD" como data local; qualquer outro formato segue o Date nativo.
// ============================================================

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const d = DATE_ONLY.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return isNaN(d.getTime()) ? null : d
}

export function formatDate(date: string | Date | null | undefined): string {
  const d = parseDate(date)
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

export function formatDateTime(date: string | Date | null | undefined): string {
  const d = parseDate(date)
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d)
}

export function formatDateLong(date: string | Date | null | undefined): string {
  const d = parseDate(date)
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

/** Data de hoje como "YYYY-MM-DD" no fuso local. */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Dias restantes até uma data (DATE). Negativo quando já passou. */
export function daysUntil(date: string | Date | null | undefined): number | null {
  const d = parseDate(date)
  if (!d) return null
  const today = parseDate(todayISO())!
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

/** TIMESTAMPTZ (ISO) -> valor aceito por <input type="datetime-local"> no fuso local. */
export function toDatetimeLocal(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Valor de <input type="datetime-local"> (fuso local) -> ISO com offset, para TIMESTAMPTZ. */
export function fromDatetimeLocal(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export function calculateAge(birthDate: string | null | undefined): number | null {
  const d = parseDate(birthDate)
  if (!d) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

// ============================================================
// Texto
// ============================================================

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Remove caracteres que têm significado na sintaxe de filtros do PostgREST
 * (vírgula, parênteses, ponto, aspas). Use antes de interpolar texto do usuário
 * em `.or(...)` ou `.ilike(...)`.
 */
export function sanitizeSearch(text: string): string {
  return text.replace(/[,().'"\\%]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Aceita apenas http(s) e mailto; devolve null para javascript:, data: etc. */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`
  return null
}

// ============================================================
// Documentos e telefone (Brasil)
// ============================================================

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

export function isValidCPF(value: string | null | undefined): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}

export function isValidCNPJ(value: string | null | undefined): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * weights[i]
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13])
}

export function formatCPF(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function formatCNPJ(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 14)
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function formatPhone(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function formatCEP(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 8)
  return d.replace(/(\d{5})(\d)/, '$1-$2')
}

/** Link do WhatsApp a partir de um telefone brasileiro. */
export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  const d = onlyDigits(phone)
  if (d.length < 10) return null
  const num = d.startsWith('55') ? d : `55${d}`
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

// ============================================================
// Erros do Supabase / Postgres em mensagens legíveis
// ============================================================

export function errorMessage(err: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  const e = err as { message?: string; code?: string; details?: string }
  const msg = e.message ?? ''
  if (e.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return msg && !/row-level security|permission denied/i.test(msg) ? msg : 'Você não tem permissão para esta ação.'
  }
  if (e.code === '23505' || /duplicate key/i.test(msg)) return 'Já existe um registro igual a este.'
  if (e.code === '23503') return 'Este registro está vinculado a outros e não pode ser alterado assim.'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão com o servidor. Verifique sua internet.'
  return msg || fallback
}
