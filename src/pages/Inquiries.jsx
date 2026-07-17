import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../context/LangContext'
import { AppShell } from '../components/AppShell'
import { Spinner, EmptyState } from '../components/ui'
import { formatDate, timeAgo } from '../lib/format'

const STATUSES = ['new', 'contacted', 'closed']
const STATUS_STYLE = {
  new: 'border-accent/40 bg-accent/10 text-accentText',
  contacted: 'border-degraded/40 bg-degraded/10 text-degraded',
  closed: 'border-line bg-surface2 text-faint',
}

// Moderator-only window: Enterprise inquiries submitted from the landing form.
// RLS already restricts SELECT to moderators; the route is moderator-gated too.
export default function Inquiries() {
  const { t } = useT()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('enterprise_inquiries')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('enterprise_inquiries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enterprise_inquiries' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  async function setStatus(item, status) {
    if (item.status === status) return
    // Optimistic update, then persist.
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, status } : x)))
    const { error } = await supabase.from('enterprise_inquiries').update({ status }).eq('id', item.id)
    if (error) load()
  }

  async function remove(item) {
    if (!confirm(t('inquiries.confirmDelete', { email: item.email }))) return
    setItems((xs) => xs.filter((x) => x.id !== item.id))
    const { error } = await supabase.from('enterprise_inquiries').delete().eq('id', item.id)
    if (error) load()
  }

  const newCount = items.filter((x) => x.status === 'new').length

  return (
    <AppShell title={t('inquiries.title')}>
      <div className="mx-auto w-full max-w-4xl">
        <div className="a-in mb-7 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[1.45rem] font-semibold tracking-tight">{t('inquiries.heading')}</h1>
            <p className="mt-1 text-[12.5px] text-faint">{t('inquiries.sub')}</p>
          </div>
          {newCount > 0 && (
            <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accentText">
              {t('inquiries.countNew', { n: newCount })}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner className="h-7 w-7" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title={t('inquiries.empty')} hint={t('inquiries.emptyHint')} />
        ) : (
          <ul className="space-y-4">
            {items.map((it, i) => (
              <li key={it.id} className="a-in" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                <InquiryCard item={it} onStatus={setStatus} onRemove={remove} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}

function InquiryCard({ item, onStatus, onRemove }) {
  const { t } = useT()
  const statusLabel = {
    new: t('inquiries.statusNew'),
    contacted: t('inquiries.statusContacted'),
    closed: t('inquiries.statusClosed'),
  }
  return (
    <div className={`card p-5 ${item.status === 'new' ? 'border-accent/35 shadow-[0_18px_45px_-30px_rgba(52,199,127,0.5)]' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-ink">{item.company || t('inquiries.noCompany')}</div>
          {item.name && <div className="mt-0.5 truncate text-sm text-muted">{item.name}</div>}
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[item.status] || STATUS_STYLE.new}`}>
          {statusLabel[item.status] || item.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <a href={`mailto:${item.email}`} className="text-accentText hover:underline">
          {item.email}
        </a>
        {item.phone && (
          <a href={`tel:${item.phone}`} className="text-muted hover:text-ink">
            {item.phone}
          </a>
        )}
      </div>

      {item.message && (
        <p className="mt-3 whitespace-pre-wrap rounded-xl border border-line bg-surface2/70 px-3.5 py-3 text-sm leading-relaxed text-muted">
          {item.message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
        <span className="text-[11.5px] text-faint" title={formatDate(item.created_at)}>
          {t('inquiries.received')}: {timeAgo(item.created_at)}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onStatus(item, s)}
              className={`rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition-colors ${
                item.status === s
                  ? 'border-accent bg-accent text-[#06140d]'
                  : 'border-line text-muted hover:bg-surface2 hover:text-ink'
              }`}
            >
              {statusLabel[s]}
            </button>
          ))}
          <a href={`mailto:${item.email}`} className="text-[11.5px] font-medium text-accentText hover:underline">
            {t('inquiries.reply')}
          </a>
          <button onClick={() => onRemove(item)} className="text-[11.5px] font-medium text-faint transition-colors hover:text-down">
            {t('inquiries.remove')}
          </button>
        </div>
      </div>
    </div>
  )
}
