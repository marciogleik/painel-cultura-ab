import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Spinner } from './Spinner'

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Botão vermelho para ações destrutivas */
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Substitui window.confirm: `const ok = await confirm({ title: 'Excluir?', danger: true })`.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => { resolver.current = resolve })
  }, [])

  const close = useCallback((value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!options}
        onClose={() => close(false)}
        title={options?.title ?? ''}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => close(false)}>
              {options?.cancelLabel ?? 'Cancelar'}
            </button>
            <button
              type="button"
              className={options?.danger ? 'btn btn-danger' : 'btn btn-primary'}
              onClick={() => close(true)}
              autoFocus
            >
              {options?.confirmLabel ?? 'Confirmar'}
            </button>
          </>
        }
      >
        <div className="flex gap-3">
          {options?.danger && <AlertTriangle size={22} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />}
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {options?.message ?? 'Esta ação não pode ser desfeita.'}
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

/** Botão com estado de carregamento embutido. */
export function LoadingButton({
  loading, children, className = 'btn btn-primary', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...rest} className={className} disabled={loading || rest.disabled} aria-busy={loading}>
      {loading && <Spinner size={16} className="border-current border-t-transparent mr-2" />}
      {children}
    </button>
  )
}
