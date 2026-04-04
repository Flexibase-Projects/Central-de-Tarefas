import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import { AdminGuard } from './components/auth/AdminGuard'
import { AuthGuard } from './components/auth/AuthGuard'
import { WorkspaceManagerRoute } from './components/auth/WorkspaceManagerRoute'
import { WorkspaceModuleRoute } from './components/auth/WorkspaceModuleRoute'
import { PageSyncScreen } from './components/system/WorkspaceSyncFeedback'
import MainLayout from './components/layout/MainLayout'
import { AuthProvider } from './contexts/AuthContext'
import Administracao from './pages/Administracao'
import Atividades from './pages/Atividades'
import CanvaEquipe from './pages/CanvaEquipe'
import ConfiguracoesHub from './pages/ConfiguracoesHub'
import ConfiguracoesLayout from './pages/ConfiguracoesLayout'
import Conquistas from './pages/Conquistas'
import CustosDepartamento from './pages/CustosDepartamento'
import Dashboard from './pages/Dashboard'
import Desenvolvimentos from './pages/Desenvolvimentos'
import Indicadores from './pages/Indicadores'
import { FloatingPreLoginThemeToggleHost } from './components/system/FloatingPreLoginThemeToggle'
import Login from './pages/Login'
import Mapa from './pages/Mapa'
import Niveis from './pages/Niveis'
import Organograma from './pages/Organograma'
import Perfil from './pages/Perfil'
import Prioridades from './pages/Prioridades'
import Ranking from './pages/Ranking'
import Tutorial from './pages/Tutorial'

const loadAdminLoginPage = () => import('./pages/AdminLogin')
const loadAdminGlobalPage = () => import('./pages/AdminGlobal')
const loadAuthCallbackPage = () => import('./pages/AuthCallback')
const loadWorkspacesPage = () => import('./pages/Workspaces')

const AdminLogin = lazy(loadAdminLoginPage)
const AdminGlobal = lazy(loadAdminGlobalPage)
const AuthCallback = lazy(loadAuthCallbackPage)
const Workspaces = lazy(loadWorkspacesPage)

function AppRouteFallback() {
  return (
    <PageSyncScreen
      title="Abrindo a proxima tela"
      description="Estamos sincronizando a navegacao e os dados essenciais para voce continuar sem perder o contexto."
      minHeight="45vh"
    />
  )
}

function WorkspaceApp() {
  return (
    <AuthGuard>
      <MainLayout>
        <Routes>
          <Route
            index
            element={
              <WorkspaceModuleRoute moduleKey="dashboard" title="Central de Tarefas">
                <Dashboard />
              </WorkspaceModuleRoute>
            }
          />
          <Route
            path="mapa"
            element={
              <WorkspaceModuleRoute moduleKey="projects" title="Mapa">
                <Mapa />
              </WorkspaceModuleRoute>
            }
          />
          <Route
            path="prioridades"
            element={
              <WorkspaceModuleRoute moduleKey="projects" title="Prioridades">
                <Prioridades />
              </WorkspaceModuleRoute>
            }
          />
          <Route
            path="desenvolvimentos"
            element={
              <WorkspaceModuleRoute moduleKey="projects" title="Projetos">
                <Desenvolvimentos />
              </WorkspaceModuleRoute>
            }
          />
          <Route
            path="atividades"
            element={
              <WorkspaceModuleRoute moduleKey="activities" title="Atividades">
                <Atividades />
              </WorkspaceModuleRoute>
            }
          />
          <Route
            path="canva-equipe"
            element={
              <WorkspaceModuleRoute moduleKey="teams" title="Canva em Equipe">
                <CanvaEquipe />
              </WorkspaceModuleRoute>
            }
          />
          <Route
            path="indicadores"
            element={
              <WorkspaceModuleRoute moduleKey="indicators" title="Indicadores">
                <Indicadores />
              </WorkspaceModuleRoute>
            }
          />
          <Route path="perfil" element={<Perfil />} />
          <Route
            path="ranking"
            element={
              <WorkspaceModuleRoute moduleKey="ranking" title="Ranking">
                <Ranking />
              </WorkspaceModuleRoute>
            }
          />
          <Route
            path="conquistas"
            element={
              <WorkspaceModuleRoute moduleKey="gamification" title="Conquistas">
                <Conquistas />
              </WorkspaceModuleRoute>
            }
          />
          <Route
            path="niveis"
            element={
              <WorkspaceModuleRoute moduleKey="gamification" title="Niveis">
                <Niveis />
              </WorkspaceModuleRoute>
            }
          />
          <Route path="tutorial" element={<Tutorial />} />
          <Route
            path="organograma"
            element={
              <WorkspaceManagerRoute>
                <WorkspaceModuleRoute moduleKey="org_chart" title="Organograma">
                  <Organograma />
                </WorkspaceModuleRoute>
              </WorkspaceManagerRoute>
            }
          />
          <Route
            path="custos-departamento"
            element={
              <WorkspaceManagerRoute>
                <WorkspaceModuleRoute moduleKey="costs" title="Custos">
                  <CustosDepartamento />
                </WorkspaceModuleRoute>
              </WorkspaceManagerRoute>
            }
          />
          <Route path="configuracoes/organograma" element={<Navigate to="../../organograma" relative="path" replace />} />
          <Route
            path="configuracoes/custos-departamento"
            element={<Navigate to="../../custos-departamento" relative="path" replace />}
          />
          <Route
            path="configuracoes"
            element={<ConfiguracoesLayout />}
          >
            <Route index element={<ConfiguracoesHub />} />
            <Route
              path="administracao"
              element={
                <WorkspaceManagerRoute>
                  <Administracao />
                </WorkspaceManagerRoute>
              }
            />
          </Route>
          <Route path="admin" element={<Navigate to="../configuracoes/administracao" relative="path" replace />} />
        </Routes>
      </MainLayout>
    </AuthGuard>
  )
}

function App() {
  useEffect(() => {
    const preloadRoutes = () => {
      void loadAdminLoginPage()
      void loadAdminGlobalPage()
      void loadAuthCallbackPage()
      void loadWorkspacesPage()
    }

    const timer = window.setTimeout(preloadRoutes, 250)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <FloatingPreLoginThemeToggleHost />
        <Routes>
          <Route
            path="/admin/login"
            element={
              <Suspense fallback={<AppRouteFallback />}>
                <AdminLogin />
              </Suspense>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <Suspense fallback={<AppRouteFallback />}>
                  <AdminGlobal />
                </Suspense>
              </AdminGuard>
            }
          />
          <Route
            path="/auth/callback"
            element={
              <Suspense fallback={<AppRouteFallback />}>
                <AuthCallback />
              </Suspense>
            }
          />
          <Route
            path="/workspaces"
            element={
              <Suspense fallback={<AppRouteFallback />}>
                <Workspaces />
              </Suspense>
            }
          />
          <Route path="/login" element={<Navigate to="/workspaces" replace />} />
          <Route path="/w/:workspaceSlug/login" element={<Login />} />
          <Route path="/w/:workspaceSlug/*" element={<WorkspaceApp />} />
          <Route path="/" element={<Navigate to="/workspaces" replace />} />
          <Route path="*" element={<Navigate to="/workspaces" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
