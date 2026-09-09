import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Layouts
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AppLayout } from '@/components/layout/AppLayout'

// Public Pages
import { HomePage } from '@/pages/public/HomePage'
import { SearchPage } from '@/pages/public/SearchPage'
import { ArtistProfilePage } from '@/pages/public/ArtistProfilePage'
import { EditaisPublicPage } from '@/pages/public/EditaisPublicPage'
import { EditalDetailPage } from '@/pages/public/EditalDetailPage'
import { ProductsPage } from '@/pages/public/ProductsPage'
import { SpacesPage } from '@/pages/public/SpacesPage'
import { EventsPage } from '@/pages/public/EventsPage'
import { ProjectsPage } from '@/pages/public/ProjectsPage'
import { LibraryPage } from '@/pages/public/LibraryPage'
import { WorkshopsPage } from '@/pages/public/WorkshopsPage'
import { WorkshopEnrollmentPage } from '@/pages/public/WorkshopEnrollmentPage'
import { SymbolsPage } from '@/pages/public/SymbolsPage'

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'

// Artist Pages
import { ArtistDashboard } from '@/pages/artist/ArtistDashboard'
import { MyInscriptionsPage } from '@/pages/artist/MyInscriptionsPage'
import { PrivacySettingsPage } from '@/pages/artist/PrivacySettingsPage'
import { InscriptionFormPage } from '@/pages/artist/InscriptionFormPage'
import { MyProductsPage } from '@/pages/artist/MyProductsPage'

// Agente Cultural Pages
import { AgentRegisterPage } from '@/pages/agente/AgentRegisterPage'
import { MyAgentsPage } from '@/pages/agente/MyAgentsPage'
import { AgentDetailPage } from '@/pages/agente/AgentDetailPage'

// Admin Pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminEditais } from '@/pages/admin/AdminEditais'
import { AdminUsers } from '@/pages/admin/AdminUsers'
import { AdminInscriptions } from '@/pages/admin/AdminInscriptions'
import { AdminIndicators } from '@/pages/admin/AdminIndicators'
import { AdminSiteEditor } from '@/pages/admin/AdminSiteEditor'
import { AdminSpaces } from '@/pages/admin/AdminSpaces'
import { AdminEvents } from '@/pages/admin/AdminEvents'
import { AdminProjects } from '@/pages/admin/AdminProjects'
import { AdminWorkshops } from '@/pages/admin/AdminWorkshops'
import { AdminLibrary } from '@/pages/admin/AdminLibrary'
import { AdminSymbols } from '@/pages/admin/AdminSymbols'
import { AdminProducts } from '@/pages/admin/AdminProducts'
import { AdminEnrollments } from '@/pages/admin/AdminEnrollments'
import { AdminAgentes } from '@/pages/admin/AdminAgentes'

// Error Pages
import { AccessDeniedPage } from '@/pages/AccessDeniedPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/pesquisa" element={<SearchPage />} />
                <Route path="/artistas" element={<SearchPage />} />
                <Route path="/artistas/:id" element={<ArtistProfilePage />} />
                <Route path="/editais" element={<EditaisPublicPage />} />
                <Route path="/editais/:id" element={<EditalDetailPage />} />
                <Route path="/concursos" element={<EditaisPublicPage />} />
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

              {/* Auth routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/cadastro" element={<RegisterPage />} />
              <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />

              {/* Artist protected routes */}
              <Route element={<ProtectedRoute allowedRoles={['ARTISTA', 'SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR', 'SERVIDOR', 'USUARIO_PUBLICO']} />}>
                <Route element={<AppLayout />}>
                  <Route path="/painel" element={<ArtistDashboard />} />
                  <Route path="/painel/meu-perfil" element={<Navigate to="/painel/agentes" replace />} />
                  <Route path="/painel/editar-perfil" element={<Navigate to="/painel/agentes/cadastrar" replace />} />
                  <Route path="/painel/inscricoes" element={<MyInscriptionsPage />} />
                  <Route path="/painel/privacidade" element={<PrivacySettingsPage />} />
                  <Route path="/painel/inscricoes/nova/:id" element={<InscriptionFormPage />} />
                  <Route path="/painel/produtos" element={<MyProductsPage />} />
                  <Route path="/painel/agentes" element={<MyAgentsPage />} />
                  <Route path="/painel/agentes/cadastrar" element={<AgentRegisterPage />} />
                  <Route path="/painel/agentes/novo" element={<AgentRegisterPage />} />
                  <Route path="/painel/agentes/:id" element={<AgentDetailPage />} />
                </Route>
              </Route>

              {/* Admin protected routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN_CULTURA', 'GESTOR', 'SUPER_ADMIN']} />}>
                <Route element={<AppLayout isAdmin />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/site" element={<AdminSiteEditor />} />
                  <Route path="/admin/artistas" element={<Navigate to="/admin/agentes" replace />} />
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
                  <Route path="/admin/agentes" element={<AdminAgentes />} />
                </Route>
              </Route>

              <Route path="/acesso-negado" element={<AccessDeniedPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
