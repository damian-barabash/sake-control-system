import { MSTATUS } from '../lib/constants'
import { useT } from '../context/LangContext'

export function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-line2 border-t-accent ${className}`}
    />
  )
}

export function StatusDot({ status = 'unknown', pulse = false }) {
  const s = MSTATUS[status] ?? MSTATUS.unknown
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {pulse && status === 'down' && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60 pulse"
          style={{ background: s.dot }}
        />
      )}
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: s.dot }} />
    </span>
  )
}

export function StatusBadge({ status = 'unknown', size = 'md' }) {
  const { t } = useT()
  const key = MSTATUS[status] ? status : 'unknown'
  const s = MSTATUS[key]
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-line font-mono uppercase tracking-label ${pad}`}
      style={{ color: s.text }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {t('enum.mstatus.' + key)}
    </span>
  )
}

export function Avatar({ name, email, size = 28 }) {
  const seed = (name || email || '?').trim()
  const initials = seed
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-surface2 border border-line font-mono text-[10px] text-muted"
      style={{ width: size, height: size }}
      title={name || email}
    >
      {initials || '?'}
    </span>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 group"
    >
      <span
        className={`relative h-5 w-9 rounded-full border transition-colors ${
          checked ? 'bg-accent/90 border-accent' : 'bg-surface2 border-line'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-bg transition-all ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
      {label && <span className="text-sm text-ink">{label}</span>}
    </button>
  )
}

export function EmptyState({ title, hint, children }) {
  return (
    <div className="brackets relative mx-auto max-w-md px-10 py-16 text-center">
      <div className="font-mono uppercase tracking-label text-[11px] text-muted">{title}</div>
      {hint && <p className="mt-3 text-sm text-faint">{hint}</p>}
      {children && <div className="mt-6 flex justify-center">{children}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  const { t } = useT()
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-12 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className={`brackets relative w-full ${width} rounded-xl2 border border-line bg-surface p-7`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-mono uppercase tracking-label text-[12px] text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="font-mono text-faint hover:text-ink transition-colors"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="label block mb-2">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] text-faint">{hint}</span>}
    </label>
  )
}
