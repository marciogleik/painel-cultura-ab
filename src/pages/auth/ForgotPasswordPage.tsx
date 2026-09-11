import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { LoadingButton } from '@/components/ui/ConfirmDialog'
import { errorMessage } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { resetPassword } = useAuth()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      setError('')
      await resetPassword(data.email)
      setSent(true)
    } catch (err) {
      const msg = errorMessage(err, '').toLowerCase()
      if (msg.includes('rate limit') || msg.includes('security purposes')) {
        setError('Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.')
      } else {
        setError(errorMessage(err, 'Não foi possível enviar o e-mail de recuperação. Tente novamente.'))
      }
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="text-center" role="status">
          <div className="mx-auto mb-4 h-14 w-14 flex items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
            <Mail className="h-7 w-7 text-amber-400" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>E-mail enviado</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Se houver uma conta com esse e-mail, você receberá um link para redefinir sua senha.
            Confira também a pasta de spam.
          </p>
          <Link to="/login" className="btn btn-primary w-full justify-center">
            Voltar ao login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Recuperar senha" subtitle="Informe seu e-mail e enviaremos um link de recuperação.">
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-500/20 bg-red-500/5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            E-mail
          </label>
          <input
            id="forgot-email"
            type="email"
            {...register('email')}
            className={`input ${errors.email ? 'input-error' : ''}`}
            placeholder="seu@email.com"
            autoComplete="email"
            aria-invalid={!!errors.email || undefined}
          />
          {errors.email && <p role="alert" className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <LoadingButton type="submit" loading={isSubmitting} className="btn btn-primary w-full justify-center py-2.5">
          {!isSubmitting && <Mail className="h-4 w-4" />}
          Enviar link de recuperação
        </LoadingButton>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium text-amber-400 hover:text-amber-300 transition-colors">
          Voltar ao login
        </Link>
      </p>
    </AuthLayout>
  )
}
