import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { errorMessage } from '@/lib/utils'

interface UseCrudOptions<T> {
  /** Nome da tabela no Supabase */
  table: string
  /** Chave de cache; por padrão ['crud', table] */
  queryKey?: readonly unknown[]
  /** Colunas/relações do select; padrão '*' */
  select?: string
  /** Ordenação: [coluna, ascendente] */
  orderBy?: [keyof T & string, boolean]
  /** Outras chaves de cache a invalidar após salvar/excluir (ex.: as das páginas públicas) */
  invalidate?: readonly (readonly unknown[])[]
  /** Campos que nunca devem ser reenviados no update (além de id/created_at/updated_at) */
  omitOnSave?: (keyof T & string)[]
  successMessage?: { save?: string; remove?: string }
}

const ALWAYS_OMIT = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

/**
 * CRUD genérico para as telas administrativas: lista, salva (insert ou update) e exclui,
 * com erro tratado (nada "salva" silenciosamente) e cache invalidado.
 */
export function useCrud<T extends { id: string }>(options: UseCrudOptions<T>) {
  const { table, select = '*', orderBy, invalidate = [], omitOnSave = [], successMessage } = options
  const queryKey = options.queryKey ?? ['crud', table]
  const qc = useQueryClient()
  const toast = useToast()

  const list = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase.from(table).select(select)
      if (orderBy) q = q.order(orderBy[0], { ascending: orderBy[1] })
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as T[]
    },
  })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey })
    invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }))
  }

  const save = useMutation({
    mutationFn: async (values: Partial<T> & { id?: string }) => {
      const { id, ...rest } = values
      const payload: Record<string, unknown> = { ...rest }
      for (const k of [...ALWAYS_OMIT, ...omitOnSave]) delete payload[k]
      // Strings vazias viram null (uuid/date/numeric não aceitam '')
      for (const [k, v] of Object.entries(payload)) if (v === '') payload[k] = null

      if (id) {
        const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single()
        if (error) throw error
        return data as T
      }
      const { data, error } = await supabase.from(table).insert(payload).select().single()
      if (error) throw error
      return data as T
    },
    onSuccess: () => {
      invalidateAll()
      toast.success(successMessage?.save ?? 'Salvo com sucesso.')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidateAll()
      toast.success(successMessage?.remove ?? 'Excluído.')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return {
    items: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error,
    refetch: list.refetch,
    save,
    remove,
    invalidateAll,
  }
}
