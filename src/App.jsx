import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import { Protected, PublicOnly } from './components/ProtectedRoute'
import Login from './pages/Login'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import AdminUsers from './pages/AdminUsers'

export default function App() {
  return (
    <AuthProvider>
      <LangProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <Login />
                </PublicOnly>
              }
            />
            <Route
              path="/app"
              element={
                <Protected>
                  <Projects />
                </Protected>
              }
            />
            <Route
              path="/project/:id"
              element={
                <Protected>
                  <ProjectDetail />
                </Protected>
              }
            />
            <Route
              path="/users"
              element={
                <Protected adminOnly>
                  <AdminUsers />
                </Protected>
              }
            />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </HashRouter>
      </LangProvider>
    </AuthProvider>
  )
}
