import { useEffect, useId, useState } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { useStorageUpload } from '@/hooks/useStorageUpload'

interface FileUploaderProps {
  /** URL atual do arquivo (link inicial) */
  currentUrl?: string | null
  /** Recebe a URL pública após o upload ('' ao remover) */
  onUpload: (url: string) => void
  /** Pasta no bucket */
  folder?: string
  /** Bucket de destino (padrão: site-media) */
  bucket?: string
  /** Tamanho máximo em MB (padrão: 20) */
  maxMb?: number
  /** Texto exibido na área de soltar */
  label?: string
  /** Arquivo anterior a ser apagado do bucket quando um novo for enviado */
  previousUrl?: string | null
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const ACCEPTED_EXT = '.pdf,.doc,.docx,.xls,.xlsx'
const ACCEPTED_LABEL = 'PDF, DOC, DOCX, XLS ou XLSX'

function getFileName(url: string) {
  try {
    const parts = new URL(url).pathname.split('/')
    const raw = parts[parts.length - 1] ?? ''
    const match = raw.match(/\d+-[a-z0-9]+\.(.+)$/)
    return match ? `documento.${match[1]}` : raw
  } catch {
    return 'documento'
  }
}

export function FileUploader({
  currentUrl,
  onUpload,
  folder = 'documents',
  bucket = 'site-media',
  maxMb = 20,
  label = 'Clique para escolher um arquivo',
  previousUrl,
}: FileUploaderProps) {
  const inputId = useId()
  const [currentFile, setCurrentFile] = useState<string | null>(currentUrl ?? null)
  useEffect(() => { setCurrentFile(currentUrl ?? null) }, [currentUrl])

  const up = useStorageUpload({
    bucket,
    folder,
    maxMb,
    accept: ACCEPTED_TYPES,
    invalidTypeMessage: `Tipo inválido. Aceito: ${ACCEPTED_LABEL}.`,
    previousUrl: previousUrl ?? currentUrl,
    onUpload: (url) => { setCurrentFile(url || null); onUpload(url) },
  })

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-label={currentFile ? 'Substituir arquivo' : label}
        aria-busy={up.isUploading}
        onClick={up.openPicker}
        onKeyDown={up.onKeyDown}
        {...up.dragHandlers}
        className="relative rounded-2xl overflow-hidden transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        style={{
          border: `2px dashed ${up.isDragging ? 'var(--accent)' : up.status === 'error' ? 'var(--error)' : 'var(--border)'}`,
          background: up.isDragging ? 'var(--bg-secondary)' : 'var(--bg-card)',
        }}
      >
        <div className="flex flex-col items-center justify-center py-6 px-4 text-center gap-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: 'var(--bg-secondary)' }}>
            {currentFile ? <FileText size={24} style={{ color: 'var(--accent)' }} /> : <Upload size={24} style={{ color: 'var(--accent)' }} />}
          </div>
          {currentFile ? (
            <>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{getFileName(currentFile)}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Clique para substituir o arquivo</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ou arraste e solte aqui</p>
              <p className="text-xs mt-1 px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                {ACCEPTED_LABEL} · máx. {maxMb} MB
              </p>
            </>
          )}
        </div>

        {currentFile && !up.isUploading && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCurrentFile(null); up.clear() }}
            className="absolute top-2 right-2 p-1.5 rounded-full shadow-lg transition-all hover:scale-110"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            aria-label="Remover arquivo"
          >
            <X size={14} className="text-white" />
          </button>
        )}
      </div>

      {currentFile && up.status === 'idle' && (
        <a
          href={currentFile}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent)' }}
        >
          <Download size={13} /> Visualizar documento atual
        </a>
      )}

      {up.isUploading && (
        <div className="space-y-1" aria-live="polite">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>Enviando arquivo...</span>
            <span>{up.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${up.progress}%`, background: 'var(--accent)' }} />
          </div>
        </div>
      )}

      {up.status === 'success' && (
        <p className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--success)' }} role="status">
          <CheckCircle size={16} /> Arquivo enviado com sucesso.
        </p>
      )}

      {up.status === 'error' && up.error && (
        <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--error)' }} role="alert">
          <AlertCircle size={16} /> {up.error}
        </p>
      )}

      <label htmlFor={inputId} className="sr-only">{label}</label>
      <input
        id={inputId}
        ref={up.inputRef}
        type="file"
        accept={ACCEPTED_EXT}
        className="sr-only"
        tabIndex={-1}
        onChange={up.onInputChange}
      />
    </div>
  )
}
