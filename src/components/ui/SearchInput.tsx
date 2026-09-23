import { useEffect, useId, useState } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  /** Atraso (ms) antes de propagar a mudança; 0 desliga o debounce */
  debounce?: number
  className?: string
  autoFocus?: boolean
  list?: string
}

/** Campo de busca acessível (label invisível) com debounce e botão de limpar. */
export function SearchInput({ value, onChange, placeholder = 'Buscar...', label = 'Buscar', debounce = 300, className = '', autoFocus, list }: SearchInputProps) {
  const [local, setLocal] = useState(value)
  const id = useId()

  useEffect(() => { setLocal(value) }, [value])

  useEffect(() => {
    if (debounce <= 0) return
    if (local === value) return
    const t = window.setTimeout(() => onChange(local), debounce)
    return () => window.clearTimeout(t)
  }, [local, debounce, onChange, value])

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
      <input
        id={id}
        type="search"
        list={list}
        className="input pl-9 pr-9"
        placeholder={placeholder}
        value={local}
        autoFocus={autoFocus}
        onChange={(e) => {
          setLocal(e.target.value)
          if (debounce <= 0) onChange(e.target.value)
        }}
      />
      {local && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => { setLocal(''); onChange('') }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
