import { useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, FileText, X, CheckCircle, AlertCircle, Download } from 'lucide-react'

interface FileUploaderProps {
  /** URL atual do arquivo (para exibir link inicial) */
  currentUrl?: string
  /** Chamado quando o upload terminar com sucesso — recebe a URL pública */
  onUpload: (url: string) => void
  /** Pasta no bucket onde o arquivo será salvo */
  folder?: string
  /** Tamanho máximo em MB (padrão: 20) */
  maxMb?: number
  /** Label exibida na área de drop */
  label?: string
}

type Status = 'idle' | 'uploading' | 'success' | 'error'

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
    // Remove timestamp prefix (e.g. 1234567890-abc123.pdf → .pdf)
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
  maxMb = 20,
  label = 'Clique para escolher um arquivo',
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [currentFile, setCurrentFile] = useState<string | null>(currentUrl ?? null)
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setStatus('error')
        setErrorMsg(`Tipo inválido. Aceito: ${ACCEPTED_LABEL}.`)
        return
      }
      if (file.size > maxMb * 1024 * 1024) {
        setStatus('error')
        setErrorMsg(`O arquivo deve ter no máximo ${maxMb} MB.`)
        return
      }

      setStatus('uploading')
      setProgress(10)
      setErrorMsg('')

      try {
        const ext = file.name.split('.').pop() ?? 'pdf'
        const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        setProgress(30)

        const { error } = await supabase.storage
          .from('site-media')
          .upload(filename, file, { upsert: false })

        if (error) throw error

        setProgress(80)

        const { data: urlData } = supabase.storage
          .from('site-media')
          .getPublicUrl(filename)

        setProgress(100)
        setStatus('success')
        setCurrentFile(urlData.publicUrl)
        onUpload(urlData.publicUrl)

        setTimeout(() => setStatus(prev => (prev === 'success' ? 'idle' : prev)), 2000)
      } catch (err: any) {
        setStatus('error')
        setErrorMsg('Erro ao enviar arquivo. Tente novamente.')
        console.error(err)
      }
    },
    [folder, maxMb, onUpload],
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const removeFile = () => {
    setCurrentFile(null)
    setStatus('idle')
    onUpload('')
  }

  return (
    <div className="space-y-2">
      {/* Drop area */}
      <div
        onClick={() => status !== 'uploading' && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="relative rounded-2xl overflow-hidden transition-all cursor-pointer"
        style={{
          border: `2px dashed ${isDragging ? 'var(--accent)' : status === 'error' ? '#ef4444' : 'var(--border)'}`,
          background: isDragging ? 'var(--bg-secondary)' : 'var(--bg-card)',
          transform: isDragging ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        <div className="flex flex-col items-center justify-center py-6 px-4 text-center gap-2">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {currentFile
              ? <FileText size={24} style={{ color: 'var(--accent)' }} />
              : <Upload size={24} style={{ color: 'var(--accent)' }} />
            }
          </div>

          {currentFile ? (
            <>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {getFileName(currentFile)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Clique para substituir o arquivo
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {label}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                ou arraste e solte aqui
              </p>
              <p
                className="text-xs mt-1 px-3 py-1 rounded-full"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
              >
                {ACCEPTED_LABEL} · máx. {maxMb} MB
              </p>
            </>
          )}
        </div>

        {/* Remove button */}
        {currentFile && status !== 'uploading' && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); removeFile() }}
            className="absolute top-2 right-2 p-1.5 rounded-full shadow-lg transition-all hover:scale-110"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            title="Remover arquivo"
          >
            <X size={14} className="text-white" />
          </button>
        )}
      </div>

      {/* Link to download current file */}
      {currentFile && status === 'idle' && (
        <a
          href={currentFile}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent)' }}
          onClick={e => e.stopPropagation()}
        >
          <Download size={13} />
          Visualizar documento atual
        </a>
      )}

      {/* Progress */}
      {status === 'uploading' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>📤 Enviando arquivo...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: 'var(--accent)' }}
            />
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
          <CheckCircle size={16} />
          Arquivo enviado com sucesso!
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT}
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  )
}
