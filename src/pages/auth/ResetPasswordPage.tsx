import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { errorMessage } from '@/lib/utils'

const schema = z
  .object({
    password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'As senhas não conferem', path: ['confirm'] })

type FormData = z.infer<typeof schema>

/**
 * Destino do link "Esqueci minha senha". O Supabase abre esta página já com uma sessão
 * temporária (evento PASSWORD_RECOVERY); aqui o usuário define a nova senha.
 */
export function ResetPasswordPage() {
  const { user, isLoading, updatePassword } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await updatePassword(data.password)
      toast.success('Senha alterada. Você já está conectado.')
      navigate('/painel', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível alterar a senha. Peça um novo link.'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <KeyRound size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Definir nova senha</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Plataforma Municipal de Cultura</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Validando o link...</p>
        ) : !user ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Este link de recuperação expirou ou já foi usado. Peça um novo para receber outro e-mail.
            </p>
            <Link to="/esqueci-senha" className="btn btn-primary w-full justify-center">Pedir novo link</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nova senha</label>
              <div className="relative">
                <input id="password" type={show ? 'text' : 'password'} autoComplete="new-password" className="input pr-10" {...register('password')} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-2 top-1/2 -translate-y-1/2 p-1" style={{ color: 'var(--text-muted)' }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p role="alert" className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.password.message}</p>}
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Confirmar senha</label>
              <input id="confirm" type={show ? 'text' : 'password'} autoComplete="new-password" className="input" {...register('confirm')} />
              {errors.confirm && <p role="alert" className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.confirm.message}</p>}
            </div>
            <LoadingButton type="submit" loading={isSubmitting} className="btn btn-primary w-full justify-center">
              Salvar nova senha
            </LoadingButton>
          </form>
        )}
      </div>
    </div>
  )
}
