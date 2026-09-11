import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MailCheck, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { errorMessage } from '@/lib/utils'

const schema = z
  .object({
    fullName: z.string().trim().min(3, 'Informe seu nome completo'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'Mínimo de 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

/** Mensagem única para "e-mail já existe" e erros equivalentes: não confirma se o e-mail está cadastrado. */
const ACCOUNT_UNAVAILABLE =
  'Não foi possível criar a conta com esse e-mail. Se você já tem cadastro, entre ou recupere a senha.'

export function RegisterPage() {
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const { user, signUp } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/painel', { replace: true })
  }, [user, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      setError('')
      const res = await signUp(data.email, data.password, data.fullName)

      // Usuário já existente: o Supabase devolve identities vazio (não sobrescreve a conta de terceiros)
      if (res.user && res.user.identities && res.user.identities.length === 0) {
        setError(ACCOUNT_UNAVAILABLE)
        return
      }

      // Auto-confirmação ativa: já entra no painel
      if (res.session) {
        navigate('/painel', { replace: true })
        return
      }

      setSuccess(true)
    } catch (err) {
      const msg = errorMessage(err, '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        setError(ACCOUNT_UNAVAILABLE)
      } else {
        setError(errorMessage(err, 'Erro ao criar conta. Tente novamente.'))
      }
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <MailCheck className="h-7 w-7 text-emerald-400" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Conta criada!</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Verifique seu e-mail e clique no link de confirmação para ativar sua conta.
          </p>
          <Link to="/login" className="btn btn-primary w-full justify-center">
            Ir para o login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Criar minha conta">
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-500/20 bg-red-500/5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="register-name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Nome completo
          </label>
          <input
            id="register-name"
            type="text"
            {...register('fullName')}
            className={`input ${errors.fullName ? 'input-error' : ''}`}
            placeholder="Seu nome completo"
            autoComplete="name"
            aria-invalid={!!errors.fullName || undefined}
          />
          {errors.fullName && <p role="alert" className="mt-1 text-xs text-red-400">{errors.fullName.message}</p>}
        </div>

        <div>
          <label htmlFor="register-email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            E-mail
          </label>
          <input
            id="register-email"
            type="email"
            {...register('email')}
            className={`input ${errors.email ? 'input-error' : ''}`}
            placeholder="seu@email.com"
            autoComplete="email"
            aria-invalid={!!errors.email || undefined}
          />
          {errors.email && <p role="alert" className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="register-password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Senha
          </label>
          <PasswordInput
            id="register-password"
            {...register('password')}
            invalid={!!errors.password}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
          {errors.password && <p role="alert" className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="register-confirm" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Confirmar senha
          </label>
          <PasswordInput
            id="register-confirm"
            {...register('confirmPassword')}
            invalid={!!errors.confirmPassword}
            placeholder="Repita a senha"
            autoComplete="new-password"
          />
          {errors.confirmPassword && <p role="alert" className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>}
        </div>

        <LoadingButton type="submit" loading={isSubmitting} className="btn btn-primary w-full justify-center py-2.5 mt-2">
          {!isSubmitting && <UserPlus className="h-4 w-4" />}
          {isSubmitting ? 'Criando conta...' : 'Criar conta gratuita'}
        </LoadingButton>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-amber-400 hover:text-amber-300 transition-colors">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
