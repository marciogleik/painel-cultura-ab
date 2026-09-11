import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem { id: number; kind: ToastKind; message: string }

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const STYLE: Record<ToastKind, { color: string; icon: ReactNode }> = {
  success: { color: 'var(--success)', icon: <CheckCircle2 size={18} /> },
  error: { color: 'var(--error)', icon: <AlertCircle size={18} /> },
  info: { color: 'var(--info)', icon: <Info size={18} /> },
}

let nextId = 1

/** Substitui window.alert: `toast.success('Salvo')`, `toast.error(errorMessage(err))`. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), [])

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++
    setItems((list) => [...list.slice(-4), { id, kind, message }])
    window.setTimeout(() => remove(id), kind === 'error' ? 7000 : 4000)
  }, [remove])

  const api = useMemo<ToastApi>(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-up"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `4px solid ${STYLE[t.kind].color}` }}
          >
            <span style={{ color: STYLE[t.kind].color }} className="mt-0.5 flex-shrink-0">{STYLE[t.kind].icon}</span>
            <p className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{t.message}</p>
            <button type="button" onClick={() => remove(t.id)} aria-label="Fechar aviso" className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
