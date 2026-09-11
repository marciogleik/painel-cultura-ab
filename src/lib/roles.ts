import type { UserRole } from '@/types'

/** Papéis que administram a plataforma. Igual à função is_admin() do banco. */
export const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR']
/** Papéis com acesso ao painel administrativo (leitura). Igual a is_servidor_or_above(). */
export const STAFF_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR', 'SERVIDOR']

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super administrador',
  ADMIN_CULTURA: 'Administração da Cultura',
  GESTOR: 'Gestor',
  SERVIDOR: 'Servidor',
  ARTISTA: 'Agente cultural',
  USUARIO_PUBLICO: 'Agente cultural',
}
