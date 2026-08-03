import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import { ThemeProvider } from './context/ThemeContext'
import { Protected, PublicOnly } from './components/ProtectedRoute'
import { BillingGate } from './components/BillingGate'
import { CookieConsent } from './components/CookieConsent'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import AdminUsers from './pages/AdminUsers'
import Inquiries from './pages/Inquiries'
import Account from './pages/Account'
import Checkout from './pages/Checkout'

export default function App() {
  return (
    <AuthProvider>
      <LangProvider>
        <HashRouter>
          <ThemeProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <Login />
                </PublicOnly>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnly>
                  <Register />
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
                <Protected staffOnly>
                  <AdminUsers />
                </Protected>
              }
            />
            <Route
              path="/inquiries"
              element={
                <Protected moderatorOnly>
                  <Inquiries />
                </Protected>
              }
            />
            <Route
              path="/account"
              element={
                <Protected>
                  <Account />
                </Protected>
              }
            />
            {/* Deliberately public: a lapsed user must be able to pay without logging in. */}
            <Route path="/checkout" element={<Checkout />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <BillingGate />
          <CookieConsent />
          </ThemeProvider>
        </HashRouter>
      </LangProvider>
    </AuthProvider>
  )
}
