import { useState } from 'react'
import { Plus, Trash2, ExternalLink } from 'lucide-react'
import type { SocialPlatform } from '@/types'
import type { WizardStep6 } from './useAgentWizard'

interface Step6Props {
  data: WizardStep6
  onChange: (values: Partial<WizardStep6>) => void
  onNext: () => void
  onBack: () => void
}

const PLATFORMS: { value: SocialPlatform; label: string; placeholder: string; emoji: string }[] = [
  { value: 'INSTAGRAM', label: 'Instagram', placeholder: 'https://instagram.com/seu_perfil', emoji: '📸' },
  { value: 'FACEBOOK', label: 'Facebook', placeholder: 'https://facebook.com/sua_pagina', emoji: '📘' },
  { value: 'YOUTUBE', label: 'YouTube', placeholder: 'https://youtube.com/@seu_canal', emoji: '▶️' },
  { value: 'TIKTOK', label: 'TikTok', placeholder: 'https://tiktok.com/@seu_perfil', emoji: '🎵' },
  { value: 'SPOTIFY', label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...', emoji: '🎧' },
  { value: 'SOUNDCLOUD', label: 'SoundCloud', placeholder: 'https://soundcloud.com/seu_perfil', emoji: '☁️' },
  { value: 'LINKEDIN', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/seu_perfil', emoji: '💼' },
  { value: 'WHATSAPP', label: 'WhatsApp', placeholder: 'https://wa.me/5565999999999', emoji: '💬' },
  { value: 'PORTFOLIO', label: 'Portfólio / Site', placeholder: 'https://seu-site.com.br', emoji: '🎨' },
  { value: 'WEBSITE', label: 'Website', placeholder: 'https://seu-site.com.br', emoji: '🌐' },
  { value: 'OUTRO', label: 'Outro link', placeholder: 'https://...', emoji: '🔗' },
]

export function Step6RedesSociais({ data, onChange, onNext, onBack }: Step6Props) {
  const [newPlatform, setNewPlatform] = useState<SocialPlatform>('INSTAGRAM')
  const [newUrl, setNewUrl] = useState('')

  const addLink = () => {
    if (!newUrl.trim()) return
    const exists = data.links.find((l) => l.platform === newPlatform)
    if (exists) return

    onChange({
      links: [
        ...data.links,
        { platform: newPlatform, url: newUrl.trim(), username: null },
      ],
    })
    setNewUrl('')
  }

  const removeLink = (platform: SocialPlatform) => {
    onChange({ links: data.links.filter((l) => l.platform !== platform) })
  }

  const usedPlatforms = new Set(data.links.map((l) => l.platform))
  const available = PLATFORMS.filter((p) => !usedPlatforms.has(p.value))
  const selectedPlatformMeta = PLATFORMS.find((p) => p.value === newPlatform)

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
        <div className="card p-3 mb-5 space-y-2">
          {data.links.map((link) => {
            const meta = PLATFORMS.find((p) => p.value === link.platform)
            return (
              <div
                key={link.platform}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <span className="text-lg flex-shrink-0">{meta?.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {meta?.label}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {link.url}
                  </div>
                </div>
                <a href={link.url} target="_blank" rel="noreferrer" className="p-1 rounded hover:opacity-70">
                  <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} />
                </a>
                <button onClick={() => removeLink(link.platform)} className="p-1 rounded hover:opacity-70">
                  <Trash2 size={13} style={{ color: 'var(--error)' }} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Adicionar novo */}
      {available.length > 0 && (
        <div className="card p-4 mb-6">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Adicionar link
          </p>
          <div className="space-y-3">
            {/* Seleção da plataforma */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {available.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setNewPlatform(p.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                    newPlatform === p.value ? 'border' : ''
                  }`}
                  style={{
                    background: newPlatform === p.value ? 'rgba(245,158,11,0.1)' : 'var(--bg-secondary)',
                    borderColor: newPlatform === p.value ? 'var(--accent)' : 'transparent',
                    color: newPlatform === p.value ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  <span>{p.emoji}</span>
                  <span className="truncate">{p.label}</span>
                </button>
              ))}
            </div>

            {/* URL */}
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder={selectedPlatformMeta?.placeholder ?? 'https://...'}
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
              />
              <button
                onClick={addLink}
                disabled={!newUrl.trim()}
                className="btn btn-primary flex-shrink-0"
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {available.length === 0 && (
        <div className="text-center py-4 mb-6" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">Todas as plataformas foram adicionadas 🎉</p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-secondary flex-1">Voltar</button>
        <button onClick={onNext} className="btn btn-primary flex-2">
          {data.links.length === 0 ? 'Pular por enquanto' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
