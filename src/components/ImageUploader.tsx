import { useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, ImageIcon, X, CheckCircle, AlertCircle } from 'lucide-react'

interface ImageUploaderProps {
  /** URL atual da imagem (para exibir preview inicial) */
  currentUrl?: string
  /** Chamado quando o upload terminar com sucesso — recebe a URL pública */
  onUpload: (url: string) => void
  /** Pasta no bucket onde a imagem será salva */
  folder?: string
  /** Tamanho máximo em MB (padrão: 10) */
  maxMb?: number
}

type Status = 'idle' | 'uploading' | 'success' | 'error'

export function ImageUploader({
  currentUrl,
  onUpload,
  folder = 'uploads',
  maxMb = 10,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setStatus('error')
        setErrorMsg('Por favor, selecione uma imagem (JPG, PNG, WebP ou GIF).')
        return
      }
      if (file.size > maxMb * 1024 * 1024) {
        setStatus('error')
        setErrorMsg(`A imagem deve ter no máximo ${maxMb} MB.`)
        return
      }

      const localUrl = URL.createObjectURL(file)
      setPreview(localUrl)
      setStatus('uploading')
      setProgress(10)
      setErrorMsg('')

      try {
        const ext = file.name.split('.').pop() ?? 'jpg'
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
        onUpload(urlData.publicUrl)

        setTimeout(() => setStatus('idle'), 2000)
      } catch (err: any) {
        setStatus('error')
        setPreview(currentUrl ?? null)
        setErrorMsg('Erro ao enviar imagem. Tente novamente.')
        console.error(err)
      }
    },
    [folder, maxMb, onUpload, currentUrl],
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

  const removeImage = () => { setPreview(null); setStatus('idle'); onUpload('') }

  return (
    <div className="space-y-2">
      <div
        onClick={() => status !== 'uploading' && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="relative rounded-2xl overflow-hidden transition-all cursor-pointer"
        style={{
          minHeight: preview ? '200px' : '140px',
          border: `2px dashed ${isDragging ? 'var(--accent)' : status === 'error' ? '#ef4444' : 'var(--border)'}`,
          background: isDragging ? 'var(--bg-secondary)' : 'var(--bg-card)',
          transform: isDragging ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        {preview && (
          <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
        )}

        {preview && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            <Upload size={28} className="text-white mb-2" />
            <p className="text-white font-semibold text-sm">Trocar imagem</p>
            <p className="text-white/70 text-xs mt-0.5">Clique ou arraste uma nova foto</p>
          </div>
        )}

        {!preview && (
          <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center gap-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <ImageIcon size={26} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Clique para escolher uma foto
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              ou arraste e solte aqui
            </p>
            <p className="text-xs mt-1 px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              JPG, PNG ou WebP · máx. {maxMb} MB
            </p>
          </div>
        )}

        {preview && status !== 'uploading' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeImage() }}
            className="absolute top-2 right-2 p-1.5 rounded-full shadow-lg transition-all hover:scale-110"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            title="Remover imagem"
          >
            <X size={14} className="text-white" />
          </button>
        )}
      </div>

      {status === 'uploading' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>📤 Enviando imagem...</span>
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
          Imagem enviada com sucesso!
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
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  )
}
