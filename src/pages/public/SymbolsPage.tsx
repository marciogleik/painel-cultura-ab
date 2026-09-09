import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Flag } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  bandeira: 'Bandeira', brasao: 'Brasão', hino: 'Hino', patrimonio: 'Patrimônio', outro: 'Símbolo',
}

export function SymbolsPage() {
  const { data: symbols, isLoading } = useQuery({
    queryKey: ['municipal-symbols'],
    queryFn: async () => {
      const { data } = await supabase.from('municipal_symbols').select('*').eq('is_active', true).order('sort_order')
      return data ?? []
    },
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div style={{ background: 'var(--bg-inst-header)', borderBottom: '3px solid var(--accent)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-2">
            <Flag size={32} style={{ color: 'var(--accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-inst-title)' }}>Símbolos Municipais</h1>
          </div>
          <p style={{ color: 'var(--text-inst-subtitle)' }}>Bandeira, brasão, hino e patrimônio histórico do Município de Água Boa - MT</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {isLoading ? (
          <div className="space-y-6">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-2xl border animate-pulse h-40" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} />)}</div>
        ) : symbols && symbols.length > 0 ? (
          <div className="space-y-6">
            {symbols.map((symbol: any) => (
              <div key={symbol.id} className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex flex-col sm:flex-row">
                  {symbol.image_url && (
                    <div className="sm:w-48 flex-shrink-0">
                      <img src={symbol.image_url} alt={symbol.title} className="w-full h-48 sm:h-full object-cover" />
                    </div>
                  )}
                  <div className="p-6 flex-1">
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                      {TYPE_LABELS[symbol.type] ?? symbol.type}
                    </span>
                    <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{symbol.title}</h2>
                    {symbol.description && <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{symbol.description}</p>}
                    {symbol.content_html && (
                      <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}
                        dangerouslySetInnerHTML={{ __html: symbol.content_html }} />
                    )}
                    {symbol.audio_url && (
                      <audio controls className="mt-4 w-full max-w-sm">
                        <source src={symbol.audio_url} />
                      </audio>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Flag size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Símbolos sendo cadastrados</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Em breve o conteúdo estará disponível</p>
          </div>
        )}
      </div>
    </div>
  )
}
