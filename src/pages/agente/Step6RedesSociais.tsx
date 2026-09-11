import { useState } from 'react'
import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { safeUrl } from '@/lib/utils'
import { Field } from './Field'
import type { SocialPlatform } from '@/types'
import type { WizardStep6 } from './useAgentWizard'

interface Step6Props {
  data: WizardStep6
  onChange: (values: Partial<WizardStep6>) => void
  onNext: () => void
  onBack: () => void
  isSaving: boolean
}

const PLATFORMS: { value: SocialPlatform; label: string; placeholder: string; emoji: string }[] = [
  { value: 'INSTAGRAM', label: 'Instagram', placeholder: 'https://instagram.com/seu_perfil', emoji: '📸' },
  { value: 'FACEBOOK', label: 'Facebook', placeholder: 'https://facebook.com/sua_pagina', emoji: '📘' },
  { value: 'YOUTUBE', label: 'YouTube', placeholder: 'https://youtube.com/@seu_canal', emoji: '▶️' },
  { value: 'TIKTOK', label: 'TikTok', placeholder: 'https://tiktok.com/@seu_perfil', emoji: '🎵' },
  { value: 'SPOTIFY', label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...', emoji: '🎧' },
  { value: 'SOUNDCLOUD', label: 'SoundCloud', placeholder: 'https://soundcloud.com/seu_perfil', emoji: '☁️' },
  { value: 'LINKEDIN', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/seu_perfil', emoji: '💼' },
  { value: 'WHATSAPP', label: 'WhatsApp', placeholder: 'https://wa.me/5566999999999', emoji: '💬' },
  { value: 'PORTFOLIO', label: 'Portfólio / Site', placeholder: 'https://seu-site.com.br', emoji: '🎨' },
  { value: 'WEBSITE', label: 'Website', placeholder: 'https://seu-site.com.br', emoji: '🌐' },
  { value: 'OUTRO', label: 'Outro link', placeholder: 'https://...', emoji: '🔗' },
]

export function Step6RedesSociais({ data, onChange, onNext, onBack, isSaving }: Step6Props) {
  const [newPlatform, setNewPlatform] = useState<SocialPlatform>('INSTAGRAM')
  const [newUrl, setNewUrl] = useState('')
  const [urlError, setUrlError] = useState('')

  const usedPlatforms = new Set(data.links.map((l) => l.platform))
  const available = PLATFORMS.filter((p) => !usedPlatforms.has(p.value))
  const activePlatform = available.some((p) => p.value === newPlatform) ? newPlatform : available[0]?.value
  const selectedPlatformMeta = PLATFORMS.find((p) => p.value === activePlatform)

  const addLink = () => {
    if (!activePlatform) return
    const normalized = safeUrl(newUrl)
    if (!normalized) {
      setUrlError('Informe um endereço válido começando com https:// (ex.: https://instagram.com/seu_perfil).')
      return
    }
    if (usedPlatforms.has(activePlatform)) {
      setUrlError('Esta plataforma já foi adicionada. Remova o link atual para trocar.')
      return
    }
    onChange({ links: [...data.links, { platform: activePlatform, url: normalized, username: null }] })
    setNewUrl('')
    setUrlError('')
  }

  const removeLink = (platform: SocialPlatform) => {
    onChange({ links: data.links.filter((l) => l.platform !== platform) })
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Redes sociais e links
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Adicione seus perfis nas redes sociais e outros links relevantes para seu trabalho.
        </p>
      </div>

      {/* Links já adicionados */}
      {data.links.length > 0 && (
        <ul className="card p-3 mb-5 space-y-2 list-none m-0" aria-label="Links adicionados">
          {data.links.map((link) => {
            const meta = PLATFORMS.find((p) => p.value === link.platform)
            const href = safeUrl(link.url)
            return (
              <li
                key={link.platform}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <span className="text-lg flex-shrink-0" aria-hidden="true">{meta?.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {meta?.label ?? link.platform}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {link.url}
                  </div>
                </div>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:opacity-70"
                    aria-label={`Abrir ${meta?.label ?? link.platform} em nova aba`}
                  >
                    <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeLink(link.platform)}
                  className="p-1 rounded hover:opacity-70"
                  aria-label={`Remover link do ${meta?.label ?? link.platform}`}
                >
                  <Trash2 size={13} style={{ color: 'var(--error)' }} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Adicionar novo */}
      {available.length > 0 && activePlatform && (
        <div className="card p-4 mb-6">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Adicionar link
          </p>
          <div className="space-y-3">
            {/* Seleção da plataforma */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Plataforma">
              {available.map((p) => {
                const active = activePlatform === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => { setNewPlatform(p.value); setUrlError('') }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${active ? 'border' : ''}`}
                    style={{
                      background: active ? 'rgba(245,158,11,0.1)' : 'var(--bg-secondary)',
                      borderColor: active ? 'var(--accent)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <span aria-hidden="true">{p.emoji}</span>
                    <span className="truncate">{p.label}</span>
                  </button>
                )
              })}
            </div>

            {/* URL */}
            <Field label={`Endereço (${selectedPlatformMeta?.label ?? 'link'})`} error={urlError}>
              <div className="flex gap-2">
                <input
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  className={`input flex-1 ${urlError ? 'input-error' : ''}`}
                  placeholder={selectedPlatformMeta?.placeholder ?? 'https://...'}
                  value={newUrl}
                  onChange={(e) => { setNewUrl(e.target.value); setUrlError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
                />
                <button
                  type="button"
                  onClick={addLink}
                  disabled={!newUrl.trim()}
                  className="btn btn-primary flex-shrink-0"
                >
                  <Plus size={16} aria-hidden="true" /> Adicionar
                </button>
              </div>
            </Field>
          </div>
        </div>
      )}

      {available.length === 0 && (
        <div className="text-center py-4 mb-6" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">Todas as plataformas foram adicionadas.</p>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} disabled={isSaving} className="btn btn-secondary flex-1">Voltar</button>
        <LoadingButton type="button" onClick={onNext} loading={isSaving} className="btn btn-primary flex-2">
          {data.links.length === 0 ? 'Pular por enquanto' : 'Continuar'}
        </LoadingButton>
      </div>
    </div>
  )
}
