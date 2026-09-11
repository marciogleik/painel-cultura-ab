import { useState, type InputHTMLAttributes, type Ref } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Compatível com `{...register('password')}` do react-hook-form (React 19: ref é prop). */
  ref?: Ref<HTMLInputElement>
  /** Aplica o estilo de erro ao campo */
  invalid?: boolean
}

/** Campo de senha com botão "mostrar/ocultar" acessível. */
export function PasswordInput({ className, invalid, ref, ...rest }: PasswordInputProps) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={cn('input pr-10', invalid && 'input-error', className)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={show}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors hover:text-amber-500"
        style={{ color: 'var(--text-muted)' }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
