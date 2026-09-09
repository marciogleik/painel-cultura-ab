import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getMyArtistProfile } from '@/services/artistService'
import { supabase } from '@/lib/supabase'
import { Shield, Eye, EyeOff, Save } from 'lucide-react'
import { useState, useEffect } from 'react'

interface PrivacyForm {
  show_phone: boolean
  show_email: boolean
  show_social: boolean
  show_location: boolean
  show_birthdate: boolean
}

export function PrivacySettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: artist } = useQuery({
    queryKey: ['my-artist', user?.id],
    queryFn: () => getMyArtistProfile(user!.id),
    enabled: !!user,
  })

  const [form, setForm] = useState<PrivacyForm>({
    show_phone: false,
    show_email: false,
    show_social: true,
    show_location: true,
    show_birthdate: false,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const ps = (artist as any)?.privacy_settings
    if (ps) setForm({
      show_phone: ps.show_phone,
      show_email: ps.show_email,
      show_social: ps.show_social,
      show_location: ps.show_location,
      show_birthdate: ps.show_birthdate,
    })
  }, [artist])

  const mutation = useMutation({
    mutationFn: async (data: PrivacyForm) => {
      if (!artist) return
      const { error } = await supabase
        .from('privacy_settings')
        .update(data)
        .eq('artist_id', artist.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-artist'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const settings = [
    { key: 'show_phone' as const, label: 'Exibir telefone', description: 'Mostrar número de telefone no perfil público' },
    { key: 'show_email' as const, label: 'Exibir e-mail', description: 'Mostrar endereço de e-mail no perfil público' },
    { key: 'show_social' as const, label: 'Exibir redes sociais', description: 'Mostrar links das redes sociais no perfil público' },
    { key: 'show_location' as const, label: 'Exibir localização', description: 'Mostrar cidade e bairro no perfil público' },
    { key: 'show_birthdate' as const, label: 'Exibir data de nascimento', description: 'Mostrar data de nascimento no perfil público' },
  ]

  if (!artist) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Privacidade (LGPD)</h1>
        <div className="card p-12 text-center">
          <Shield className="mx-auto h-12 w-12 mb-4 text-amber-400/40" />
          <p className="text-sm text-slate-900 dark:text-white mb-4">Crie seu perfil artístico primeiro para acessar as configurações de privacidade.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Privacidade (LGPD)</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Controle quais informações são visíveis no seu perfil público
        </p>
      </div>

      <div className="card p-2 mb-4 text-xs p-4" style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.2)' }}>
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p style={{ color: 'var(--text-secondary)' }}>
            De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem o direito de controlar
            o acesso às suas informações pessoais. As configurações abaixo se aplicam ao seu perfil público.
          </p>
        </div>
      </div>

      {saved && (
        <div className="mb-4 p-3 rounded-lg text-sm text-emerald-400 border border-emerald-500/20 bg-emerald-500/5">
          ✓ Configurações salvas com sucesso
        </div>
      )}

      <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
        {settings.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between p-5">
            <div className="flex items-start gap-3">
              {form[key] ? (
                <Eye className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <EyeOff className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
              )}
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
              </div>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${form[key] ? 'bg-amber-500' : 'bg-slate-600'
                }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${form[key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => mutation.mutate(form)}
        disabled={mutation.isPending}
        className="btn btn-primary mt-6"
      >
        {mutation.isPending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Salvar preferências
      </button>
    </div>
  )
}