import { describe, it, expect } from 'vitest'
import {
  parseDate, formatDate, daysUntil, toDatetimeLocal, fromDatetimeLocal,
  isValidCPF, isValidCNPJ, formatCPF, formatCNPJ, formatPhone,
  sanitizeSearch, safeUrl, whatsappLink, errorMessage,
} from './utils'

describe('datas', () => {
  it('trata DATE (YYYY-MM-DD) como data local, sem perder um dia', () => {
    const d = parseDate('2026-09-10')!
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(8)
    expect(d.getDate()).toBe(10)
    expect(formatDate('2026-09-10')).toBe('10/09/2026')
  })

  it('devolve "—" para datas inválidas ou vazias', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('abc')).toBe('—')
  })

  it('daysUntil é 0 para hoje e negativo para o passado', () => {
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(daysUntil(iso)).toBe(0)
    expect(daysUntil('2000-01-01')!).toBeLessThan(0)
  })

  it('converte ida e volta para datetime-local mantendo o instante', () => {
    const iso = new Date(2026, 8, 9, 19, 30).toISOString()
    const local = toDatetimeLocal(iso)
    expect(local).toBe('2026-09-09T19:30')
    expect(fromDatetimeLocal(local)).toBe(iso)
    expect(fromDatetimeLocal('')).toBeNull()
  })
})

describe('documentos', () => {
  it('valida CPF pelos dígitos verificadores', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true)
    expect(isValidCPF('52998224725')).toBe(true)
    expect(isValidCPF('111.111.111-11')).toBe(false)
    expect(isValidCPF('529.982.247-26')).toBe(false)
    expect(isValidCPF('')).toBe(false)
  })

  it('valida CNPJ pelos dígitos verificadores', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true)
    expect(isValidCNPJ('11222333000181')).toBe(true)
    expect(isValidCNPJ('11.222.333/0001-82')).toBe(false)
    expect(isValidCNPJ('00000000000000')).toBe(false)
  })

  it('aplica máscaras', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25')
    expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81')
    expect(formatPhone('66999998888')).toBe('(66) 99999-8888')
    expect(formatPhone('6633331111')).toBe('(66) 3333-1111')
  })
})

describe('segurança de texto e links', () => {
  it('remove caracteres com significado no PostgREST', () => {
    expect(sanitizeSearch("maria,or(id.eq.1)")).toBe('maria or id eq 1')
  })

  it('só aceita http(s) e mailto', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('data:text/html,x')).toBeNull()
    expect(safeUrl('https://instagram.com/x')).toBe('https://instagram.com/x')
    expect(safeUrl('instagram.com/x')).toBe('https://instagram.com/x')
  })

  it('monta link do WhatsApp com DDI', () => {
    expect(whatsappLink('(66) 99999-8888')).toBe('https://wa.me/5566999998888')
    expect(whatsappLink('123')).toBeNull()
  })

  it('traduz erros de RLS para uma mensagem legível', () => {
    expect(errorMessage({ code: '42501', message: 'new row violates row-level security policy' }))
      .toBe('Você não tem permissão para esta ação.')
    expect(errorMessage({ code: '42501', message: 'Cadastro incompleto. Falta: CPF' }))
      .toBe('Cadastro incompleto. Falta: CPF')
    expect(errorMessage(null)).toBe('Algo deu errado. Tente novamente.')
  })
})
