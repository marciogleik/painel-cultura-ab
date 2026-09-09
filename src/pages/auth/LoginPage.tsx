import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff, LogIn } from 'lucide-react'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname ?? '/painel'

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
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
    } catch (err: any) {
      const msg = (err?.message ?? '').toLowerCase()
      if (msg.includes('email not confirmed')) {
        setError('Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e a pasta de spam.')
      } else if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        setError('E-mail ou senha incorretos. Se você já tem conta e não lembra a senha, clique em "Esqueci minha senha" abaixo.')
      } else {
        setError(err?.message ?? 'Erro ao entrar na plataforma. Verifique seus dados.')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-40 h-96 w-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
        <div className="absolute bottom-1/4 -left-40 h-96 w-96 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <img
              src="/logo-secretaria.jpg"
              alt="Secretaria de Esporte, Cultura, Lazer e Eventos - Prefeitura de Água Boa"
              className="h-20 w-auto object-contain"
            />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#f5a623' }}>
              Plataforma Municipal de Cultura
            </p>
          </Link>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h1 className="text-xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>Entrar na plataforma</h1>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-500/20 bg-red-500/5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                E-mail
              </label>
              <input
                type="email"
                {...register('email')}
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="seu@email.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-900 dark:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                to="/esqueci-senha"
                className="text-xs hover:text-amber-400 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                Esqueci minha senha
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full justify-center py-2.5"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Não tem conta?{' '}
            <Link to="/cadastro" className="font-medium text-amber-400 hover:text-amber-300 transition-colors">
              Cadastre-se gratuitamente
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Sistema seguro — Prefeitura Municipal de Água Boa
        </p>
      </div>
    </div>
  )
}
