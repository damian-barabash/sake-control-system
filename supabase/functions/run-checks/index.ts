// Core health checker. Two entry modes:
//   1. Scheduler (pg_cron, no body): runs every due `executor='cloud'` monitor.
//   2. On-demand: { monitor_id } from the app's "Check now" button (auth required).
//      { test_push: true } sends a test alarm to the caller's own devices.
//
// v9 (2026-07-30) — the "every minute, ironclad" pass:
//   * 1-minute cadence: monitors are claimed atomically via claim_due_monitors()
//     so two overlapping cron invocations can never double-check a monitor, and
//     the batch runs CONCURRENTLY (a serial loop cannot fit 17 monitors x 10s
//     into a 60-second window).
//   * No more false "down": every failed check is retried, and a DNS-class
//     failure is cross-checked against public DNS-over-HTTPS resolvers before
//     anyone gets woken up. The edge runtime's own resolver was intermittently
//     returning "Name or service not known" for hosts that were perfectly alive,
//     which is what made healthy projects flap for hours.
//   * Push that actually arrives: hybrid FCM payload (system notification as the
//     guaranteed floor + data for the app to upgrade into the looping alarm),
//     repeats until acknowledged, and every attempt lands in notification_log.
//
// v13 (2026-11-23) — audit fixes:
//   * Keep-alive touches TWO services that both read Postgres (Storage and
//     PostgREST via /graphql/v1), every 12 h instead of 24 h. A Storage hiccup
//     on a live project is no longer reported as "down".
//   * Keep-alive that silently stopped working (rejected key, failing request)
//     now emails the project's recipients once it is 48 h stale.
//   * Correlated failures: when several monitors time out in the same cycle the
//     likeliest cause is the checker's own network path, so those need more
//     consecutive failed cycles before anyone is woken up.
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
const FAIL_THRESHOLD = 2 // consecutive failed cycles before an incident opens
const CONCURRENCY = 8 // parallel checks per invocation
const BATCH_LIMIT = 100
// Authed keep-alive ping cadence for supabase monitors with an anon key.
// Supabase pauses free projects after 7 idle days; an authenticated request
// twice a day is cheap and leaves no room for the counter to creep up on us.
const KEEPALIVE_MS = 12 * 3600 * 1000
// No successful keep-alive for this long → tell a human (re-alert daily).
const KEEPALIVE_STALE_MS = 48 * 3600 * 1000
const KEEPALIVE_REALERT_MS = 24 * 3600 * 1000
// This many transport-level failures (no HTTP answer at all) in ONE cycle is
// treated as correlated — most likely our own network path, not N outages at
// once — and those monitors need more failed cycles before an incident opens.
const CORRELATED_MIN = 3
const CORRELATED_THRESHOLD = 4
// Alarm repeats: every cycle early on, then slower; give up after a day so a
// permanently dead target doesn't ring forever.
const REPEAT_FAST_COUNT = 15
const REPEAT_FAST_MS = 60_000
const REPEAT_SLOW_MS = 300_000
const REPEAT_MAX_AGE_MS = 24 * 3600 * 1000

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

/// Run tasks with a bounded number in flight. Order of results matches input.
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return out
}

type Result = {
  status: 'up' | 'degraded' | 'down'
  code: number | null
  latency: number | null
  error: string | null
  keepalive?: boolean
  note?: string | null
}

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

// Authenticated Supabase keep-alive: real API requests with the project's anon
// key. They count as project activity, so free-plan projects don't get
// auto-paused, and they prove the API answers — not just that the Kong gateway
// is reachable. Two independent services, both of which read Postgres:
//   * Storage   GET  /storage/v1/bucket  → 200, reads storage.buckets under RLS
//   * PostgREST POST /graphql/v1         → 200, runs graphql_public.graphql()
// (the PostgREST root /rest/v1/ is service_role-only now, so it is not usable).
// Fired only when due (every KEEPALIVE_MS); other cycles run the gateway check.
async function touch(url: string, init: RequestInit, timeout: number): Promise<{ code: number | null; error: string | null }> {
  try {
    const res = await raceTimeout(fetch(url, init), timeout)
    try { await res.body?.cancel() } catch { /* ignore */ }
    return { code: res.status, error: null }
  } catch (e) {
    return { code: null, error: String((e as any)?.message ?? e) }
  }
}

async function supabaseAuthedCheck(base: string, m: any): Promise<Result> {
  const headers = { apikey: m.anon_key, Authorization: `Bearer ${m.anon_key}`, 'user-agent': 'SakeControl/1.0' }
  const t0 = performance.now()
  const storage = await touch(`${base}/storage/v1/bucket`, { headers }, m.timeout_ms || 10000)
  const latency = Math.round(performance.now() - t0)

  if (storage.code === 401 || storage.code === 403) {
    // gateway alive but the key is wrong → the request never reaches the DB,
    // so keep-alive is NOT working; surface it without a false "down" alert.
    // Not stamped, so it retries every cycle until the key is fixed, and the
    // keep-alive watch emails the owner once it has been stale for 48 h.
    return { status: 'degraded', code: storage.code, latency, error: 'anon key rejected — keep-alive inactive', keepalive: false }
  }

  // second, independent touch (PostgREST → Postgres) + a best-effort Auth hit
  const [gql] = await Promise.all([
    touch(`${base}/graphql/v1`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: '{"query":"{ __typename }"}',
    }, 6000),
    touch(`${base}/auth/v1/health`, { headers }, 6000),
  ])

  const storageOk = storage.code !== null && storage.code >= 200 && storage.code < 300
  const gqlOk = gql.code === 200
  if (storageOk || gqlOk) {
    return {
      status: latency > DEGRADED_MS ? 'degraded' : 'up',
      code: storageOk ? storage.code : gql.code,
      latency,
      error: null,
      keepalive: true,
      note: storageOk && gqlOk ? null : `keep-alive: ${storageOk ? 'storage' : 'graphql'} ok, ${storageOk ? 'graphql' : 'storage'} не ответил`,
    }
  }

  // Neither request reached the database. Before calling the whole project
  // down, ask the gateway: a Storage outage on a live project is not an outage.
  const why = storage.code !== null ? `HTTP ${storage.code}` : (storage.error ?? 'нет ответа')
  const gw = await httpCheck({ ...m, target: `${base}/auth/v1/health`, method: 'GET', expected_status: null }, { reachable: true })
  if (gw.status === 'down') return { ...gw, keepalive: false }
  return {
    status: 'degraded',
    code: gw.code,
    latency: gw.latency,
    error: `keep-alive не прошёл (${why}) — проект отвечает, повтор в следующем цикле`,
    keepalive: false,
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

// ---- second opinion: is the target down, or is OUR resolver having a moment? ----
// The edge runtime has been observed returning "failed to lookup address
// information" for hours on hosts that answer instantly from everywhere else.
// Treating that as "down" is exactly the false alarm this system must not raise.
const DNS_ERROR = /dns error|failed to lookup address|name or service not known|nodename nor servname/i
const TRANSIENT = /connection reset|tls handshake|broken pipe|unexpected eof|connection refused|timeout/i

type Doh = { resolved: boolean; nxdomain: boolean; ips: string[] }

async function resolveDoh(host: string): Promise<Doh> {
  const providers = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
    `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`,
  ]
  for (const url of providers) {
    try {
      const res = await raceTimeout(fetch(url, { headers: { accept: 'application/dns-json' } }), 5000)
      if (!res.ok) { try { await res.body?.cancel() } catch { /* ignore */ } ; continue }
      const j = await res.json()
      // RCODE 3 = NXDOMAIN: authoritative "this name does not exist"
      if (j.Status === 3) return { resolved: true, nxdomain: true, ips: [] }
      if (j.Status === 0) {
        const ips = (j.Answer ?? [])
          .filter((a: any) => a.type === 1 && typeof a.data === 'string')
          .map((a: any) => a.data)
        if (ips.length) return { resolved: true, nxdomain: false, ips }
      }
    } catch { /* try the next provider */ }
  }
  return { resolved: false, nxdomain: false, ips: [] }
}

/// Plain TCP reachability against a known-good IP — no DNS, no certificate
/// validation, just "does something accept a connection there".
async function tcpProbe(ip: string, port: number, timeout: number): Promise<boolean> {
  let conn: Deno.Conn | undefined
  try {
    conn = await raceTimeout(Deno.connect({ hostname: ip, port }), Math.min(timeout, 8000))
    return true
  } catch {
    return false
  } finally {
    try { conn?.close() } catch { /* ignore */ }
  }
}

/// A check nobody has to second-guess: retry, then verify a DNS failure against
/// public resolvers before declaring an outage.
async function reliableCheck(m: any): Promise<Result> {
  const first = await runCheck(m)
  if (first.status !== 'down') return first

  // Attempt two — a single blip should never reach anyone's phone.
  await sleep(1500)
  const second = await runCheck(m)
  if (second.status !== 'down') {
    return { ...second, note: 'первая попытка не прошла, подтверждено со второй' }
  }

  const err = second.error ?? ''
  if (!DNS_ERROR.test(err)) {
    // A genuine transport/HTTP failure, confirmed twice.
    return second
  }

  const host = hostFromTarget(m.target)
  const doh = await resolveDoh(host)

  if (doh.nxdomain) {
    return {
      ...second,
      error: `хост не существует в DNS (NXDOMAIN): ${host} — проверьте адрес монитора`,
      note: 'подтверждено публичными DNS-резолверами',
    }
  }

  if (doh.ips.length) {
    // Public DNS knows the host; our runtime did not. Prove liveness by IP.
    const port = m.port || (m.target.startsWith('http://') ? 80 : 443)
    const alive = await tcpProbe(doh.ips[0], port, m.timeout_ms || 10000)
    if (alive) {
      return {
        status: 'up',
        code: null,
        latency: null,
        error: null,
        note: `DNS проверяющего не сработал; хост подтверждён напрямую (${doh.ips[0]}:${port})`,
      }
    }
    return { ...second, error: `${host} резолвится, но не принимает соединения на порт ${port}` }
  }

  // Public resolvers unreachable too — most likely the checker has no network.
  // Report down, but say plainly that this is unconfirmed.
  return { ...second, note: 'не удалось подтвердить: публичные DNS-резолверы тоже недоступны' }
}

// ---- email ----
function emailHtml(opts: { down: boolean; project: string; monitor: string; target: string; detail: string; tag?: string; color?: string }) {
  const { down, project, monitor, target, detail } = opts
  const color = opts.color ?? (down ? '#E2564A' : '#34C77F')
  const tag = opts.tag ?? (down ? 'НЕ РАБОТАЕТ' : 'ВОССТАНОВЛЕН')
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

async function logDelivery(admin: any, rows: any[]) {
  if (!rows.length) return
  try { await admin.from('notification_log').insert(rows) } catch { /* never block on the journal */ }
}

async function sendEmail(
  admin: any,
  ctx: { monitorId: string; incidentId: string | null; kind: string },
  to: string[],
  subject: string,
  html: string,
) {
  if (!RESEND_API_KEY || to.length === 0) return
  let ok = false
  let error: string | null = null
  try {
    const res = await raceTimeout(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    }), 15000)
    ok = res.ok
    if (!ok) error = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`
    else { try { await res.body?.cancel() } catch { /* ignore */ } }
  } catch (e) {
    error = String((e as any)?.message ?? e)
  }
  await logDelivery(admin, to.map((t) => ({
    incident_id: ctx.incidentId, monitor_id: ctx.monitorId, channel: 'email', kind: ctx.kind, target: t, ok, error,
  })))
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
  // the project owner is always notified (NOT every tenant admin — multi-tenant)
  if (project.created_by) {
    const { data: owner } = await admin.from('profiles').select('alert_email, email').eq('id', project.created_by).maybeSingle()
    if (owner) set.add(owner.alert_email || owner.email)
  }
  return [...set]
}

// ---- FCM push (HTTP v1, service-account OAuth) ----
const FCM_SA = Deno.env.get('FCM_SERVICE_ACCOUNT')
const ALARM_CHANNEL = 'sake_alarm_v2'
const INFO_CHANNEL = 'sake_info_v1'

const b64url = (s: string | Uint8Array) => {
  const bytes = typeof s === 'string' ? new TextEncoder().encode(s) : s
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

let fcmCache: { token: string; exp: number } | null = null
async function fcmAccessToken(): Promise<{ token: string; projectId: string } | null> {
  if (!FCM_SA) return null
  const sa = JSON.parse(FCM_SA)
  if (fcmCache && Date.now() < fcmCache.exp - 60000) return { token: fcmCache.token, projectId: sa.project_id }
  try {
    const iat = Math.floor(Date.now() / 1000)
    const input = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp: iat + 3600,
    }))}`
    const key = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
    const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input)))
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${input}.${b64url(sig)}`,
    })
    const j = await res.json()
    if (!j.access_token) return null
    fcmCache = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 }
    return { token: j.access_token, projectId: sa.project_id }
  } catch {
    return null
  }
}

type Device = { token: string; platform: string; alarm: boolean; userId: string }

// Devices to push for a project: moderators + owner + members, honoring alert_prefs.
async function pushDevicesFor(admin: any, project: any): Promise<Device[]> {
  const ids = new Set<string>()
  const { data: mods } = await admin.from('profiles').select('id').eq('role', 'moderator')
  for (const r of mods ?? []) ids.add(r.id)
  if (project.created_by) ids.add(project.created_by)
  const { data: mems } = await admin.from('project_members').select('user_id').eq('project_id', project.id)
  for (const r of mems ?? []) ids.add(r.user_id)
  if (!ids.size) return []
  const { data: prefs } = await admin.from('alert_prefs').select('user_id, push_enabled, alarm_enabled').eq('project_id', project.id).in('user_id', [...ids])
  const users = [...ids]
    .map((id) => {
      const p = (prefs ?? []).find((x: any) => x.user_id === id)
      return { id, push: p?.push_enabled ?? true, alarm: p?.alarm_enabled ?? true }
    })
    .filter((u) => u.push)
  if (!users.length) return []
  const { data: toks } = await admin.from('push_tokens').select('user_id, token, platform').in('user_id', users.map((u) => u.id))
  return (toks ?? []).map((t: any) => ({
    token: t.token,
    platform: t.platform,
    alarm: users.find((u) => u.id === t.user_id)!.alarm,
    userId: t.user_id,
  }))
}

/// One FCM message. The Android payload is deliberately HYBRID:
/// `notification` guarantees the phone rings even if the OS refuses to spin up
/// our background isolate (Doze, aggressive OEM battery managers, app killed) —
/// that was the "sometimes it arrives, sometimes it doesn't". `data` rides along
/// so the app, when it does wake, replaces that notification (same tag) with the
/// insistent looping alarm and can open the full-screen alarm screen.
function buildMessage(d: Device, data: Record<string, string>, title: string, body: string, alarm: boolean) {
  if (d.platform === 'android') {
    return {
      token: d.token,
      data,
      android: {
        priority: 'HIGH',
        ttl: '3600s',
        notification: {
          title,
          body,
          tag: data.incident_id, // app's local notification reuses this tag → replaces, never duplicates
          channel_id: alarm ? ALARM_CHANNEL : INFO_CHANNEL,
          notification_priority: alarm ? 'PRIORITY_MAX' : 'PRIORITY_HIGH',
          default_vibrate_timings: true,
          visibility: 'PUBLIC',
          ...(alarm ? { sound: 'alarm' } : {}),
        },
      },
    }
  }
  return {
    token: d.token,
    data,
    apns: {
      headers: { 'apns-priority': '10', 'apns-push-type': 'alert', ...(alarm ? { 'apns-collapse-id': data.incident_id } : {}) },
      payload: {
        aps: {
          alert: { title, body },
          // 'default' on purpose: a named sound that is not bundled in the IPA
          // can land as a silent push, which is the worst possible failure here.
          sound: 'default',
          'interruption-level': alarm ? 'time-sensitive' : 'active',
          'relevance-score': alarm ? 1 : 0.5,
        },
      },
    },
  }
}

async function sendPush(
  admin: any,
  project: any,
  monitor: any,
  incidentId: string,
  kind: 'open' | 'repeat' | 'resolved',
  detail: string,
): Promise<{ sent: number; failed: number }> {
  const auth = await fcmAccessToken()
  if (!auth) {
    await logDelivery(admin, [{
      incident_id: incidentId, monitor_id: monitor.id, channel: 'push', kind,
      target: null, ok: false, error: 'FCM_SERVICE_ACCOUNT missing or invalid',
    }])
    return { sent: 0, failed: 0 }
  }
  const devices = await pushDevicesFor(admin, project)
  if (!devices.length) {
    // Worth recording: "nobody has a registered device" looks identical to
    // "push failed" from the outside, and it is the likelier cause.
    await logDelivery(admin, [{
      incident_id: incidentId, monitor_id: monitor.id, channel: 'push', kind,
      target: null, ok: false, error: 'нет зарегистрированных устройств у получателей',
    }])
    return { sent: 0, failed: 0 }
  }
  const resolved = kind === 'resolved'
  const title = resolved ? `🟢 ${project.name} · ${monitor.name}` : `🔴 ${project.name} · ${monitor.name}`
  const body = resolved ? detail : (detail || 'Монитор недоступен')
  const base = {
    type: `incident_${kind}`,
    incident_id: incidentId,
    project_id: String(project.id),
    project: project.name,
    monitor: monitor.name,
    detail: body,
    title,
  }

  const logs: any[] = []
  let sent = 0
  let failed = 0
  await pool(devices, 6, async (d) => {
    const alarm = d.alarm && !resolved
    const message = buildMessage(d, { ...base, alarm: alarm ? '1' : '0' }, title, body, alarm)
    let ok = false
    let error: string | null = null
    try {
      const res = await raceTimeout(fetch(`https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      }), 15000)
      ok = res.ok
      if (!ok) {
        const t = await res.text()
        error = `HTTP ${res.status}: ${t.slice(0, 200)}`
        // stale/unregistered token → drop it so we stop paying for it
        if (/UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/.test(t)) {
          await admin.from('push_tokens').delete().eq('token', d.token)
        }
      } else {
        try { await res.body?.cancel() } catch { /* ignore */ }
      }
    } catch (e) {
      error = String((e as any)?.message ?? e)
    }
    ok ? sent++ : failed++
    logs.push({
      incident_id: incidentId, monitor_id: monitor.id, channel: 'push', kind,
      target: `${d.platform}:${d.token.slice(0, 12)}…`, ok, error,
    })
  })
  await logDelivery(admin, logs)
  return { sent, failed }
}

// Re-push open unacked incidents until someone presses "Я знаю". Apple gives no
// looping sound without Critical Alerts entitlement, so the server keeps knocking.
// Guard rails: only while the monitor is genuinely still down, and never past a day.
async function repeatUnacked(admin: any) {
  const { data: unacked } = await admin
    .from('incidents')
    .select('id, monitor_id, started_at, last_notified_at, push_repeats')
    .eq('status', 'open')
    .is('acked_at', null)
    .eq('notified_open', true)
  for (const inc of unacked ?? []) {
    const repeats = inc.push_repeats ?? 0
    if (Date.now() - new Date(inc.started_at).getTime() > REPEAT_MAX_AGE_MS) continue
    const interval = repeats < REPEAT_FAST_COUNT ? REPEAT_FAST_MS : REPEAT_SLOW_MS
    const last = new Date(inc.last_notified_at ?? inc.started_at).getTime()
    if (Date.now() - last < interval - 5000) continue

    const { data: m } = await admin.from('monitors').select('*, monitor_state(status, last_error)').eq('id', inc.monitor_id).maybeSingle()
    if (!m) continue
    // Don't keep screaming at someone if the thing came back but the incident
    // hasn't been closed yet for whatever reason.
    if (m.monitor_state?.status && m.monitor_state.status !== 'down') continue
    const { data: project } = await admin.from('projects').select('*').eq('id', m.project_id).maybeSingle()
    if (!project) continue

    await sendPush(admin, project, m, inc.id, 'repeat', m.monitor_state?.last_error || 'Монитор всё ещё недоступен')
    await admin.from('incidents').update({
      push_repeats: repeats + 1,
      last_notified_at: new Date().toISOString(),
    }).eq('id', inc.id)
  }
}

async function processMonitor(
  admin: any,
  m: any,
  opts: { bumpNextRun?: boolean; res?: Result; failThreshold?: number } = {},
) {
  const res = opts.res ?? await reliableCheck(m)
  const failThreshold = opts.failThreshold ?? FAIL_THRESHOLD
  const now = new Date()

  await admin.from('checks').insert({
    monitor_id: m.id,
    status: res.status,
    status_code: res.code,
    latency_ms: res.latency,
    error: res.error,
    note: res.note ?? null,
  })

  // uptime is counted in Postgres now — no more hauling 1440 rows per monitor
  let u24: number | null = null, u7: number | null = null, u30: number | null = null
  try {
    const { data: up } = await admin.rpc('monitor_uptime', { p_monitor: m.id })
    const row = Array.isArray(up) ? up[0] : up
    if (row) { u24 = row.u24; u7 = row.u7; u30 = row.u30 }
  } catch { /* uptime is cosmetic; never fail a check over it */ }

  const prev = m.monitor_state ?? {}
  const consecutive = res.status === 'down' ? (prev.consecutive_failures ?? 0) + 1 : 0

  await admin.from('monitor_state').upsert({
    monitor_id: m.id,
    status: res.status,
    last_checked_at: now.toISOString(),
    last_latency_ms: res.latency,
    last_status_code: res.code,
    last_error: res.error,
    last_note: res.note ?? null,
    consecutive_failures: consecutive,
    uptime_24h: u24,
    uptime_7d: u7,
    uptime_30d: u30,
    updated_at: now.toISOString(),
  })

  const patch: any = {}
  // the scheduler path already claimed (and advanced) next_run_at atomically
  if (opts.bumpNextRun) patch.next_run_at = new Date(Date.now() + (m.interval_seconds || 60) * 1000).toISOString()
  // stamp only when the authed ping actually landed, so failures retry next cycle
  if (res.keepalive) {
    patch.last_keepalive_at = now.toISOString()
    patch.keepalive_alerted_at = null // healthy again → the stale alert re-arms
  }
  if (Object.keys(patch).length) await admin.from('monitors').update(patch).eq('id', m.id)

  // incident transitions
  const { data: openInc } = await admin
    .from('incidents')
    .select('id, started_at')
    .eq('monitor_id', m.id)
    .eq('status', 'open')
    .maybeSingle()

  if (res.status === 'down' && !openInc && consecutive >= failThreshold) {
    const { data: inc } = await admin
      .from('incidents')
      .insert({ monitor_id: m.id, status: 'open', cause: res.error, notified_open: true, last_notified_at: now.toISOString() })
      .select()
      .single()
    const { data: project } = await admin.from('projects').select('*').eq('id', m.project_id).single()
    const to = await recipientsFor(admin, project)
    await sendEmail(
      admin,
      { monitorId: m.id, incidentId: inc?.id ?? null, kind: 'open' },
      to,
      `🔴 ${project.name} · ${m.name} недоступен`,
      emailHtml({ down: true, project: project.name, monitor: m.name, target: m.target, detail: res.error || 'Проверка не прошла' }),
    )
    let push = { sent: 0, failed: 0 }
    if (inc) push = await sendPush(admin, project, m, inc.id, 'open', res.error || 'Проверка не прошла')
    return { monitor: m.name, status: res.status, opened: inc?.id, push }
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
      admin,
      { monitorId: m.id, incidentId: openInc.id, kind: 'resolved' },
      to,
      `🟢 ${project.name} · ${m.name} восстановлен`,
      emailHtml({ down: false, project: project.name, monitor: m.name, target: m.target, detail: `Недоступность длилась ~${mins} мин` }),
    )
    await sendPush(admin, project, m, openInc.id, 'resolved', `Восстановлен · лежал ~${mins} мин`)
    return { monitor: m.name, status: res.status, resolved: openInc.id }
  }

  return { monitor: m.name, status: res.status, note: res.note ?? undefined }
}

/// Keep-alive that quietly stopped working is the one failure this feature
/// cannot afford: nothing looks wrong until the project is paused a week later.
/// A rejected key or a failing request only turns the monitor yellow, so this
/// watch emails the project's recipients once keep-alive is 48 h stale, and
/// again every 24 h until it lands. A monitor that is plainly down is skipped —
/// the incident alarm already covers it.
async function keepaliveWatch(admin: any, opts: { dryRun?: boolean; staleMs?: number } = {}) {
  const staleMs = opts.staleMs ?? KEEPALIVE_STALE_MS
  const { data: mons, error } = await admin
    .from('monitors')
    .select('id, name, target, project_id, anon_key, created_at, last_keepalive_at, keepalive_alerted_at, monitor_state(status, last_error)')
    .eq('type', 'supabase')
    .eq('enabled', true)
    .not('anon_key', 'is', null)
  if (error) throw new Error(error.message)
  const out: any[] = []
  for (const m of mons ?? []) {
    if (!m.anon_key) continue
    const st = Array.isArray(m.monitor_state) ? m.monitor_state[0] : m.monitor_state
    const since = new Date(m.last_keepalive_at ?? m.created_at).getTime()
    const staleFor = Date.now() - since
    if (staleFor < staleMs) continue
    const down = st?.status === 'down'
    const alertedRecently = m.keepalive_alerted_at &&
      Date.now() - new Date(m.keepalive_alerted_at).getTime() < KEEPALIVE_REALERT_MS
    const hours = Math.floor(staleFor / 3600000)
    const willAlert = !down && !alertedRecently
    out.push({ monitor: m.name, last_keepalive_at: m.last_keepalive_at, stale_hours: hours, down, alert: willAlert })
    if (opts.dryRun || !willAlert) continue

    const { data: project } = await admin.from('projects').select('*').eq('id', m.project_id).maybeSingle()
    if (!project) continue
    const to = await recipientsFor(admin, project)
    const reason = st?.last_error || 'запрос keep-alive не проходит'
    await sendEmail(
      admin,
      { monitorId: m.id, incidentId: null, kind: 'keepalive' },
      to,
      `🟡 ${project.name} · ${m.name}: keep-alive не работает ${hours} ч`,
      emailHtml({
        down: true,
        tag: 'KEEP-ALIVE НЕ РАБОТАЕТ',
        color: '#E3B341',
        project: project.name,
        monitor: m.name,
        target: m.target,
        detail: `Последний успешный keep-alive был ${hours} ч назад. Причина: ${reason}. ` +
          `Supabase ставит бесплатный проект на паузу после 7 дней без активности — проверьте anon-ключ монитора.`,
      }),
    )
    await admin.from('monitors').update({ keepalive_alerted_at: new Date().toISOString() }).eq('id', m.id)
  }
  return out
}

/// Fires a real alarm push at the caller's own devices, so "are notifications
/// actually working on this phone?" has a one-tap answer instead of waiting for
/// a real outage to find out.
async function sendTestPush(admin: any, userId: string) {
  const auth = await fcmAccessToken()
  if (!auth) return { ok: false, error: 'FCM не настроен на сервере', devices: 0 }
  const { data: toks } = await admin.from('push_tokens').select('token, platform, user_id').eq('user_id', userId)
  if (!toks?.length) return { ok: false, error: 'на этом аккаунте нет зарегистрированных устройств', devices: 0 }
  const fakeIncident = crypto.randomUUID()
  const data = {
    type: 'incident_test',
    incident_id: fakeIncident,
    project_id: '',
    project: 'Sake Control',
    monitor: 'Тест уведомлений',
    detail: 'Если вы это слышите и видите — аларм работает.',
    title: '🔔 Sake Control · тест',
    alarm: '1',
  }
  let sent = 0
  const logs: any[] = []
  for (const t of toks) {
    const d: Device = { token: t.token, platform: t.platform, alarm: true, userId }
    const message = buildMessage(d, data, data.title, data.detail, true)
    let ok = false
    let error: string | null = null
    try {
      const res = await raceTimeout(fetch(`https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      }), 15000)
      ok = res.ok
      if (!ok) error = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`
      else { try { await res.body?.cancel() } catch { /* ignore */ } ; sent++ }
    } catch (e) {
      error = String((e as any)?.message ?? e)
    }
    logs.push({ incident_id: null, monitor_id: null, channel: 'push', kind: 'test', target: `${t.platform}:${t.token.slice(0, 12)}…`, ok, error })
  }
  await logDelivery(admin, logs)
  return { ok: sent > 0, devices: toks.length, sent, error: sent ? null : (logs[0]?.error ?? 'не доставлено') }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) })

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  let body: any = {}
  try { body = await req.json() } catch { /* empty body = scheduler */ }

  // ---- authenticated per-user actions ----
  if (body?.monitor_id || body?.test_push) {
    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401, origin)

    if (body.test_push) {
      const out = await sendTestPush(admin, user.id)
      return json(out, 200, origin)
    }

    const { data: visible } = await asUser.from('monitors').select('id').eq('id', body.monitor_id).maybeSingle()
    if (!visible) return json({ error: 'Forbidden' }, 403, origin)

    const { data: m } = await admin.from('monitors').select('*, monitor_state(*)').eq('id', body.monitor_id).single()
    const out = await processMonitor(admin, m, { bumpNextRun: true })
    return json({ ok: true, ...out }, 200, origin)
  }

  // ---- scheduler path (pg_cron). Optional shared-secret hardening. ----
  if (CRON_KEY && req.headers.get('x-cron-key') !== CRON_KEY) {
    return json({ error: 'Forbidden' }, 403, origin)
  }

  // Ops self-test: asks Google to validate credentials, payload and every
  // registered token WITHOUT delivering anything. Answers "would the alarm go
  // out right now?" without waking anybody up.
  if (body?.fcm_selftest) {
    const auth = await fcmAccessToken()
    if (!auth) return json({ ok: false, error: 'FCM_SERVICE_ACCOUNT missing or invalid' }, 200, origin)
    const { data: toks } = await admin.from('push_tokens').select('token, platform, user_id')
    const checked = await pool(toks ?? [], 6, async (t: any) => {
      const d: Device = { token: t.token, platform: t.platform, alarm: true, userId: t.user_id }
      const message = buildMessage(d, {
        type: 'incident_open', incident_id: '00000000-0000-0000-0000-000000000000',
        project_id: '', project: 'selftest', monitor: 'selftest', detail: 'selftest', title: 'selftest', alarm: '1',
      }, 'selftest', 'selftest', true)
      try {
        const res = await raceTimeout(fetch(`https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ validate_only: true, message }),
        }), 15000)
        const txt = await res.text()
        return { token: `${t.platform}:${t.token.slice(0, 12)}…`, ok: res.ok, detail: res.ok ? 'valid' : txt.slice(0, 220) }
      } catch (e) {
        return { token: `${t.platform}:${t.token.slice(0, 12)}…`, ok: false, detail: String((e as any)?.message ?? e) }
      }
    })
    return json({ ok: true, credentials: 'ok', project: auth.projectId, devices: checked }, 200, origin)
  }

  // Ops dry run: which monitors does the keep-alive watch consider stale right
  // now? Sends nothing. `stale_hours` overrides the 48 h bar for inspection.
  if (body?.keepalive_watch_dryrun) {
    try {
      const hrs = Number(body.stale_hours)
      const list = await keepaliveWatch(admin, { dryRun: true, staleMs: hrs > 0 ? hrs * 3600000 : undefined })
      return json({ ok: true, stale: list }, 200, origin)
    } catch (e) {
      return json({ ok: false, error: String((e as any)?.message ?? e) }, 200, origin)
    }
  }

  // Claim atomically: overlapping invocations get disjoint batches, so a check
  // that runs long can never be duplicated by the next minute's cron tick.
  const { data: due, error: claimErr } = await admin.rpc('claim_due_monitors', { p_limit: BATCH_LIMIT })
  if (claimErr) return json({ error: `claim failed: ${claimErr.message}` }, 500, origin)

  // Phase 1 — probe everything first, so the verdicts can be read TOGETHER.
  const batch: any[] = due ?? []
  const probed = await pool(batch, CONCURRENCY, async (m: any): Promise<Result | { failed: string }> => {
    try {
      return await reliableCheck(m)
    } catch (e) {
      return { failed: String((e as any)?.message ?? e) }
    }
  })

  // A transport-level failure = no HTTP answer at all (timeout, reset, refused).
  // NXDOMAIN is excluded: that verdict is already confirmed by public resolvers.
  const isTransportDown = (r: any) =>
    r && !r.failed && r.status === 'down' && r.code === null && !/NXDOMAIN/.test(r.error ?? '')
  const transportDown = probed.filter(isTransportDown).length
  const correlated = transportDown >= CORRELATED_MIN

  // Phase 2 — record results and run incident logic.
  const results = await pool(batch.map((m, i) => ({ m, r: probed[i] })), CONCURRENCY, async ({ m, r }: any) => {
    if (r.failed) return { monitor: m.name, error: r.failed }
    try {
      const suspect = correlated && isTransportDown(r)
      const res: Result = suspect
        ? { ...r, note: `одновременно не ответили ${transportDown} монитора(ов) — возможен сбой сети проверяющего; аларм после ${CORRELATED_THRESHOLD} циклов подряд` }
        : r
      return await processMonitor(admin, m, { res, failThreshold: suspect ? CORRELATED_THRESHOLD : FAIL_THRESHOLD })
    } catch (e) {
      return { monitor: m.name, error: String((e as any)?.message ?? e) }
    }
  })

  try { await repeatUnacked(admin) } catch { /* best-effort */ }

  let keepalive: any[] = []
  try { keepalive = await keepaliveWatch(admin) } catch { /* best-effort */ }

  return json({
    ok: true,
    checked: results.length,
    correlated: correlated ? transportDown : 0,
    keepalive_stale: keepalive.length,
    results,
  }, 200, origin)
})
