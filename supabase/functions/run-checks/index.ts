// Core health checker. Two entry modes:
//   1. Scheduler (pg_cron, no body): runs every due `executor='cloud'` monitor.
//   2. On-demand: { monitor_id } from the app's "Check now" button (auth required).
// Writes `checks` history, updates `monitor_state`, opens/resolves `incidents`
// (anti-flap: 2 consecutive downs), and emails on down/recovery via Resend.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM = Deno.env.get('NOTIFY_FROM') ?? 'Sake Control <office@barabashflow.pl>'
// NOTE: sender stays on the Resend-verified barabashflow.pl domain until
// sakecontrol.pl is verified in Resend (then set the NOTIFY_FROM secret).
const APP_URL = Deno.env.get('APP_URL') ?? 'https://sakecontrol.pl'
const CRON_KEY = Deno.env.get('CRON_KEY') // optional hardening for the scheduler path

const DEGRADED_MS = 3000
const FAIL_THRESHOLD = 2 // consecutive downs before an incident opens
// Authed keep-alive ping cadence for supabase monitors with an anon key.
// Supabase pauses free projects after 7 days of no activity; every 3 days = 2x margin.
const KEEPALIVE_MS = 3 * 86400000

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}
const json = (b: unknown, s: number, o: string | null) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors(o), 'Content-Type': 'application/json' } })

function raceTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms)),
  ])
}

function hostFromTarget(target: string): string {
  try {
    if (target.includes('://')) return new URL(target).hostname
  } catch { /* fallthrough */ }
  return target.replace(/^.*?@/, '').split('/')[0].split(':')[0]
}

type Result = { status: 'up' | 'degraded' | 'down'; code: number | null; latency: number | null; error: string | null; keepalive?: boolean }

async function httpCheck(m: any, opts: { keyword?: boolean; reachable?: boolean } = {}): Promise<Result> {
  const { keyword, reachable } = opts
  const t0 = performance.now()
  try {
    const res = await raceTimeout(
      fetch(m.target, { method: m.method || 'GET', redirect: 'follow', headers: { 'user-agent': 'SakeControl/1.0' } }),
      m.timeout_ms || 10000,
    )
    const latency = Math.round(performance.now() - t0)
    const code = res.status
    // reachable mode (Supabase): any gateway answer < 500 means the project is alive
    // (401 "No API key" / 404 still prove the gateway responds). Down only on 5xx.
    let ok = reachable
      ? code < 500
      : m.expected_status
        ? code === m.expected_status
        : code >= 200 && code < 400
    let error: string | null = ok ? null : `HTTP ${code}`
    if (keyword && m.keyword) {
      const body = await res.text()
      if (!body.includes(m.keyword)) {
        ok = false
        error = `keyword "${m.keyword}" not found`
      }
    } else {
      try { await res.body?.cancel() } catch { /* ignore */ }
    }
    return { status: ok ? (latency > DEGRADED_MS ? 'degraded' : 'up') : 'down', code, latency, error }
  } catch (e) {
    return { status: 'down', code: null, latency: null, error: String((e as any)?.message ?? e) }
  }
}

// Authenticated Supabase ping: a real API request with the project's anon key.
// Counts as project activity, so free-plan projects don't get auto-paused (keep-alive),
// and proves the API actually answers — not just that the Kong gateway is reachable.
// Endpoint: /storage/v1/bucket — returns 200 to anon and actually reads Postgres
// (storage.buckets under RLS). The PostgREST root /rest/v1/ is service_role-only now.
// Fired only when due (every KEEPALIVE_MS); other cycles run the plain gateway check.
async function supabaseAuthedCheck(base: string, m: any): Promise<Result> {
  const t0 = performance.now()
  const headers = { apikey: m.anon_key, Authorization: `Bearer ${m.anon_key}`, 'user-agent': 'SakeControl/1.0' }
  try {
    const res = await raceTimeout(
      fetch(`${base}/storage/v1/bucket`, { headers }),
      m.timeout_ms || 10000,
    )
    try { await res.body?.cancel() } catch { /* ignore */ }
    // best-effort second touch on the Auth API so activity shows on more services
    fetch(`${base}/auth/v1/health`, { headers }).then((r) => r.body?.cancel()).catch(() => {})
    const latency = Math.round(performance.now() - t0)
    const code = res.status
    if (code === 401 || code === 403) {
      // gateway alive but the key is wrong → the request never reaches the DB,
      // so keep-alive is NOT working; surface it without a false "down" alert.
      // Not stamped, so it retries every cycle until the key is fixed.
      return { status: 'degraded', code, latency, error: 'anon key rejected — keep-alive inactive', keepalive: false }
    }
    if (code >= 500) return { status: 'down', code, latency, error: `HTTP ${code}`, keepalive: false }
    return { status: latency > DEGRADED_MS ? 'degraded' : 'up', code, latency, error: null, keepalive: true }
  } catch (e) {
    return { status: 'down', code: null, latency: null, error: String((e as any)?.message ?? e), keepalive: false }
  }
}

async function tcpCheck(host: string, port: number, timeout: number, tls: boolean): Promise<Result> {
  const t0 = performance.now()
  let conn: Deno.Conn | undefined
  try {
    conn = await raceTimeout(
      tls ? Deno.connectTls({ hostname: host, port }) : Deno.connect({ hostname: host, port }),
      timeout,
    )
    const latency = Math.round(performance.now() - t0)
    return { status: latency > DEGRADED_MS ? 'degraded' : 'up', code: null, latency, error: null }
  } catch (e) {
    return { status: 'down', code: null, latency: null, error: String((e as any)?.message ?? e) }
  } finally {
    try { conn?.close() } catch { /* ignore */ }
  }
}

async function runCheck(m: any): Promise<Result> {
  const timeout = m.timeout_ms || 10000
  const host = hostFromTarget(m.target)
  switch (m.type) {
    case 'http':
      return httpCheck(m, {})
    case 'keyword':
      return httpCheck(m, { keyword: true })
    case 'supabase': {
      const base = m.target.replace(/\/+$/, '')
      const keepaliveDue = m.anon_key &&
        (!m.last_keepalive_at || Date.now() - new Date(m.last_keepalive_at).getTime() >= KEEPALIVE_MS)
      if (keepaliveDue) return supabaseAuthedCheck(base, m)
      return httpCheck({ ...m, target: `${base}/auth/v1/health`, method: 'GET', expected_status: null }, { reachable: true })
    }
    case 'tcp':
      return tcpCheck(host, m.port || 443, timeout, false)
    case 'ssl':
      return tcpCheck(host, m.port || 443, timeout, true) // TLS handshake fails on expired/invalid cert
    case 'ping':
      return { status: 'down', code: null, latency: null, error: 'ICMP requires the Mac agent (executor=mac)' }
    default:
      return { status: 'down', code: null, latency: null, error: `unknown type ${m.type}` }
  }
}

// ---- email ----
function emailHtml(opts: { down: boolean; project: string; monitor: string; target: string; detail: string }) {
  const { down, project, monitor, target, detail } = opts
  const color = down ? '#E2564A' : '#34C77F'
  const tag = down ? 'НЕ РАБОТАЕТ' : 'ВОССТАНОВЛЕН'
  return `<div style="font-family:Inter,Arial,sans-serif;background:#0A0C0B;color:#EBF1ED;padding:32px">
    <div style="max-width:520px;margin:0 auto;border:1px solid #242B26;border-radius:14px;background:#121613;padding:28px">
      <div style="font:600 12px/1 monospace;letter-spacing:.2em;text-transform:uppercase;color:${color}">Sake Control · ${tag}</div>
      <h1 style="font-size:18px;margin:16px 0 6px;color:#EBF1ED">${monitor}</h1>
      <p style="color:#8A968F;font-size:13px;margin:4px 0">Проект: <b style="color:#EBF1ED">${project}</b></p>
      <p style="color:#8A968F;font-size:13px;margin:4px 0;word-break:break-all">${target}</p>
      <div style="margin:16px 0;padding:12px 14px;border-radius:8px;background:${down ? 'rgba(226,86,74,.1)' : 'rgba(52,199,127,.1)'};border:1px solid ${color}33;color:${color};font:500 13px/1.4 monospace">${detail}</div>
      <a href="${APP_URL}" style="display:inline-block;margin-top:8px;background:#34C77F;color:#0A0C0B;font:600 11px/1 monospace;letter-spacing:.18em;text-transform:uppercase;padding:12px 20px;border-radius:8px;text-decoration:none">Открыть панель</a>
    </div></div>`
}

async function sendEmail(to: string[], subject: string, html: string) {
  if (!RESEND_API_KEY || to.length === 0) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
  } catch { /* best-effort */ }
}

async function recipientsFor(admin: any, project: any): Promise<string[]> {
  const set = new Set<string>((project.notify_emails ?? []).filter(Boolean))
  if (project.alert_members) {
    const { data: members } = await admin
      .from('project_members')
      .select('profiles(alert_email, email)')
      .eq('project_id', project.id)
    for (const mm of members ?? []) {
      const e = mm.profiles?.alert_email || mm.profiles?.email
      if (e) set.add(e)
    }
  }
  // owner / admins always notified
  const { data: admins } = await admin.from('profiles').select('alert_email, email').eq('role', 'admin')
  for (const a of admins ?? []) set.add(a.alert_email || a.email)
  return [...set]
}

async function processMonitor(admin: any, m: any) {
  const res = await runCheck(m)
  const now = new Date()

  await admin.from('checks').insert({
    monitor_id: m.id,
    status: res.status,
    status_code: res.code,
    latency_ms: res.latency,
    error: res.error,
  })

  // 24h uptime (degraded counts as up — service reachable)
  const since = new Date(Date.now() - 86400000).toISOString()
  const { data: rows } = await admin.from('checks').select('status').eq('monitor_id', m.id).gte('checked_at', since)
  const total = rows?.length ?? 0
  const upCount = (rows ?? []).filter((r: any) => r.status !== 'down').length
  const uptime24 = total ? Number(((upCount / total) * 100).toFixed(2)) : null

  const prev = m.monitor_state ?? {}
  const wasDown = (prev.consecutive_failures ?? 0)
  const consecutive = res.status === 'down' ? wasDown + 1 : 0

  await admin.from('monitor_state').upsert({
    monitor_id: m.id,
    status: res.status,
    last_checked_at: now.toISOString(),
    last_latency_ms: res.latency,
    last_status_code: res.code,
    last_error: res.error,
    consecutive_failures: consecutive,
    uptime_24h: uptime24,
    updated_at: now.toISOString(),
  })

  await admin.from('monitors').update({
    next_run_at: new Date(Date.now() + (m.interval_seconds || 300) * 1000).toISOString(),
    // stamp only when the authed ping actually landed, so failures retry next cycle
    ...(res.keepalive ? { last_keepalive_at: now.toISOString() } : {}),
  }).eq('id', m.id)

  // incident transitions
  const { data: openInc } = await admin
    .from('incidents')
    .select('id, started_at')
    .eq('monitor_id', m.id)
    .eq('status', 'open')
    .maybeSingle()

  if (res.status === 'down' && !openInc && consecutive >= FAIL_THRESHOLD) {
    const { data: inc } = await admin
      .from('incidents')
      .insert({ monitor_id: m.id, status: 'open', cause: res.error, notified_open: true, last_notified_at: now.toISOString() })
      .select()
      .single()
    const { data: project } = await admin.from('projects').select('*').eq('id', m.project_id).single()
    const to = await recipientsFor(admin, project)
    await sendEmail(
      to,
      `🔴 ${project.name} · ${m.name} недоступен`,
      emailHtml({ down: true, project: project.name, monitor: m.name, target: m.target, detail: res.error || 'Проверка не прошла' }),
    )
    return { monitor: m.name, status: res.status, opened: inc?.id }
  }

  if (res.status !== 'down' && openInc) {
    await admin.from('incidents').update({
      status: 'resolved',
      resolved_at: now.toISOString(),
      notified_resolved: true,
      last_notified_at: now.toISOString(),
    }).eq('id', openInc.id)
    const { data: project } = await admin.from('projects').select('*').eq('id', m.project_id).single()
    const to = await recipientsFor(admin, project)
    const downMs = Date.now() - new Date(openInc.started_at).getTime()
    const mins = Math.max(1, Math.round(downMs / 60000))
    await sendEmail(
      to,
      `🟢 ${project.name} · ${m.name} восстановлен`,
      emailHtml({ down: false, project: project.name, monitor: m.name, target: m.target, detail: `Недоступность длилась ~${mins} мин` }),
    )
    return { monitor: m.name, status: res.status, resolved: openInc.id }
  }

  return { monitor: m.name, status: res.status }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) })

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  let body: any = {}
  try { body = await req.json() } catch { /* empty body = scheduler */ }

  // On-demand single monitor (from the app) — require an authorized user who can see it.
  if (body?.monitor_id) {
    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401, origin)
    const { data: visible } = await asUser.from('monitors').select('id').eq('id', body.monitor_id).maybeSingle()
    if (!visible) return json({ error: 'Forbidden' }, 403, origin)

    const { data: m } = await admin.from('monitors').select('*, monitor_state(*)').eq('id', body.monitor_id).single()
    const out = await processMonitor(admin, m)
    return json({ ok: true, ...out }, 200, origin)
  }

  // Scheduler path (pg_cron). Optional shared-secret hardening.
  if (CRON_KEY && req.headers.get('x-cron-key') !== CRON_KEY) {
    return json({ error: 'Forbidden' }, 403, origin)
  }

  const { data: due } = await admin
    .from('monitors')
    .select('*, monitor_state(*)')
    .eq('enabled', true)
    .eq('executor', 'cloud')
    .lte('next_run_at', new Date().toISOString())
    .order('next_run_at', { ascending: true })
    .limit(50)

  const results = []
  for (const m of due ?? []) {
    try {
      results.push(await processMonitor(admin, m))
    } catch (e) {
      results.push({ monitor: m.name, error: String((e as any)?.message ?? e) })
    }
  }
  return json({ ok: true, checked: results.length, results }, 200, origin)
})
