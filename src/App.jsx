import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProfileProvider } from './context/ProfileContext'
import Dashboard from './screens/Dashboard'
import SafetyReport from './screens/SafetyReport'
import EnvironmentalReport from './screens/EnvironmentalReport'
import ErgonomicReport from './screens/ErgonomicReport'
import VehicleChecklist from './screens/VehicleChecklist'
import ShiftChange from './screens/ShiftChange'
import SafetyInspection from './screens/SafetyInspection'
import Success from './screens/Success'
import Login from './screens/Login'
import Records from './screens/Records'
import Profile from './screens/Profile'
import Gestao from './screens/Gestao'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-page)' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid var(--orange)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicOnly({ children }) {
  const { user } = useAuth()
  if (user === undefined) return null
  if (user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/seguranca" element={<ProtectedRoute><SafetyReport /></ProtectedRoute>} />
      <Route path="/ambiental" element={<ProtectedRoute><EnvironmentalReport /></ProtectedRoute>} />
      <Route path="/ergonomia" element={<ProtectedRoute><ErgonomicReport /></ProtectedRoute>} />
      <Route path="/veiculo" element={<ProtectedRoute><VehicleChecklist /></ProtectedRoute>} />
      <Route path="/turno" element={<ProtectedRoute><ShiftChange /></ProtectedRoute>} />
      <Route path="/inspecao" element={<ProtectedRoute><SafetyInspection /></ProtectedRoute>} />
      <Route path="/sucesso" element={<ProtectedRoute><Success /></ProtectedRoute>} />
      <Route path="/registros" element={<ProtectedRoute><Records /></ProtectedRoute>} />
      <Route path="/gestao" element={<ProtectedRoute><Gestao /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProfileProvider>
          <AppRoutes />
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
