import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../context/LangContext'
import { Modal, Field, Toggle, Spinner } from './ui'
import { MONITOR_TYPES, EXECUTORS, HTTP_METHODS, TYPE_FIELDS, DEFAULT_PORT } from '../lib/constants'

const num = (v) => (v === '' || v == null ? null : Number(v))

export function MonitorFormModal({ open, onClose, projectId, monitor, onSaved }) {
  const { t } = useT()
  const editing = !!monitor
  const [form, setForm] = useState(() => ({
    name: monitor?.name ?? '',
    type: monitor?.type ?? 'http',
    executor: monitor?.executor ?? 'cloud',
    target: monitor?.target ?? '',
    port: monitor?.port ?? '',
    method: monitor?.method ?? 'GET',
    expected_status: monitor?.expected_status ?? '',
    keyword: monitor?.keyword ?? '',
    interval_seconds: monitor?.interval_seconds ?? 300,
    timeout_ms: monitor?.timeout_ms ?? 10000,
    ssl_warn_days: monitor?.ssl_warn_days ?? 14,
    anon_key: monitor?.anon_key ?? '',
    enabled: monitor?.enabled ?? true,
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const fields = TYPE_FIELDS[form.type] ?? []
  const has = (f) => fields.includes(f)

  function onType(type) {
    setForm((f) => ({
      ...f,
      type,
      port: f.port || DEFAULT_PORT[type] || '',
    }))
  }

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    const payload = {
      project_id: projectId,
      name: form.name.trim(),
      type: form.type,
      executor: form.executor,
      target: form.target.trim(),
      port: has('port') ? num(form.port) : null,
      method: has('method') ? form.method : 'GET',
      expected_status: has('expected_status') ? num(form.expected_status) : null,
      keyword: has('keyword') ? form.keyword.trim() || null : null,
      anon_key: has('anon_key') ? form.anon_key.trim() || null : null,
      interval_seconds: num(form.interval_seconds) || 300,
      timeout_ms: num(form.timeout_ms) || 10000,
      ssl_warn_days: num(form.ssl_warn_days) || 14,
      enabled: form.enabled,
    }
    try {
      const res = editing
        ? await supabase.from('monitors').update(payload).eq('id', monitor.id).select().single()
        : await supabase.from('monitors').insert(payload).select().single()
      if (res.error) {
        setError(res.error.message)
        return
      }
      onSaved?.(res.data)
      onClose()
    } catch (e) {
      setError(String(e?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  const targetHint = form.type === 'tcp' || form.type === 'ping' ? t('monitorForm.targetHintTcp') : t('monitorForm.targetHintHttp')

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('monitorForm.editTitle') : t('monitorForm.newTitle')} width="max-w-xl">
      <form onSubmit={submit} className="space-y-5">
        <Field label={t('monitorForm.name')}>
          <input className="field-box" value={form.name} onChange={(e) => set('name', e.target.value)} required autoFocus />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('monitorForm.type')}>
            <select className="field-box" value={form.type} onChange={(e) => onType(e.target.value)}>
              {MONITOR_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t('enum.mtype.' + ty)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('monitorForm.executor')}>
            <select className="field-box" value={form.executor} onChange={(e) => set('executor', e.target.value)}>
              {EXECUTORS.map((ex) => (
                <option key={ex} value={ex}>
                  {t('enum.executor.' + ex)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t('monitorForm.target')} hint={targetHint}>
          <input className="field-box" value={form.target} onChange={(e) => set('target', e.target.value)} required placeholder={targetHint} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          {has('port') && (
            <Field label={t('monitorForm.port')}>
              <input className="field-box" type="number" value={form.port} onChange={(e) => set('port', e.target.value)} />
            </Field>
          )}
          {has('method') && (
            <Field label={t('monitorForm.method')}>
              <select className="field-box" value={form.method} onChange={(e) => set('method', e.target.value)}>
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {has('expected_status') && (
            <Field label={t('monitorForm.expectedStatus')}>
              <input className="field-box" type="number" value={form.expected_status} onChange={(e) => set('expected_status', e.target.value)} placeholder="200" />
            </Field>
          )}
          {has('ssl_warn_days') && (
            <Field label={t('monitorForm.sslWarnDays')}>
              <input className="field-box" type="number" value={form.ssl_warn_days} onChange={(e) => set('ssl_warn_days', e.target.value)} />
            </Field>
          )}
        </div>

        {has('keyword') && (
          <Field label={t('monitorForm.keyword')}>
            <input className="field-box" value={form.keyword} onChange={(e) => set('keyword', e.target.value)} placeholder="ok" />
          </Field>
        )}

        {has('anon_key') && (
          <Field label={t('monitorForm.anonKey')} hint={t('monitorForm.anonKeyHint')}>
            <input
              className="field-box font-mono text-xs"
              value={form.anon_key}
              onChange={(e) => set('anon_key', e.target.value)}
              placeholder="eyJ… / sb_publishable_…"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('monitorForm.interval')}>
            <input className="field-box" type="number" value={form.interval_seconds} onChange={(e) => set('interval_seconds', e.target.value)} min={60} />
          </Field>
          <Field label={t('monitorForm.timeout')}>
            <input className="field-box" type="number" value={form.timeout_ms} onChange={(e) => set('timeout_ms', e.target.value)} />
          </Field>
        </div>

        <Toggle checked={form.enabled} onChange={(v) => set('enabled', v)} label={t('monitorForm.enabled')} />

        {error && <p className="text-down text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-solid" disabled={busy}>
            {busy ? <Spinner /> : editing ? t('common.save') : t('common.create')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
