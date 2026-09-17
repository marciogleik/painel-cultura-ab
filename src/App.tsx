import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ADMIN_ROLES } from '@/lib/roles'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/components/ui/Toast'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import type { UserRole } from '@/types'

// A home carrega no bundle principal; o resto entra sob demanda, por rota.
import { HomePage } from '@/pages/public/HomePage'

const SearchPage = lazy(() => import('@/pages/public/SearchPage').then((m) => ({ default: m.SearchPage })))
const ArtistProfilePage = lazy(() => import('@/pages/public/ArtistProfilePage').then((m) => ({ default: m.ArtistProfilePage })))
const EditaisPublicPage = lazy(() => import('@/pages/public/EditaisPublicPage').then((m) => ({ default: m.EditaisPublicPage })))
const EditalDetailPage = lazy(() => import('@/pages/public/EditalDetailPage').then((m) => ({ default: m.EditalDetailPage })))
const ProductsPage = lazy(() => import('@/pages/public/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const SpacesPage = lazy(() => import('@/pages/public/SpacesPage').then((m) => ({ default: m.SpacesPage })))
const EventsPage = lazy(() => import('@/pages/public/EventsPage').then((m) => ({ default: m.EventsPage })))
const ProjectsPage = lazy(() => import('@/pages/public/ProjectsPage').then((m) => ({ default: m.ProjectsPage })))
const LibraryPage = lazy(() => import('@/pages/public/LibraryPage').then((m) => ({ default: m.LibraryPage })))
const WorkshopsPage = lazy(() => import('@/pages/public/WorkshopsPage').then((m) => ({ default: m.WorkshopsPage })))
const WorkshopEnrollmentPage = lazy(() => import('@/pages/public/WorkshopEnrollmentPage').then((m) => ({ default: m.WorkshopEnrollmentPage })))
const SymbolsPage = lazy(() => import('@/pages/public/SymbolsPage').then((m) => ({ default: m.SymbolsPage })))

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))

const ArtistDashboard = lazy(() => import('@/pages/artist/ArtistDashboard').then((m) => ({ default: m.ArtistDashboard })))
const MyInscriptionsPage = lazy(() => import('@/pages/artist/MyInscriptionsPage').then((m) => ({ default: m.MyInscriptionsPage })))
const PrivacySettingsPage = lazy(() => import('@/pages/artist/PrivacySettingsPage').then((m) => ({ default: m.PrivacySettingsPage })))
const InscriptionFormPage = lazy(() => import('@/pages/artist/InscriptionFormPage').then((m) => ({ default: m.InscriptionFormPage })))
const MyProductsPage = lazy(() => import('@/pages/artist/MyProductsPage').then((m) => ({ default: m.MyProductsPage })))

const AgentRegisterPage = lazy(() => import('@/pages/agente/AgentRegisterPage').then((m) => ({ default: m.AgentRegisterPage })))
const MyAgentsPage = lazy(() => import('@/pages/agente/MyAgentsPage').then((m) => ({ default: m.MyAgentsPage })))
const AgentDetailPage = lazy(() => import('@/pages/agente/AgentDetailPage').then((m) => ({ default: m.AgentDetailPage })))

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const AdminEditais = lazy(() => import('@/pages/admin/AdminEditais').then((m) => ({ default: m.AdminEditais })))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })))
const AdminInscriptions = lazy(() => import('@/pages/admin/AdminInscriptions').then((m) => ({ default: m.AdminInscriptions })))
const AdminIndicators = lazy(() => import('@/pages/admin/AdminIndicators').then((m) => ({ default: m.AdminIndicators })))
const AdminSiteEditor = lazy(() => import('@/pages/admin/AdminSiteEditor').then((m) => ({ default: m.AdminSiteEditor })))
const AdminSpaces = lazy(() => import('@/pages/admin/AdminSpaces').then((m) => ({ default: m.AdminSpaces })))
const AdminEvents = lazy(() => import('@/pages/admin/AdminEvents').then((m) => ({ default: m.AdminEvents })))
const AdminProjects = lazy(() => import('@/pages/admin/AdminProjects').then((m) => ({ default: m.AdminProjects })))
const AdminWorkshops = lazy(() => import('@/pages/admin/AdminWorkshops').then((m) => ({ default: m.AdminWorkshops })))
const AdminLibrary = lazy(() => import('@/pages/admin/AdminLibrary').then((m) => ({ default: m.AdminLibrary })))
const AdminSymbols = lazy(() => import('@/pages/admin/AdminSymbols').then((m) => ({ default: m.AdminSymbols })))
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts').then((m) => ({ default: m.AdminProducts })))
const AdminEnrollments = lazy(() => import('@/pages/admin/AdminEnrollments').then((m) => ({ default: m.AdminEnrollments })))
const AdminAgentes = lazy(() => import('@/pages/admin/AdminAgentes').then((m) => ({ default: m.AdminAgentes })))

const AccessDeniedPage = lazy(() => import('@/pages/AccessDeniedPage').then((m) => ({ default: m.AccessDeniedPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/** Qualquer conta ativa pode usar o painel do agente cultural. */
const PANEL_ROLES: UserRole[] = ['USUARIO_PUBLICO', 'ARTISTA', 'SERVIDOR', 'GESTOR', 'ADMIN_CULTURA', 'SUPER_ADMIN']
/** Painel administrativo: SUPER_ADMIN, ADMIN_CULTURA, GESTOR (igual a is_admin() no banco). */
const ADMIN_PANEL_ROLES: UserRole[] = [...ADMIN_ROLES, 'SERVIDOR']

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<FullPageSpinner />}>
                  <Routes>
                    {/* Público */}
                    <Route element={<PublicLayout />}>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/agentes" element={<SearchPage />} />
                      <Route path="/agentes/:id" element={<ArtistProfilePage />} />
                      <Route path="/pesquisa" element={<Navigate to="/agentes" replace />} />
                      <Route path="/artistas" element={<Navigate to="/agentes" replace />} />
                      <Route path="/artistas/:id" element={<ArtistProfilePage />} />
                      <Route path="/editais" element={<EditaisPublicPage />} />
                      <Route path="/editais/:id" element={<EditalDetailPage />} />
                      <Route path="/concursos" element={<Navigate to="/editais" replace />} />
                      <Route path="/produtos" element={<ProductsPage />} />
                      <Route path="/espacos" element={<SpacesPage />} />
                      <Route path="/eventos" element={<EventsPage />} />
                      <Route path="/projetos" element={<ProjectsPage />} />
                      <Route path="/biblioteca" element={<LibraryPage />} />
                      <Route path="/oficinas" element={<WorkshopsPage />} />
                      <Route path="/oficinas/matricula" element={<WorkshopEnrollmentPage />} />
                      <Route path="/oficinas/:id/matricula" element={<WorkshopEnrollmentPage />} />
                      <Route path="/simbolos" element={<SymbolsPage />} />
                    </Route>

                    {/* Autenticação */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/cadastro" element={<RegisterPage />} />
                    <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />

                    {/* Painel do agente cultural */}
                    <Route element={<ProtectedRoute allowedRoles={PANEL_ROLES} />}>
                      <Route element={<AppLayout />}>
                        <Route path="/painel" element={<ArtistDashboard />} />
                        <Route path="/painel/meu-perfil" element={<Navigate to="/painel/agentes" replace />} />
                        <Route path="/painel/editar-perfil" element={<Navigate to="/painel/agentes" replace />} />
                        <Route path="/painel/inscricoes" element={<MyInscriptionsPage />} />
                        <Route path="/painel/inscricoes/nova/:id" element={<InscriptionFormPage />} />
                        <Route path="/painel/privacidade" element={<PrivacySettingsPage />} />
                        <Route path="/painel/produtos" element={<MyProductsPage />} />
                        <Route path="/painel/agentes" element={<MyAgentsPage />} />
                        <Route path="/painel/agentes/cadastrar" element={<AgentRegisterPage />} />
                        <Route path="/painel/agentes/novo" element={<Navigate to="/painel/agentes/cadastrar" replace />} />
                        <Route path="/painel/agentes/:id/editar" element={<AgentRegisterPage />} />
                        <Route path="/painel/agentes/:id" element={<AgentDetailPage />} />
                      </Route>
                    </Route>

                    {/* Painel administrativo */}
                    <Route element={<ProtectedRoute allowedRoles={ADMIN_PANEL_ROLES} />}>
                      <Route element={<AppLayout isAdmin />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/site" element={<AdminSiteEditor />} />
                        <Route path="/admin/artistas" element={<Navigate to="/admin/agentes" replace />} />
                        <Route path="/admin/agentes" element={<AdminAgentes />} />
                        <Route path="/admin/editais" element={<AdminEditais />} />
                        <Route path="/admin/inscricoes" element={<AdminInscriptions />} />
                        <Route path="/admin/usuarios" element={<AdminUsers />} />
                        <Route path="/admin/indicadores" element={<AdminIndicators />} />
                        <Route path="/admin/espacos" element={<AdminSpaces />} />
                        <Route path="/admin/eventos" element={<AdminEvents />} />
                        <Route path="/admin/projetos" element={<AdminProjects />} />
                        <Route path="/admin/oficinas" element={<AdminWorkshops />} />
                        <Route path="/admin/biblioteca" element={<AdminLibrary />} />
                        <Route path="/admin/simbolos" element={<AdminSymbols />} />
                        <Route path="/admin/produtos" element={<AdminProducts />} />
                        <Route path="/admin/matriculas" element={<AdminEnrollments />} />
                      </Route>
                    </Route>

                    <Route path="/acesso-negado" element={<AccessDeniedPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
