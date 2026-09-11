import { useQuery } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import { Flag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'

type SymbolType = 'bandeira' | 'brasao' | 'hino' | 'patrimonio' | 'outro'

interface MunicipalSymbol {
  id: string
  title: string
  type: SymbolType
  description: string | null
  content_html: string | null
  image_url: string | null
  audio_url: string | null
  sort_order: number
}

const TYPE_LABELS: Record<SymbolType, string> = {
  bandeira: 'Bandeira', brasao: 'Brasão', hino: 'Hino', patrimonio: 'Patrimônio', outro: 'Símbolo',
}

export function SymbolsPage() {
  const { data: symbols, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['municipal-symbols'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('municipal_symbols')
        .select('id, title, type, description, content_html, image_url, audio_url, sort_order')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as MunicipalSymbol[]
    },
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <PageHeader
        variant="public"
        icon={Flag}
        eyebrow="Identidade municipal"
        title="Símbolos Municipais"
        description="Bandeira, brasão, hino e patrimônio histórico do Município de Água Boa - MT"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {isLoading ? (
          <SkeletonList rows={3} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : symbols && symbols.length > 0 ? (
          <div className="space-y-6">
            {symbols.map((symbol) => (
              <article key={symbol.id} className="card overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  {symbol.image_url && (
                    <div className="sm:w-48 flex-shrink-0">
                      <img
                        src={symbol.image_url}
                        alt={`${TYPE_LABELS[symbol.type] ?? 'Símbolo'}: ${symbol.title}`}
                        className="w-full h-48 sm:h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  <div className="p-6 flex-1 min-w-0">
                    <span className="badge badge-amber mb-2">
                      {TYPE_LABELS[symbol.type] ?? symbol.type}
                    </span>
                    <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{symbol.title}</h2>
                    {symbol.description && (
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{symbol.description}</p>
                    )}
                    {symbol.content_html && (
                      <div
                        className="rich-text"
                        // Conteúdo vem do CMS (admin); mesmo assim é sanitizado antes de renderizar.
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(symbol.content_html) }}
                      />
                    )}
                    {symbol.audio_url && (
                      <audio controls preload="none" className="mt-4 w-full max-w-sm" aria-label={`Áudio: ${symbol.title}`}>
                        <source src={symbol.audio_url} />
                        Seu navegador não suporta a reprodução de áudio.
                      </audio>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Flag}
            title="Símbolos sendo cadastrados"
            description="Em breve o conteúdo estará disponível."
          />
        )}
      </div>
    </div>
  )
}
