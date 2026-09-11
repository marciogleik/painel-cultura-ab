import { useEffect, useId, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { ErrorState, EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Spinner'

export interface SiteContentRow {
  id: string
  key: string
  label: string
  value: string | null
  type: 'text' | 'html' | 'image' | 'url'
  section: string | null
}

interface SiteContentFormProps {
  /** Só as chaves que começam com este prefixo (ex.: "library.") */
  keyPrefix?: string
  /** Agrupa os campos por `section` */
  grouped?: boolean
  sectionLabels?: Record<string, string>
  canWrite?: boolean
  submitLabel?: string
}

/**
 * Textos editáveis do site (tabela site_content). Os campos são registrados pelo `id`
 * (as chaves têm pontos, que o react-hook-form interpreta como caminho) e só os
 * valores alterados são enviados, cada um como update pelo id.
 */
export function SiteContentForm({ keyPrefix, grouped = false, sectionLabels = {}, canWrite = true, submitLabel = 'Salvar textos' }: SiteContentFormProps) {
  const qc = useQueryClient()
  const toast = useToast()
  const formId = useId()

  const query = useQuery({
    queryKey: ['admin-site-content', keyPrefix ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('site_content').select('id, key, label, value, type, section').order('section').order('key')
      if (keyPrefix) q = q.like('key', `${keyPrefix}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as SiteContentRow[]
    },
  })
  const rows = useMemo(() => query.data ?? [], [query.data])

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<Record<string, string>>()

  useEffect(() => {
    reset(Object.fromEntries(rows.map((r) => [r.id, r.value ?? ''])))
  }, [rows, reset])

  const mutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const changed = rows.filter((r) => (values[r.id] ?? '') !== (r.value ?? ''))
      if (changed.length === 0) return 0
      const results = await Promise.all(
        changed.map((r) => supabase.from('site_content').update({ value: values[r.id] ?? '', updated_at: new Date().toISOString() }).eq('id', r.id)),
      )
      const failed = results.find((res) => res.error)
      if (failed?.error) throw failed.error
      return changed.length
    },
    onSuccess: (count) => {
      if (count === 0) {
        toast.info('Nenhum texto foi alterado.')
        return
      }
      qc.invalidateQueries({ queryKey: ['admin-site-content'] })
      qc.invalidateQueries({ queryKey: ['site-content'] })
      toast.success(count === 1 ? '1 texto atualizado.' : `${count} textos atualizados.`)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (query.isLoading) return <SkeletonList rows={4} />
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (rows.length === 0) return <EmptyState title="Nenhum texto editável" description="Os textos do site ainda não foram cadastrados no banco." />

  const groups: [string, SiteContentRow[]][] = grouped
    ? Array.from(rows.reduce((acc, r) => {
        const section = r.section ?? 'geral'
        acc.set(section, [...(acc.get(section) ?? []), r])
        return acc
      }, new Map<string, SiteContentRow[]>()).entries())
    : [['', rows]]

  return (
    <form id={formId} onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-6" noValidate>
      <fieldset disabled={!canWrite} className="space-y-6 min-w-0">
        {groups.map(([section, items]) => (
          <div key={section || 'all'} className="card overflow-hidden">
            {section && (
              <h3 className="px-5 py-3 text-sm font-bold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {sectionLabels[section] ?? section}
              </h3>
            )}
            <div className="p-5 space-y-4">
              {items.map((item) => {
                const id = `${formId}-${item.id}`
                const multiline = item.type === 'html' || (item.value?.length ?? 0) > 100
                return (
                  <div key={item.id}>
                    <label htmlFor={id} className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{item.label}</label>
                    {multiline ? (
                      <textarea id={id} {...register(item.id)} className="input w-full" rows={3} />
                    ) : (
                      <input id={id} {...register(item.id)} type={item.type === 'url' ? 'url' : 'text'} className="input w-full" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </fieldset>

      {canWrite && (
        <div className="sticky bottom-4 flex justify-end">
          <LoadingButton type="submit" loading={mutation.isPending} disabled={!isDirty} className="btn btn-primary shadow-lg">
            <Save size={16} /> {submitLabel}
          </LoadingButton>
        </div>
      )}
    </form>
  )
}
