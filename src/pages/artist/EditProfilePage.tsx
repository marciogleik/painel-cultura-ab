import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getMyArtistProfile, createArtistProfile, updateArtistProfile } from '@/services/artistService'
import { supabase } from '@/lib/supabase'
import { Save, User } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

const schema = z.object({
  artistic_name: z.string().optional(),
  biography: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  city: z.string().min(1, 'Cidade obrigatória'),
  neighborhood: z.string().optional(),
  state: z.string().min(1, 'Estado obrigatório'),
  musical_genre: z.string().optional(),
  experience_years: z.coerce.number().min(0).max(80).optional(),
  is_available: z.boolean(),
  is_public: z.boolean(),
})

type FormData = z.infer<typeof schema>

export function EditProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: artist } = useQuery({
    queryKey: ['my-artist', user?.id],
    queryFn: () => getMyArtistProfile(user!.id),
    enabled: !!user,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
      return data ?? []
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    // @ts-expect-error - version mismatch between @hookform/resolvers and react-hook-form types
    resolver: zodResolver(schema),
    defaultValues: { city: 'Água Boa', state: 'MT', is_available: true, is_public: true },
  })

  const selectedCategory = watch('category_id')

  const { data: subcategories } = useQuery({
    queryKey: ['subcategories', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return []
      const { data } = await supabase.from('subcategories').select('*').eq('category_id', selectedCategory).order('sort_order')
      return data ?? []
    },
    enabled: !!selectedCategory,
  })

  useEffect(() => {
    if (artist) reset({
      artistic_name: artist.artistic_name ?? '',
      biography: artist.biography ?? '',
      category_id: artist.category_id ?? '',
      subcategory_id: artist.subcategory_id ?? '',
      city: artist.city,
      neighborhood: artist.neighborhood ?? '',
      state: artist.state,
      musical_genre: artist.musical_genre ?? '',
      experience_years: artist.experience_years ?? undefined,
      is_available: artist.is_available,
      is_public: artist.is_public,
    })
  }, [artist, reset])

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (artist) {
        return updateArtistProfile(artist.id, data)
      } else {
        return createArtistProfile(user!.id, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-artist'] })
      navigate('/painel/meu-perfil')
    },
  })

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{artist ? 'Editar Perfil' : 'Criar Perfil Artístico'}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Suas informações aparecerão no banco de talentos municipal
        </p>
      </div>

      {mutation.isError && (
        <div className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-500/20 bg-red-500/5">
          Erro ao salvar. Tente novamente.
        </div>
      )}

      {/* Aviso direcionamento SMIIC */}
      <div className="mb-6 p-4 rounded-2xl border" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(245,158,11,0.08) 100%)', borderColor: 'rgba(124,58,237,0.2)' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 uppercase tracking-wider">
              🏛️ Cadastro Oficial SMIIC
            </span>
            <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              Procurando o Cadastro de Agente Cultural com Tipologias 1 e 2?
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Acesse o fluxo completo do Sistema Municipal com os 3 níveis de tipologia oficial.
            </p>
          </div>
          <Link
            to="/painel/agentes/cadastrar"
            className="btn btn-primary text-xs py-2 px-3 flex-shrink-0"
          >
            Ir para Cadastro SMIIC →
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d as unknown as FormData))} className="space-y-6">
        {/* Basic info */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-amber-400" />
            Informações Básicas
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Nome Artístico
              </label>
              <input type="text" {...register('artistic_name')} className="input" placeholder="Como você é conhecido(a)" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Biografia <span style={{ color: 'var(--text-muted)' }}>(máx. 1000 caracteres)</span>
              </label>
              <textarea
                {...register('biography')}
                className="input"
                rows={5}
                placeholder="Conte sua história como artista..."
              />
              {errors.biography && <p className="mt-1 text-xs text-red-400">{errors.biography.message}</p>}
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Área de Atuação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Categoria *
              </label>
              <select {...register('category_id')} className="input">
                <option value="">Selecione...</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            {selectedCategory && subcategories && subcategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Subcategoria
                </label>
                <select {...register('subcategory_id')} className="input">
                  <option value="">Selecione...</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Gênero / Estilo Musical
              </label>
              <input type="text" {...register('musical_genre')} className="input" placeholder="Ex: Sertanejo, Gospel, MPB..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Anos de Experiência
              </label>
              <input type="number" min={0} max={80} {...register('experience_years')} className="input" placeholder="0" />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Localização</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cidade *</label>
              <input type="text" {...register('city')} className={`input ${errors.city ? 'input-error' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Bairro</label>
              <input type="text" {...register('neighborhood')} className="input" placeholder="Seu bairro" />
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Configurações de Visibilidade</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('is_public')} className="h-4 w-4 rounded accent-amber-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Perfil Público</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Aparecer na pesquisa pública e banco de talentos
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('is_available')} className="h-4 w-4 rounded accent-amber-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Disponível para eventos</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Indicar que você aceita propostas de contratação e participação
                </p>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="btn btn-primary"
        >
          {mutation.isPending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mutation.isPending ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </form>
    </div>
  )
}
