import { useRef, useState } from 'react'
import { Camera, Upload, User, X } from 'lucide-react'
import type { WizardStep7 } from './useAgentWizard'

interface Step7Props {
  data: WizardStep7
  agentId: string | null
  onChange: (values: Partial<WizardStep7>) => void
  onNext: () => void
  onBack: () => void
}

export function Step7Foto({ data, agentId: _agentId, onChange, onNext, onBack }: Step7Props) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(data.photo_url)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setError('')
    if (!file.type.startsWith('image/')) {
      setError('Apenas imagens são permitidas (JPG, PNG, WebP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.')
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    onChange({ photoFile: file, photo_url: url })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const clearPhoto = () => {
    setPreview(null)
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
            style={{
              background: 'var(--bg-secondary)',
              border: '3px solid var(--border)',
            }}
          >
            {preview ? (
              <img src={preview} alt="Foto do agente" className="w-full h-full object-cover" />
            ) : (
              <User size={48} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          {preview && (
            <button
              onClick={clearPhoto}
              className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-opacity hover:opacity-80"
              style={{ background: 'var(--error)' }}
            >
              <X size={13} className="text-white" />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="btn btn-secondary text-sm"
          >
            <Camera size={15} />
            {preview ? 'Trocar foto' : 'Escolher foto'}
          </button>
        </div>
      </div>

      {/* Drag and Drop */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 cursor-pointer ${
          dragging ? 'border-amber-500 bg-amber-500/5' : ''
        }`}
        style={{ borderColor: dragging ? 'var(--accent)' : 'var(--border)' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Arraste uma imagem aqui ou <span style={{ color: 'var(--accent)' }}>clique para selecionar</span>
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          JPG, PNG ou WebP — máximo 5MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {error && (
        <p className="mt-2 text-xs text-center" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="btn btn-secondary flex-1">Voltar</button>
        <button onClick={onNext} className="btn btn-primary flex-2">
          {!preview ? 'Pular por enquanto' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
