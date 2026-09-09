import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Mail } from 'lucide-react'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    await resetPassword(data.email)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <img
              src="/logo-secretaria.jpg"
              alt="Prefeitura de Água Boa - Secretaria de Cultura"
              className="h-20 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 flex items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                <Mail className="h-7 w-7 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>E-mail enviado</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Se houver uma conta com esse e-mail, você receberá um link para redefinir sua senha.
              </p>
              <Link to="/login" className="btn btn-primary w-full justify-center">
                Voltar ao Login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-2 text-center" style={{ color: 'var(--text-primary)' }}>Recuperar senha</h1>
              <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
                Informe seu e-mail e enviaremos um link de recuperação.
              </p>

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
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary w-full justify-center py-2.5"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Enviar link de recuperação
                </button>
              </form>

              <p className="mt-6 text-center text-sm">
                <Link to="/login" className="font-medium text-amber-400 hover:text-amber-300 transition-colors">
                  Voltar ao login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
