import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Clock, MapPin, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sanitizeSearch } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonGrid } from '@/components/ui/Spinner'

interface LibraryBook {
  id: string
  title: string
  author: string | null
  genre: string | null
  year: number | null
  cover_url: string | null
  is_available: boolean
}

interface SiteContentRow {
  key: string
  value: string | null
}

export function LibraryPage() {
  // `search` só muda depois do debounce do SearchInput, então a query só roda então.
  const [search, setSearch] = useState('')

  const { data: content } = useQuery({
    queryKey: ['site-content', 'library'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_content').select('key, value').like('key', 'library.%')
      if (error) throw error
      return Object.fromEntries(((data ?? []) as SiteContentRow[]).map((d) => [d.key, d.value ?? ''])) as Record<string, string>
    },
  })

  const { data: books, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['library-books', search],
    queryFn: async () => {
      let q = supabase
        .from('library_books')
        .select('id, title, author, genre, year, cover_url, is_available')
        .order('title')
        .limit(200)
      const term = sanitizeSearch(search)
      if (term) q = q.or(`title.ilike.%${term}%,author.ilike.%${term}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as LibraryBook[]
    },
    placeholderData: (prev) => prev,
  })

  const text = (key: string, fallback: string) => content?.[key] || fallback

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <PageHeader
        variant="public"
        icon={BookOpen}
        eyebrow="Leitura para todos"
        title={text('library.name', 'Biblioteca Pública Municipal')}
        description={text('library.about', 'Acesso gratuito ao conhecimento para todos os cidadãos')}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Informações */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Clock, label: 'Horário de Funcionamento', value: text('library.hours', '') },
            { icon: MapPin, label: 'Endereço', value: text('library.address', '') },
            { icon: Phone, label: 'Telefone', value: text('library.phone', 'Não informado') },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="card flex gap-3 p-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                <Icon size={20} className="text-blue-700 dark:text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value || '—'}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Acervo */}
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Acervo</h2>
        <SearchInput
          className="mb-6 max-w-md"
          value={search}
          onChange={setSearch}
          label="Buscar no acervo"
          placeholder="Buscar por título ou autor..."
        />

        {isLoading ? (
          <SkeletonGrid items={5} className="sm:grid-cols-3 lg:grid-cols-5" />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : books && books.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {books.map((book) => (
              <div key={book.id} className="card p-3">
                <div className="aspect-[2/3] rounded-lg mb-3 flex items-center justify-center overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={`Capa de ${book.title}`} className="w-full h-full object-cover rounded-lg" loading="lazy" decoding="async" />
                  ) : (
                    <BookOpen size={32} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                  )}
                </div>
                <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{book.title}</p>
                {book.author && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{book.author}</p>}
                {book.year !== null && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{book.year}</p>}
                <span className={`badge mt-2 ${book.is_available ? 'badge-green' : 'badge-red'}`}>
                  {book.is_available ? 'Disponível' : 'Emprestado'}
                </span>
              </div>
            ))}
          </div>
        ) : search ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum livro encontrado"
            description={`Não encontramos resultados para "${search}".`}
            action={<button type="button" className="btn btn-secondary" onClick={() => setSearch('')}>Limpar busca</button>}
          />
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Acervo sendo catalogado"
            description="Em breve o acervo completo estará disponível."
          />
        )}
      </div>
    </div>
  )
}
