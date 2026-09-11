import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Users, UserCheck, UserX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { errorMessage, formatDate, formatPhone } from '@/lib/utils'
import type { Profile, UserRole } from '@/types'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'
import { AdminTable, IconButton, type AdminColumn } from '@/components/admin/AdminTable'

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super administrador',
  ADMIN_CULTURA: 'Administrador de cultura',
  GESTOR: 'Gestor',
  SERVIDOR: 'Servidor (leitura)',
  ARTISTA: 'Agente cultural',
  USUARIO_PUBLICO: 'Usuário público',
}

const ROLE_BADGE: Record<UserRole, string> = {
  SUPER_ADMIN: 'badge-red',
  ADMIN_CULTURA: 'badge-amber',
  GESTOR: 'badge-blue',
  SERVIDOR: 'badge-slate',
  ARTISTA: 'badge-green',
  USUARIO_PUBLICO: 'badge-slate',
}

const ALL_ROLES = Object.keys(ROLE_LABELS) as UserRole[]

export function AdminUsers() {
  const { user, role: myRole, isAdmin } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const isSuperAdmin = myRole === 'SUPER_ADMIN'

  const query = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
  const users = useMemo(() => query.data ?? [], [query.data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.full_name?.toLowerCase().includes(q) || ROLE_LABELS[u.role]?.toLowerCase().includes(q))
  }, [users, search])

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Profile, 'role' | 'is_active'>> }) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Usuário atualizado.')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  /** Pode alterar este usuário? Nunca a si mesmo; SUPER_ADMIN só é alterado por SUPER_ADMIN. */
  function canEdit(u: Profile) {
    if (!isAdmin || u.id === user?.id) return false
    if (u.role === 'SUPER_ADMIN' && !isSuperAdmin) return false
    return true
  }

  async function changeRole(u: Profile, role: UserRole) {
    if (role === u.role) return
    const ok = await confirm({
      title: `Alterar perfil de ${u.full_name}?`,
      message: `De "${ROLE_LABELS[u.role]}" para "${ROLE_LABELS[role]}". O usuário passa a ter as permissões do novo perfil imediatamente.`,
      confirmLabel: 'Alterar perfil',
    })
    if (ok) update.mutate({ id: u.id, patch: { role } })
  }

  async function toggleActive(u: Profile) {
    const deactivating = u.is_active
    const ok = await confirm({
      title: deactivating ? `Desativar ${u.full_name}?` : `Reativar ${u.full_name}?`,
      message: deactivating ? 'O usuário perde o acesso ao sistema até ser reativado.' : 'O usuário volta a acessar o sistema com o perfil atual.',
      danger: deactivating,
      confirmLabel: deactivating ? 'Desativar' : 'Reativar',
    })
    if (ok) update.mutate({ id: u.id, patch: { is_active: !u.is_active } })
  }

  const columns: AdminColumn<Profile>[] = [
    {
      key: 'user', header: 'Usuário',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }} aria-hidden="true">
            {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-white">{(u.full_name ?? '?').charAt(0).toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {u.full_name}{u.id === user?.id && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(você)</span>}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.phone ? formatPhone(u.phone) : `Desde ${formatDate(u.created_at)}`}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Perfil',
      render: (u) => canEdit(u) ? (
        <>
          <label htmlFor={`role-${u.id}`} className="sr-only">Perfil de {u.full_name}</label>
          <select
            id={`role-${u.id}`}
            value={u.role}
            disabled={update.isPending}
            onChange={(e) => changeRole(u, e.target.value as UserRole)}
            onClick={(e) => e.stopPropagation()}
            className="input py-1.5 text-xs"
          >
            {ALL_ROLES.filter((r) => r !== 'SUPER_ADMIN' || isSuperAdmin).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </>
      ) : (
        <span className={`badge text-xs ${ROLE_BADGE[u.role] ?? 'badge-slate'}`}>{ROLE_LABELS[u.role] ?? u.role}</span>
      ),
    },
    { key: 'since', header: 'Cadastro', render: (u) => formatDate(u.created_at) },
    { key: 'active', header: 'Situação', render: (u) => <span className={`badge text-xs ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? 'Ativo' : 'Inativo'}</span> },
    {
      key: 'actions', header: <span className="sr-only">Ações</span>, align: 'right',
      render: (u) => canEdit(u) ? (
        <IconButton label={u.is_active ? `Desativar ${u.full_name}` : `Reativar ${u.full_name}`} tone={u.is_active ? 'danger' : 'success'} onClick={() => toggleActive(u)} disabled={update.isPending}>
          {u.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
        </IconButton>
      ) : null,
    },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader icon={Users} title="Usuários" description={`${users.length} usuário(s) cadastrado(s). ${isAdmin ? 'Altere perfis e ative ou desative contas.' : 'Visualização somente leitura.'}`} />

      <div className="mb-4 max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou perfil" label="Buscar usuários" />
      </div>

      {query.isLoading ? (
        <SkeletonList rows={5} />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usuário encontrado" description={search ? 'Tente outro termo de busca.' : 'Os usuários cadastrados aparecerão aqui.'} />
      ) : (
        <AdminTable columns={columns} rows={filtered} caption="Usuários cadastrados" />
      )}
    </div>
  )
}
