import { useEffect, useRef, useState } from 'react'
import { Camera, Upload, User, X } from 'lucide-react'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import type { WizardStep7 } from './useAgentWizard'

interface Step7Props {
  data: WizardStep7
  onChange: (values: Partial<WizardStep7>) => void
  onNext: () => void
  onBack: () => void
  isSaving: boolean
}

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function Step7Foto({ data, onChange, onNext, onBack, isSaving }: Step7Props) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Pré-visualização do arquivo escolhido: cria e revoga a object URL junto com o arquivo
  useEffect(() => {
    if (!data.photoFile) {
      setLocalPreview(null)
      return
    }
    const url = URL.createObjectURL(data.photoFile)
    setLocalPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [data.photoFile])

  const preview = localPreview ?? data.photo_url

  const handleFile = (file: File) => {
    setError('')
    if (!file.type.startsWith('image/') || !ACCEPTED.includes(file.type)) {
      setError('Apenas imagens JPG, PNG, WebP ou GIF são permitidas.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('A imagem deve ter no máximo 5 MB.')
      return
    }
    onChange({ photoFile: file })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (isSaving) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const openPicker = () => {
    if (!isSaving) inputRef.current?.click()
  }

  const clearPhoto = () => {
    setError('')
    onChange({ photoFile: null, photo_url: null })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Foto do agente
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Adicione uma foto de perfil. Recomendamos uma imagem quadrada com boa iluminação.
        </p>
      </div>

      {/* Preview */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <div
            className="w-36 h-36 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)', border: '3px solid var(--border)' }}
          >
            {preview ? (
              <img src={preview} alt="Pré-visualização da foto do agente" className="w-full h-full object-cover" />
            ) : (
              <User size={48} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
            )}
          </div>
          {preview && (
            <button
              type="button"
              onClick={clearPhoto}
              disabled={isSaving}
              className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-opacity hover:opacity-80"
              style={{ background: 'var(--error)' }}
              aria-label="Remover foto"
            >
              <X size={13} className="text-white" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={openPicker} disabled={isSaving} className="btn btn-secondary text-sm">
            <Camera size={15} aria-hidden="true" />
            {preview ? 'Trocar foto' : 'Escolher foto'}
          </button>
        </div>
        {data.photoFile && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }} aria-live="polite">
            {data.photoFile.name} — será enviada ao continuar.
          </p>
        )}
      </div>

      {/* Drag and Drop */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Arraste uma imagem aqui ou pressione Enter para selecionar"
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 cursor-pointer ${
          dragging ? 'bg-amber-500/5' : ''
        }`}
        style={{ borderColor: dragging ? 'var(--accent)' : 'var(--border)' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={openPicker}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker() } }}
      >
        <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Arraste uma imagem aqui ou <span style={{ color: 'var(--accent)' }}>clique para selecionar</span>
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          JPG, PNG, WebP ou GIF — máximo 5 MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {error && (
        <p role="alert" className="mt-2 text-xs text-center" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      <div className="flex gap-3 mt-8">
        <button type="button" onClick={onBack} disabled={isSaving} className="btn btn-secondary flex-1">Voltar</button>
        <LoadingButton type="button" onClick={onNext} loading={isSaving} className="btn btn-primary flex-2">
          {!preview ? 'Pular por enquanto' : data.photoFile ? 'Enviar foto e continuar' : 'Continuar'}
        </LoadingButton>
      </div>
    </div>
  )
}
