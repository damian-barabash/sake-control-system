import { dict, translate, DEFAULT_LANG, normalizeLang } from './i18n'

// Date/time formatting follows the active UI language. LangProvider calls
// setFormatLang once so call sites don't have to thread the language.
let curLang = DEFAULT_LANG

export function setFormatLang(lang) {
  curLang = normalizeLang(lang)
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const months = dict(curLang).months
  return `${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`
}

export function timeAgo(iso) {
  if (!iso) return ''
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return translate(curLang, 'relTime.now')
  const min = Math.floor(sec / 60)
  if (min < 60) return translate(curLang, 'relTime.min', { n: min })
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return translate(curLang, 'relTime.hour', { n: hrs })
  const days = Math.floor(hrs / 24)
  if (days < 7) return translate(curLang, 'relTime.day', { n: days })
  return formatDate(iso)
}

// Human duration between two ISO timestamps (or from start to now).
export function formatDuration(startIso, endIso) {
  if (!startIso) return ''
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  let sec = Math.max(0, Math.floor((end - start) / 1000))
  if (sec < 60) return translate(curLang, 'dur.sec', { n: sec })
  const min = Math.floor(sec / 60)
  if (min < 60) return translate(curLang, 'dur.min', { n: min })
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return translate(curLang, 'dur.hour', { n: hrs })
  const days = Math.floor(hrs / 24)
  return translate(curLang, 'dur.day', { n: days })
}

export function formatLatency(ms) {
  if (ms == null) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

export function formatUptime(pct) {
  if (pct == null) return '—'
  const n = Number(pct)
  if (Number.isNaN(n)) return '—'
  return `${n >= 99.95 ? '100' : n.toFixed(n >= 99 ? 2 : 1)}%`
}
