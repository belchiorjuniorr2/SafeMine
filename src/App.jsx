import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
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

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-light)' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid var(--orange)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/seguranca" element={<ProtectedRoute><SafetyReport /></ProtectedRoute>} />
      <Route path="/ambiental" element={<ProtectedRoute><EnvironmentalReport /></ProtectedRoute>} />
      <Route path="/ergonomia" element={<ProtectedRoute><ErgonomicReport /></ProtectedRoute>} />
      <Route path="/veiculo" element={<ProtectedRoute><VehicleChecklist /></ProtectedRoute>} />
      <Route path="/turno" element={<ProtectedRoute><ShiftChange /></ProtectedRoute>} />
      <Route path="/inspecao" element={<ProtectedRoute><SafetyInspection /></ProtectedRoute>} />
      <Route path="/sucesso" element={<ProtectedRoute><Success /></ProtectedRoute>} />
      <Route path="/registros" element={<ProtectedRoute><Records /></ProtectedRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
