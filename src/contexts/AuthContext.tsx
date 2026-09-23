import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

import { ADMIN_ROLES, STAFF_ROLES } from '@/lib/roles'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  role: UserRole | null
  /** Sessão ou perfil ainda carregando */
  isLoading: boolean
  /** Sessão existe mas o perfil não pôde ser carregado */
  profileError: string | null
  /** SUPER_ADMIN, ADMIN_CULTURA ou GESTOR */
  isAdmin: boolean
  /** isAdmin ou SERVIDOR */
  isStaff: boolean
  /** O usuário chegou por um link de recuperação de senha */
  isPasswordRecovery: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<{ user: User | null; session: Session | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  const user = session?.user ?? null
  const userId = user?.id ?? null

  // Sessão: estado inicial + mudanças. Nada assíncrono do Supabase dentro do callback
  // (o cliente recomenda evitar await em onAuthStateChange para não travar o refresh).
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setSessionLoading(false)
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const loadProfile = useCallback(async (id: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
      if (error) {
        if (error.message && error.message.includes('JWT issued at future') && i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500))
          continue
        }
        throw error
      }
      return (data as Profile) ?? null
    }
    return null
  }, [])

  // Perfil: carregado sempre que o usuário muda; isLoading só cai a false depois disso.
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileError(null)
      setProfileLoading(false)
      return
    }
    let cancelled = false
    setProfileLoading(true)
    setProfileError(null)
    loadProfile(userId)
      .then((p) => {
        if (cancelled) return
        if (!p) {
          setProfileError('Perfil não encontrado para esta conta.')
          setProfile(null)
        } else if (!p.is_active) {
          setProfileError('Esta conta está desativada. Procure a Secretaria de Cultura.')
          setProfile(p)
        } else {
          setProfile(p)
        }
      })
      .catch((err: Error) => {
        if (cancelled) return
        let msg = err.message || 'Não foi possível carregar seu perfil.'
        if (msg.includes('JWT issued at future')) {
          msg = 'Ocorreu uma pequena falta de sincronia no relógio do servidor. Por favor, recarregue a página ou aguarde alguns segundos e tente novamente.'
        }
        setProfileError(msg)
        setProfile(null)
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, loadProfile])

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    const p = await loadProfile(userId)
    setProfile(p)
  }, [userId, loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/painel`,
      },
    })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    setIsPasswordRecovery(false)
  }, [])

  const role = profile && profile.is_active ? profile.role : null

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    role,
    isLoading: sessionLoading || profileLoading,
    profileError,
    isAdmin: role !== null && ADMIN_ROLES.includes(role),
    isStaff: role !== null && STAFF_ROLES.includes(role),
    isPasswordRecovery,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
  }), [user, session, profile, role, sessionLoading, profileLoading, profileError, isPasswordRecovery,
      signIn, signUp, signOut, resetPassword, updatePassword, refreshProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
