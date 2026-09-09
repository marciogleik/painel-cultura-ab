import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff, UserPlus } from 'lucide-react'

const schema = z.object({
  fullName: z.string().min(3, 'Nome completo obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo de 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const { user, signUp } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/painel', { replace: true })
    }
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

      // Se o usuário já existia, o Supabase retorna identities vazio para não sobrescrever senhas de terceiros
      if (res?.user && res.user.identities && res.user.identities.length === 0) {
        setError('Este e-mail já possui uma conta cadastrada no sistema. Faça login ou clique em "Esqueci minha senha" para redefinir.')
        return
      }

      // Se o usuário já recebeu a sessão (auto-confirm ativo), entra direto no painel
      if (res?.session) {
        navigate('/painel', { replace: true })
        return
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao criar conta. Tente novamente.')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-full max-w-sm text-center animate-slide-up">
          <div className="card p-10">
            <div className="mx-auto mb-4 h-14 w-14 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-3xl">✉️</span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Conta criada!</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Verifique seu e-mail e clique no link de confirmação para ativar sua conta.
            </p>
            <Link to="/login" className="btn btn-primary w-full justify-center">
              Ir para o Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-40 h-96 w-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <img
              src="/logo-secretaria.jpg"
              alt="Prefeitura de Água Boa - Secretaria de Cultura"
              className="h-20 w-auto object-contain"
            />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#f5a623' }}>
              Plataforma Municipal de Cultura
            </p>
          </Link>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>Criar minha conta</h1>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-500/20 bg-red-500/5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Nome completo
              </label>
              <input
                type="text"
                {...register('fullName')}
                className={`input ${errors.fullName ? 'input-error' : ''}`}
                placeholder="Seu nome completo"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-400">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                E-mail
              </label>
              <input
                type="email"
                {...register('email')}
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="seu@email.com"
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
                  placeholder="Mínimo 8 caracteres"
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

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Confirmar senha
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="Repita a senha"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full justify-center py-2.5 mt-2"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isSubmitting ? 'Criando conta...' : 'Criar conta gratuita'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-amber-400 hover:text-amber-300 transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
