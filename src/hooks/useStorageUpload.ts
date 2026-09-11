import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/utils'

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export interface UseStorageUploadOptions {
  /** Bucket de destino (padrão: site-media, público) */
  bucket?: string
  /** Pasta dentro do bucket */
  folder?: string
  /**
   * Tipos aceitos: MIME completo ("application/pdf") ou prefixo ("image/").
   * Vazio aceita qualquer arquivo.
   */
  accept?: string[]
  /** Tamanho máximo em MB */
  maxMb?: number
  /** Chamado com a URL pública (bucket público) ou o caminho (bucket privado) */
  onUpload: (urlOrPath: string) => void
  /** Arquivo anterior (URL pública ou caminho) — é removido do bucket ao substituir */
  previousUrl?: string | null
  /** Devolve URL pública (padrão) ou apenas o caminho no bucket */
  returnPath?: boolean
  /** Mensagem para tipo inválido */
  invalidTypeMessage?: string
}

/** Extrai o caminho dentro do bucket a partir de uma URL pública do Supabase Storage. */
export function storagePathFromUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null
  if (!url.startsWith('http')) return url
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const path = url.slice(idx + marker.length).split('?')[0]
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

function matchesAccept(file: File, accept: string[]): boolean {
  if (accept.length === 0) return true
  return accept.some((a) => (a.endsWith('/') ? file.type.startsWith(a) : file.type === a))
}

/**
 * Estado e ações de um upload para o Supabase Storage: validação, progresso,
 * arrastar-e-soltar, seletor de arquivo e remoção do arquivo anterior.
 */
export function useStorageUpload(options: UseStorageUploadOptions) {
  const {
    bucket = 'site-media',
    folder = 'uploads',
    accept = [],
    maxMb = 10,
    onUpload,
    previousUrl,
    returnPath = false,
    invalidTypeMessage = 'Tipo de arquivo não permitido.',
  } = options

  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  // Último arquivo enviado por este hook (para apagar ao trocar de novo)
  const lastUploaded = useRef<string | null>(null)

  const removeFromBucket = useCallback(async (urlOrPath: string | null | undefined) => {
    const path = storagePathFromUrl(urlOrPath, bucket)
    if (!path) return
    // Falha silenciosa: o arquivo novo já foi salvo; o antigo virar órfão não bloqueia o usuário.
    await supabase.storage.from(bucket).remove([path])
  }, [bucket])

  const upload = useCallback(async (file: File): Promise<string | null> => {
    if (!matchesAccept(file, accept)) {
      setStatus('error')
      setError(invalidTypeMessage)
      return null
    }
    if (file.size > maxMb * 1024 * 1024) {
      setStatus('error')
      setError(`O arquivo deve ter no máximo ${maxMb} MB.`)
      return null
    }

    setStatus('uploading')
    setProgress(10)
    setError(null)

    try {
      const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      setProgress(30)

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || undefined })
      if (upErr) throw upErr
      setProgress(80)

      let result = path
      if (!returnPath) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        result = data.publicUrl
      }

      // Remove o anterior (o informado pelo pai ou o último enviado nesta sessão)
      const toRemove = lastUploaded.current ?? previousUrl
      if (toRemove && toRemove !== result) await removeFromBucket(toRemove)
      lastUploaded.current = result

      setProgress(100)
      setStatus('success')
      onUpload(result)
      window.setTimeout(() => setStatus((s) => (s === 'success' ? 'idle' : s)), 2000)
      return result
    } catch (err) {
      setStatus('error')
      setError(errorMessage(err, 'Erro ao enviar o arquivo. Tente novamente.'))
      return null
    }
  }, [accept, bucket, folder, invalidTypeMessage, maxMb, onUpload, previousUrl, removeFromBucket, returnPath])

  const openPicker = useCallback(() => {
    if (status !== 'uploading') inputRef.current?.click()
  }, [status])

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void upload(file)
    e.target.value = ''
  }, [upload])

  const dragHandlers = {
    onDragOver: (e: DragEvent) => { e.preventDefault(); setIsDragging(true) },
    onDragLeave: () => setIsDragging(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) void upload(file)
    },
  }

  /** Enter/Espaço abrem o seletor (área de soltar acessível por teclado). */
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }, [openPicker])

  /** Limpa o valor no pai (não apaga do bucket: o registro pode não ter sido salvo). */
  const clear = useCallback(() => {
    setStatus('idle')
    setError(null)
    onUpload('')
  }, [onUpload])

  return {
    status,
    progress,
    error,
    isDragging,
    isUploading: status === 'uploading',
    upload,
    clear,
    openPicker,
    onKeyDown,
    dragHandlers,
    inputRef,
    onInputChange,
  }
}
