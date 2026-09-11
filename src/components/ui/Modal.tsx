import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Impede fechar por Esc/backdrop (ex.: durante um envio) */
  locked?: boolean
}

const SIZES = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Diálogo acessível: role="dialog", foco inicial, foco preso dentro, Esc fecha,
 * devolve o foco ao elemento que abriu, bloqueia o scroll do fundo.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', locked = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const firstInput = panel?.querySelector<HTMLElement>('input,select,textarea') ?? panel?.querySelector<HTMLElement>(FOCUSABLE)
    firstInput?.focus()

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !locked) {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab' && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previousFocus.current?.focus?.()
    }
  }, [open, locked, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !locked) onClose() }}
      style={{ background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn('w-full rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-slide-up', SIZES[size])}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            {description && <p id={descId} className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            aria-label="Fechar"
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </header>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <footer className="px-5 py-3 border-t flex flex-wrap items-center justify-end gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  )
}
