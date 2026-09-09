import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BookOpen, Clock, MapPin, Phone, Search } from 'lucide-react'
import { useState } from 'react'

export function LibraryPage() {
  const [search, setSearch] = useState('')

  const { data: content } = useQuery({
    queryKey: ['library-content'],
    queryFn: async () => {
      const { data } = await supabase.from('site_content').select('key, value').like('key', 'library.%')
      return Object.fromEntries((data ?? []).map(d => [d.key, d.value]))
    },
  })

  const { data: books } = useQuery({
    queryKey: ['library-books', search],
    queryFn: async () => {
      let q = supabase.from('library_books').select('*').order('title')
      if (search) q = q.ilike('title', `%${search}%`)
      const { data } = await q
      return data ?? []
    },
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div style={{ background: 'var(--bg-inst-header)', borderBottom: '3px solid var(--accent)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={32} style={{ color: 'var(--accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-inst-title)' }}>
              {content?.['library.name'] ?? 'Biblioteca Pública Municipal'}
            </h1>
          </div>
          <p style={{ color: 'var(--text-inst-subtitle)' }}>
            {content?.['library.about'] ?? 'Acesso gratuito ao conhecimento para todos os cidadãos'}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Informações */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Clock, label: 'Horário de Funcionamento', value: content?.['library.hours'] ?? '' },
            { icon: MapPin, label: 'Endereço', value: content?.['library.address'] ?? '' },
            { icon: Phone, label: 'Telefone', value: content?.['library.phone'] ?? 'Não informado' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex gap-3 p-4 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                <Icon size={20} className="text-blue-600 dark:text-blue-400" />
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
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar livro..." className="input pl-10 w-full" />
        </div>

        {books && books.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {books.map((book: any) => (
              <div key={book.id} className="rounded-xl border p-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="aspect-[2/3] rounded-lg mb-3 flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                  {book.cover_url ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover rounded-lg" /> : <BookOpen size={32} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{book.title}</p>
                {book.author && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{book.author}</p>}
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 ${book.is_available ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                  {book.is_available ? 'Disponível' : 'Emprestado'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
            <BookOpen size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Acervo sendo catalogado</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Em breve o acervo completo estará disponível</p>
          </div>
        )}
      </div>
    </div>
  )
}
