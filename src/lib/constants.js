// Visual tokens + ordering for monitor enums. Human labels live in src/lib/i18n.js
// (enum.mstatus / enum.mtype / enum.executor) and are resolved through the active
// UI language — use t('enum.mstatus.'+key) etc.

export const MSTATUS = {
  up:       { dot: '#34C77F', text: '#34C77F' },
  degraded: { dot: '#E3B341', text: '#E3B341' },
  down:     { dot: '#E2564A', text: '#E2564A' },
  unknown:  { dot: '#55615A', text: '#8A968F' },
}

// 'ping' (ICMP) is intentionally absent: it needs the Mac agent, and all checks
// run from the cloud now. Legacy labels for it remain in i18n for old rows.
export const MONITOR_TYPES = ['http', 'tcp', 'ssl', 'keyword', 'supabase']
export const HTTP_METHODS = ['GET', 'HEAD', 'POST']

// Which extra fields each monitor type uses (drives the form).
export const TYPE_FIELDS = {
  http:     ['method', 'expected_status', 'ssl'],
  keyword:  ['method', 'keyword', 'ssl'],
  ssl:      ['ssl_warn_days'],
  tcp:      ['port'],
  supabase: ['anon_key'],
}

export const DEFAULT_PORT = { tcp: 443, ssl: 443 }
