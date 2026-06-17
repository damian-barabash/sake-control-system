import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

const ThemeContext = createContext(null)
const KEY = 'sake_theme'

// Per-area defaults: the landing reads best light, the panel best dark. A user's
// explicit choice (stored once they toggle) overrides both, everywhere.
function readOverride() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function ThemeProvider({ children }) {
  const location = useLocation()
  const [override, setOverride] = useState(readOverride)

  const area = location.pathname === '/' ? 'landing' : 'app'
  const resolved = override ?? (area === 'landing' ? 'light' : 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', resolved === 'light')
  }, [resolved])

  const toggle = useCallback(() => {
    setOverride(() => {
      const next = resolved === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem(KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [resolved])

  return <ThemeContext.Provider value={{ theme: resolved, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
