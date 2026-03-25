import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DocumentEditor from './pages/DocumentEditor'
import Search from './pages/Search'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/documents/:id" element={<ProtectedRoute><DocumentEditor /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
      <Route
  path="/search"
  element={<ProtectedRoute><Search /></ProtectedRoute>}
/>
    </Routes>
  )
}