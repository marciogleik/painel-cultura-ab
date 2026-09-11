import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { errorMessage } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo de 8 caracteres'),
})

type FormData = z.infer<typeof schema>

interface LocationState {
  from?: { pathname?: string; search?: string }
}

export function LoginPage() {
  const [error, setError] = useState('')
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const state = location.state as LocationState | null
  const from = state?.from?.pathname
    ? `${state.from.pathname}${state.from.search ?? ''}`
    : '/painel'

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, from, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      setError('')
      await signIn(data.email, data.password)
      navigate(from, { replace: true })
    } catch (err) {
      const msg = errorMessage(err, '').toLowerCase()
      if (msg.includes('email not confirmed')) {
        setError('Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e a pasta de spam.')
      } else if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        setError('E-mail ou senha incorretos. Se você já tem conta e não lembra a senha, use "Esqueci minha senha".')
      } else {
        setError(errorMessage(err, 'Erro ao entrar na plataforma. Verifique seus dados.'))
      }
    }
  }

  return (
    <AuthLayout title="Entrar na plataforma">
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-500/20 bg-red-500/5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            E-mail
          </label>
          <input
            id="login-email"
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
          <label htmlFor="login-password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Senha
          </label>
          <PasswordInput
            id="login-password"
            {...register('password')}
            invalid={!!errors.password}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {errors.password && <p role="alert" className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
        </div>

        <div className="flex justify-end">
          <Link to="/esqueci-senha" className="text-xs hover:text-amber-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
            Esqueci minha senha
          </Link>
        </div>

        <LoadingButton type="submit" loading={isSubmitting} className="btn btn-primary w-full justify-center py-2.5">
          {!isSubmitting && <LogIn className="h-4 w-4" />}
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </LoadingButton>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Não tem conta?{' '}
        <Link to="/cadastro" className="font-medium text-amber-400 hover:text-amber-300 transition-colors">
          Cadastre-se gratuitamente
        </Link>
      </p>
    </AuthLayout>
  )
}
