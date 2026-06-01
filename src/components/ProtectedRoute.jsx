import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <span className="h-8 w-8 rounded-full border-2 border-line2 border-t-accent animate-spin" />
    </div>
  )
}

export function Protected({ children, adminOnly = false }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/app" replace />
  return children
}

export function PublicOnly({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <Splash />
  if (session) return <Navigate to="/app" replace />
  return children
}
