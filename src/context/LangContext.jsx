import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { makeT, normalizeLang, DEFAULT_LANG, LANGUAGES, LANG_CODES } from '../lib/i18n'
import { setFormatLang } from '../lib/format'

const LangContext = createContext(null)
const CACHE_KEY = 'sake_lang'

// Source of truth is profiles.language (backend). localStorage is only a pre-login
// cache so the landing/login don't flash the wrong language. The public landing
// defaults to Polish (target market) until the user picks otherwise or signs in.
const LANDING_DEFAULT = 'pl'
function initialLang() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached && LANG_CODES.includes(cached)) return cached
  } catch {
    /* ignore */
  }
  return LANDING_DEFAULT
}

export function LangProvider({ children }) {
  const { session, profile } = useAuth()
  const [lang, setLangState] = useState(initialLang)

  useEffect(() => {
    if (profile?.language) {
      const l = normalizeLang(profile.language)
      setLangState(l)
      try {
        localStorage.setItem(CACHE_KEY, l)
      } catch {
        /* ignore */
      }
    }
  }, [profile?.language])

  setFormatLang(lang)

  const setLang = useCallback(
    async (next) => {
      const l = normalizeLang(next)
      setLangState(l)
      setFormatLang(l)
      try {
        localStorage.setItem(CACHE_KEY, l)
      } catch {
        /* ignore */
      }
      if (session?.user?.id) {
        await supabase.from('profiles').update({ language: l }).eq('id', session.user.id)
      }
    },
    [session?.user?.id],
  )

  const value = useMemo(
    () => ({ lang, setLang, t: makeT(lang), languages: LANGUAGES }),
    [lang, setLang],
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useT() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useT must be used within LangProvider')
  return ctx
}

export { DEFAULT_LANG }
