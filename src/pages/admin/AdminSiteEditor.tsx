import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Settings2, ImagePlus, Save, Trash2, GripVertical, X, ArrowUp, ArrowDown } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ImageUploader } from '@/components/ImageUploader'

export function AdminSiteEditor() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'carousel' | 'content'>('carousel')
  const [carouselModal, setCarouselModal] = useState(false)
  const [editingSlide, setEditingSlide] = useState<any>(null)
  // imageUrl controlado manualmente (vem do ImageUploader, não do form)
  const [imageUrl, setImageUrl] = useState<string>('')

  const { register, handleSubmit, reset } = useForm()
  const { register: regContent, handleSubmit: handleContent } = useForm()

  // ─── Carousel ────────────────────────────────────────────────────────────

  const { data: slides } = useQuery({
    queryKey: ['admin-carousel'],
    queryFn: async () => {
      const { data } = await supabase.from('carousel_images').select('*').order('sort_order')
      return data ?? []
    },
  })

  const slideMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, image_url: imageUrl || data.image_url }
      if (editingSlide) {
        await supabase.from('carousel_images').update(payload).eq('id', editingSlide.id)
      } else {
        const order = (slides?.length ?? 0)
        await supabase.from('carousel_images').insert({ ...payload, sort_order: order })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-carousel'] })
      qc.invalidateQueries({ queryKey: ['hero-carousel'] })
      setCarouselModal(false)
      setEditingSlide(null)
      setImageUrl('')
      reset()
    },
  })

  const slideDeleteMutation = useMutation({
    mutationFn: async (id: string) => supabase.from('carousel_images').delete().eq('id', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-carousel'] })
      qc.invalidateQueries({ queryKey: ['hero-carousel'] })
    },
  })

  const slideOrderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      await supabase.from('carousel_images').update({ sort_order: newOrder }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-carousel'] }),
  })

  function openSlide(slide?: any) {
    setEditingSlide(slide ?? null)
    setImageUrl(slide?.image_url ?? '')
    reset(slide ?? { is_active: true })
    setCarouselModal(true)
  }

  function moveSlide(idx: number, direction: 'up' | 'down') {
    if (!slides) return
    const slide = slides[idx]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= slides.length) return
    const swapSlide = slides[swapIdx]
    slideOrderMutation.mutate({ id: slide.id, newOrder: swapSlide.sort_order })
    slideOrderMutation.mutate({ id: swapSlide.id, newOrder: slide.sort_order })
  }

  // ─── Site Content ────────────────────────────────────────────────────────

  const { data: content } = useQuery({
    queryKey: ['admin-site-content'],
    queryFn: async () => {
      const { data } = await supabase.from('site_content').select('*').order('section').order('key')
      return data ?? []
    },
  })

  const contentMutation = useMutation({
    mutationFn: async (formData: any) => {
      const updates = Object.entries(formData).map(([key, value]) => ({
        key,
        value: value as string,
        label: content?.find(c => c.key === key)?.label ?? key,
        type: 'text',
        section: key.split('.')[0],
        updated_at: new Date().toISOString(),
      }))
      for (const upd of updates) {
        await supabase.from('site_content').upsert(upd, { onConflict: 'key' })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-site-content'] }),
  })

  const groupedContent = content?.reduce((acc: any, item: any) => {
    const section = item.section ?? 'geral'
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {})

  const SECTION_LABELS: Record<string, string> = {
    home: '🏠 Página Principal',
    biblioteca: '📚 Biblioteca',
    footer: '🦶 Rodapé',
    geral: '⚙️ Geral',
  }

  // Links amigáveis para o seletor de destino do botão
  const LINK_OPTIONS = [
    { value: '/artistas', label: '🎨 Artistas' },
    { value: '/eventos', label: '📅 Eventos' },
    { value: '/espacos', label: '🏛️ Espaços Culturais' },
    { value: '/editais', label: '📋 Editais' },
    { value: '/projetos', label: '🚀 Projetos' },
    { value: '/biblioteca', label: '📚 Biblioteca' },
    { value: '/oficinas', label: '🎓 Oficinas' },
    { value: '/simbolos', label: '🏁 Símbolos Municipais' },
    { value: '', label: '— Sem botão —' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Settings2 size={24} style={{ color: 'var(--accent)' }} />
          Editor do Site
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Edite o carrossel e todos os textos do site — sem precisar de programação
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-8 w-fit" style={{ background: 'var(--bg-secondary)' }}>
        {([['carousel', '🖼️ Carrossel'], ['content', '✏️ Textos do Site']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'shadow-sm' : ''}`}
            style={activeTab === tab
              ? { background: 'var(--bg-card)', color: 'var(--text-primary)' }
              : { color: 'var(--text-secondary)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Carousel Tab ── */}
      {activeTab === 'carousel' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Slides do Carrossel</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Arraste para reordenar · clique em ✏️ para editar · use + para adicionar novo slide
              </p>
            </div>
            <button onClick={() => openSlide()} className="btn btn-primary">
              <ImagePlus size={16} /> Novo Slide
            </button>
          </div>

          <div className="space-y-3">
            {slides?.map((slide: any, idx: number) => (
              <div
                key={slide.id}
                className="flex items-center gap-4 p-4 rounded-2xl border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <GripVertical size={16} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
                {/* Thumbnail */}
                <div className="w-24 h-14 rounded-xl overflow-hidden flex-shrink-0 relative" style={{ background: 'var(--bg-secondary)' }}>
                  {slide.image_url
                    ? <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{slide.title ?? 'Slide sem título'}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{slide.subtitle ?? '—'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${slide.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {slide.is_active ? 'Ativo' : 'Inativo'}
                </span>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => moveSlide(idx, 'up')} disabled={idx === 0} className="p-1.5 rounded disabled:opacity-30" style={{ color: 'var(--text-secondary)' }}><ArrowUp size={14} /></button>
                  <button onClick={() => moveSlide(idx, 'down')} disabled={idx === (slides.length - 1)} className="p-1.5 rounded disabled:opacity-30" style={{ color: 'var(--text-secondary)' }}><ArrowDown size={14} /></button>
                  <button onClick={() => openSlide(slide)} className="p-1.5 rounded text-amber-600 hover:bg-amber-50">✏️</button>
                  <button onClick={() => { if (confirm('Excluir este slide?')) slideDeleteMutation.mutate(slide.id) }} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}

            {!slides?.length && (
              <div className="text-center py-12 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
                <ImagePlus size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-primary)' }}>Nenhum slide cadastrado</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Clique em "Novo Slide" para adicionar fotos ao carrossel</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Content Tab ── */}
      {activeTab === 'content' && (
        <div>
          <p className="text-sm mb-6 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            💡 Edite qualquer texto abaixo e clique em <strong>Salvar todas as alterações</strong>. As mudanças aparecem instantaneamente no site.
          </p>

          <form onSubmit={handleContent(data => contentMutation.mutate(data))} className="space-y-8">
            {groupedContent && Object.entries(groupedContent).map(([section, items]: [string, any]) => (
              <div key={section} className="rounded-2xl border overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="px-5 py-3 text-sm font-bold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  {SECTION_LABELS[section] ?? section}
                </div>
                <div className="p-5 space-y-4">
                  {items.map((item: any) => (
                    <div key={item.key}>
                      <label className="label">{item.label}</label>
                      {item.value && item.value.length > 100 ? (
                        <textarea
                          {...regContent(item.key)}
                          defaultValue={item.value ?? ''}
                          className="input w-full"
                          rows={3}
                        />
                      ) : (
                        <input
                          {...regContent(item.key)}
                          defaultValue={item.value ?? ''}
                          className="input w-full"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="sticky bottom-4">
              <button type="submit" disabled={contentMutation.isPending} className="btn btn-primary w-full py-3 text-base shadow-lg">
                <Save size={18} />
                {contentMutation.isPending ? 'Salvando...' : '💾 Salvar todas as alterações'}
              </button>
              {contentMutation.isSuccess && (
                <p className="text-center text-sm text-emerald-600 mt-2">✅ Salvo com sucesso!</p>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ═══ Modal de Edição do Slide ═══ */}
      {carouselModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[92vh] overflow-y-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {editingSlide ? '✏️ Editar Slide' : '➕ Novo Slide'}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Preencha as informações do slide do carrossel
                </p>
              </div>
              <button onClick={() => setCarouselModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(data => slideMutation.mutate(data))} className="space-y-5">

              {/* ── Foto (upload simplificado) ── */}
              <div>
                <label className="label text-base font-semibold mb-2 block">
                  📸 Foto do Slide
                </label>
                <ImageUploader
                  currentUrl={imageUrl || undefined}
                  folder="carousel"
                  onUpload={(url) => setImageUrl(url)}
                />
              </div>

              {/* ── Título ── */}
              <div>
                <label className="label">Título <span className="text-red-500">*</span></label>
                <input
                  {...register('title', { required: true })}
                  className="input w-full"
                  placeholder="Ex: Balé e Dança"
                />
              </div>

              {/* ── Subtítulo ── */}
              <div>
                <label className="label">Subtítulo</label>
                <input
                  {...register('subtitle')}
                  className="input w-full"
                  placeholder="Ex: Arte em movimento — espetáculos que encantam"
                />
              </div>

              {/* ── Destino do botão (dropdown amigável) ── */}
              <div>
                <label className="label">🔗 Para onde leva o botão?</label>
                <select {...register('link_url')} className="input w-full">
                  {LINK_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* ── Texto do botão ── */}
              <div>
                <label className="label">Texto do Botão</label>
                <input
                  {...register('link_label')}
                  className="input w-full"
                  placeholder="Ex: Ver Artistas"
                />
              </div>

              {/* ── Ativo ── */}
              <div
                className="flex items-center justify-between p-4 rounded-xl cursor-pointer"
                style={{ background: 'var(--bg-secondary)' }}
                onClick={() => {
                  const el = document.getElementById('slide_active') as HTMLInputElement
                  if (el) el.click()
                }}
              >
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Slide ativo</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Slide inativo não aparece no site</p>
                </div>
                <input
                  {...register('is_active')}
                  type="checkbox"
                  id="slide_active"
                  defaultChecked={editingSlide?.is_active ?? true}
                  className="w-5 h-5 accent-amber-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Aviso se não tem foto */}
              {!imageUrl && (
                <p className="text-xs p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  ⚠️ Adicione uma foto para o slide. Você pode selecionar do seu computador, celular ou câmera.
                </p>
              )}

              {/* ── Ações ── */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCarouselModal(false)} className="btn btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={slideMutation.isPending || !imageUrl}
                  className="btn btn-primary flex-1"
                >
                  {slideMutation.isPending ? '⏳ Salvando...' : '✅ Salvar slide'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
