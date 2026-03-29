import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { AuthProvider } from './contexts/AuthContext'
import { AuthGuard } from './components/auth/AuthGuard'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/Login'
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Workspaces = lazy(() => import('./pages/Workspaces'))

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Desenvolvimentos = lazy(() => import('./pages/Desenvolvimentos'))
const Atividades = lazy(() => import('./pages/Atividades'))
const ConfiguracoesLayout = lazy(() => import('./pages/ConfiguracoesLayout'))
const ConfiguracoesHub = lazy(() => import('./pages/ConfiguracoesHub'))
const Administracao = lazy(() => import('./pages/Administracao'))
const Mapa = lazy(() => import('./pages/Mapa'))
const Prioridades = lazy(() => import('./pages/Prioridades'))
const Indicadores = lazy(() => import('./pages/Indicadores'))
const CanvaEquipe = lazy(() => import('./pages/CanvaEquipe'))
const Perfil = lazy(() => import('./pages/Perfil'))
const Conquistas = lazy(() => import('./pages/Conquistas'))
const Niveis = lazy(() => import('./pages/Niveis'))
const Tutorial = lazy(() => import('./pages/Tutorial'))
const CustosDepartamento = lazy(() => import('./pages/CustosDepartamento'))
const Organograma = lazy(() => import('./pages/Organograma'))

function AppRouteFallback() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '45vh',
      }}
      aria-busy="true"
      aria-label="Carregando página"
    >
      <CircularProgress size={36} />
    </Box>
  )
}

function WorkspaceApp() {
  return (
    <AuthGuard>
      <MainLayout>
        <Suspense fallback={<AppRouteFallback />}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="mapa" element={<Mapa />} />
            <Route path="prioridades" element={<Prioridades />} />
            <Route path="desenvolvimentos" element={<Desenvolvimentos />} />
            <Route path="atividades" element={<Atividades />} />
            <Route path="canva-equipe" element={<CanvaEquipe />} />
            <Route path="indicadores" element={<Indicadores />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="conquistas" element={<Conquistas />} />
            <Route path="niveis" element={<Niveis />} />
            <Route path="tutorial" element={<Tutorial />} />
            <Route path="organograma" element={<ProtectedRoute role="admin"><Organograma /></ProtectedRoute>} />
            <Route path="custos-departamento" element={<ProtectedRoute role="admin"><CustosDepartamento /></ProtectedRoute>} />
            <Route path="configuracoes/organograma" element={<Navigate to="../../organograma" relative="path" replace />} />
            <Route
              path="configuracoes/custos-departamento"
              element={<Navigate to="../../custos-departamento" relative="path" replace />}
            />
            <Route
              path="configuracoes"
              element={<ProtectedRoute role="admin"><ConfiguracoesLayout /></ProtectedRoute>}
            >
              <Route index element={<ConfiguracoesHub />} />
              <Route path="administracao" element={<Administracao />} />
            </Route>
            <Route path="admin" element={<Navigate to="../configuracoes/administracao" relative="path" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </AuthGuard>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
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
          <Route
            path="/w/:workspaceSlug/*"
            element={
              <WorkspaceApp />
            }
          />
          <Route path="/" element={<Navigate to="/workspaces" replace />} />
          <Route path="*" element={<Navigate to="/workspaces" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
