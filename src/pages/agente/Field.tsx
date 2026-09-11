import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  optional?: boolean
  required?: boolean
  /** Um único input/select/textarea — recebe id, aria-invalid e aria-describedby */
  children: ReactNode
  className?: string
}

/**
 * Campo de formulário com <label> associado, dica e mensagem de erro anunciável.
 * Quando o filho é um único elemento (input/select/textarea), o id e os atributos
 * ARIA são injetados automaticamente.
 */
export function Field({ label, hint, error, optional, required, children, className }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy = [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') || undefined

  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })
    : children

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
        {required && <span className="ml-0.5 text-xs" style={{ color: 'var(--accent)' }} aria-hidden="true">*</span>}
        {optional && (
          <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>(opcional)</span>
        )}
      </label>
      {child}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs" style={{ color: 'var(--error)' }}>{error}</p>
      )}
    </div>
  )
}
