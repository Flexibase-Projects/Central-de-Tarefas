import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AuthGuard } from './components/auth/AuthGuard'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/Login'
import Desenvolvimentos from './pages/Desenvolvimentos'
import Atividades from './pages/Atividades'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Mapa from './pages/Mapa'
import Prioridades from './pages/Prioridades'
import Indicadores from './pages/Indicadores'
import CanvaEquipe from './pages/CanvaEquipe'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/mapa" element={<Mapa />} />
                    <Route path="/prioridades" element={<Prioridades />} />
                    <Route path="/desenvolvimentos" element={<Desenvolvimentos />} />
                    <Route path="/atividades" element={<Atividades />} />
                    <Route path="/canva-equipe" element={<CanvaEquipe />} />
                    <Route path="/indicadores" element={<Indicadores />} />
                    <Route path="/admin" element={<Admin />} />
                  </Routes>
                </MainLayout>
              </AuthGuard>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
