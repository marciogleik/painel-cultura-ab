import { useEffect, useId, useState } from 'react'
import { Upload, ImageIcon, X, CheckCircle, AlertCircle } from 'lucide-react'
import { useStorageUpload } from '@/hooks/useStorageUpload'

interface ImageUploaderProps {
  /** URL atual da imagem (preview inicial) */
  currentUrl?: string | null
  /** Recebe a URL pública após o upload ('' ao remover) */
  onUpload: (url: string) => void
  /** Pasta no bucket */
  folder?: string
  /** Bucket de destino (padrão: site-media) */
  bucket?: string
  /** Tamanho máximo em MB (padrão: 10) */
  maxMb?: number
  /** Arquivo anterior a ser apagado do bucket quando uma nova imagem for enviada */
  previousUrl?: string | null
  /** Texto do rótulo (acessibilidade) */
  label?: string
}

export function ImageUploader({
  currentUrl,
  onUpload,
  folder = 'uploads',
  bucket = 'site-media',
  maxMb = 10,
  previousUrl,
  label = 'Imagem',
}: ImageUploaderProps) {
  const inputId = useId()
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  useEffect(() => { setPreview(currentUrl ?? null) }, [currentUrl])

  const up = useStorageUpload({
    bucket,
    folder,
    maxMb,
    accept: ['image/'],
    invalidTypeMessage: 'Selecione uma imagem (JPG, PNG, WebP ou GIF).',
    previousUrl: previousUrl ?? currentUrl,
    onUpload: (url) => { setPreview(url || null); onUpload(url) },
  })

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-label={preview ? `${label}: trocar imagem` : `${label}: escolher imagem`}
        aria-busy={up.isUploading}
        onClick={up.openPicker}
        onKeyDown={up.onKeyDown}
        {...up.dragHandlers}
        className="relative rounded-2xl overflow-hidden transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        style={{
          minHeight: preview ? '200px' : '140px',
          border: `2px dashed ${up.isDragging ? 'var(--accent)' : up.status === 'error' ? 'var(--error)' : 'var(--border)'}`,
          background: up.isDragging ? 'var(--bg-secondary)' : 'var(--bg-card)',
        }}
      >
        {preview && <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />}

        {preview && (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.55)' }}>
            <Upload size={28} className="text-white mb-2" />
            <p className="text-white font-semibold text-sm">Trocar imagem</p>
            <p className="text-white/70 text-xs mt-0.5">Clique ou arraste uma nova foto</p>
          </div>
        )}

        {!preview && (
          <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center gap-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1" style={{ background: 'var(--bg-secondary)' }}>
              <ImageIcon size={26} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Clique para escolher uma foto</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ou arraste e solte aqui</p>
            <p className="text-xs mt-1 px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              JPG, PNG ou WebP · máx. {maxMb} MB
            </p>
          </div>
        )}

        {preview && !up.isUploading && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPreview(null); up.clear() }}
            className="absolute top-2 right-2 p-1.5 rounded-full shadow-lg transition-all hover:scale-110"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            aria-label="Remover imagem"
          >
            <X size={14} className="text-white" />
          </button>
        )}
      </div>

      {up.isUploading && (
        <div className="space-y-1" aria-live="polite">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>Enviando imagem...</span>
            <span>{up.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${up.progress}%`, background: 'var(--accent)' }} />
          </div>
        </div>
      )}

      {up.status === 'success' && (
        <p className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--success)' }} role="status">
          <CheckCircle size={16} /> Imagem enviada com sucesso.
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
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={up.onInputChange}
      />
    </div>
  )
}
