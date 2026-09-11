import { ShoppingBag, Eye, EyeOff, Star, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCrud } from '@/hooks/useCrud'
import { formatDate, safeUrl } from '@/lib/utils'
import type { CulturalProduct } from '@/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { AdminTable, IconButton, type AdminColumn } from '@/components/admin/AdminTable'

const PRODUCT_TYPE_LABELS: Record<CulturalProduct['type'], string> = {
  peca_teatro: 'Peça de teatro', show: 'Show', album: 'Álbum', livro: 'Livro',
  exposicao: 'Exposição', filme: 'Filme', danca: 'Dança', artesanato: 'Artesanato',
  grafite: 'Grafite', outro: 'Produto cultural',
}

/** Linha da moderação: produto + nome do agente (novo cadastro) ou do artista (legado). */
interface ProductRow extends CulturalProduct {
  artists?: { artistic_name: string | null; profiles?: { full_name: string } | null } | null
}

function ownerName(p: ProductRow): string {
  return p.cultural_agents?.display_name ?? p.artists?.artistic_name ?? p.artists?.profiles?.full_name ?? 'Agente não identificado'
}

export function AdminProducts() {
  const { isAdmin } = useAuth()

  const crud = useCrud<ProductRow>({
    table: 'cultural_products',
    queryKey: ['admin-products'],
    select: '*, cultural_agents(id, display_name, photo_url), artists(artistic_name, profiles(full_name))',
    orderBy: ['created_at', false],
    invalidate: [['public-products'], ['my-products']],
    successMessage: { save: 'Produto atualizado.' },
  })

  function toggle(p: ProductRow, field: 'is_active' | 'is_featured') {
    // Envia apenas o campo alterado, nunca a linha inteira (que traz as relações embutidas).
    crud.save.mutate({ id: p.id, [field]: !p[field] })
  }

  const columns: AdminColumn<ProductRow>[] = [
    {
      key: 'product', header: 'Produto',
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.cover_url ? (
            <img src={p.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" style={{ background: 'var(--bg-secondary)' }} />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-secondary)' }} aria-hidden="true"><ShoppingBag size={16} style={{ color: 'var(--text-muted)' }} /></div>
          )}
          <div className="min-w-0">
            <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cadastrado em {formatDate(p.created_at)}</p>
          </div>
        </div>
      ),
    },
    { key: 'owner', header: 'Agente cultural', render: (p) => ownerName(p) },
    { key: 'type', header: 'Tipo', render: (p) => PRODUCT_TYPE_LABELS[p.type] ?? p.type },
    { key: 'views', header: 'Visualizações', align: 'right', render: (p) => p.views ?? 0 },
    {
      key: 'link', header: 'Link',
      render: (p) => {
        const url = safeUrl(p.external_link)
        return url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: 'var(--accent)' }}>
            <ExternalLink size={12} /> Abrir
          </a>
        ) : '—'
      },
    },
    {
      key: 'active', header: 'Ativo', align: 'center',
      render: (p) => (
        <IconButton
          label={p.is_active ? 'Ativo — clique para ocultar do site' : 'Oculto — clique para publicar'}
          onClick={() => toggle(p, 'is_active')}
          tone={p.is_active ? 'success' : 'danger'}
          disabled={!isAdmin || crud.save.isPending}
        >
          {p.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
        </IconButton>
      ),
    },
    {
      key: 'featured', header: 'Destaque', align: 'center',
      render: (p) => (
        <IconButton
          label={p.is_featured ? 'Em destaque — clique para remover o destaque' : 'Sem destaque — clique para destacar'}
          onClick={() => toggle(p, 'is_featured')}
          tone={p.is_featured ? 'primary' : 'neutral'}
          disabled={!isAdmin || crud.save.isPending}
        >
          <Star size={16} className={p.is_featured ? 'fill-current' : ''} />
        </IconButton>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={ShoppingBag}
        title="Produtos Culturais"
        description="Modere os produtos cadastrados pelos agentes culturais: publique, oculte ou destaque."
      />

      {crud.isLoading ? (
        <SkeletonList rows={5} />
      ) : crud.error ? (
        <ErrorState error={crud.error} onRetry={() => crud.refetch()} />
      ) : crud.items.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Nenhum produto cadastrado" description="Os produtos cadastrados pelos agentes culturais aparecerão aqui para moderação." />
      ) : (
        <AdminTable columns={columns} rows={crud.items} caption="Produtos culturais cadastrados pelos agentes" />
      )}
    </div>
  )
}
