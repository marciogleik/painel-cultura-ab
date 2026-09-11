import { useId, type ComponentProps, type ReactNode } from 'react'
import { LoadingButton } from '@/components/ui/ConfirmDialog'

/** Atributos que o campo deve espalhar no input/select/textarea para ficar acessível. */
export interface FieldControlProps {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  required?: boolean
  className?: string
  children: (control: FieldControlProps) => ReactNode
}

/** Rótulo + controle + erro, com htmlFor/aria ligados. Uso: `<Field label="Título">{(p) => <input {...p} .../>}</Field>` */
export function Field({ label, error, hint, required, className = '', children }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
        {required && <span aria-hidden="true" style={{ color: 'var(--error)' }}> *</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && <p id={`${id}-hint`} className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-xs mt-1" style={{ color: 'var(--error)' }}>{error}</p>}
    </div>
  )
}

/** Caixa de seleção com rótulo clicável (aceita o spread de `register`). */
export function CheckboxField({ label, hint, className = '', ...rest }: ComponentProps<'input'> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl ${className}`} style={{ background: 'var(--bg-secondary)' }}>
      <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 accent-amber-500 flex-shrink-0" {...rest} />
      <label htmlFor={id} className="text-sm cursor-pointer select-none" style={{ color: 'var(--text-primary)' }}>
        {label}
        {hint && <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
      </label>
    </div>
  )
}

/** Rodapé padrão dos formulários em Modal: o botão de envio aponta para o `form` pelo id. */
export function FormFooter({
  formId, onCancel, loading, canWrite = true, submitLabel = 'Salvar', disabled,
}: {
  formId: string
  onCancel: () => void
  loading?: boolean
  canWrite?: boolean
  submitLabel?: string
  disabled?: boolean
}) {
  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>
        {canWrite ? 'Cancelar' : 'Fechar'}
      </button>
      {canWrite && (
        <LoadingButton type="submit" form={formId} loading={loading} disabled={disabled}>
          {submitLabel}
        </LoadingButton>
      )}
    </>
  )
}
