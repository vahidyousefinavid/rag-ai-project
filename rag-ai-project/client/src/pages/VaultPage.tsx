import { useState, useRef } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import useVault, { VaultEntry, VaultFormData } from '../hooks/useVault'

const CATEGORIES = ['email', 'social', 'work', 'finance', 'shopping', 'other'] as const

const CAT_COLOR: Record<string, string> = {
  email: '#60a5fa', social: '#c084fc', work: '#34d399',
  finance: '#fbbf24', shopping: '#f87171', other: '#94a3b8',
}

const CAT_ICON: Record<string, string> = {
  email: '📧', social: '💬', work: '💼',
  finance: '🏦', shopping: '🛒', other: '🔑',
}

function generatePassword(len = 18): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*-+'
  const arr = new Uint32Array(len)
  crypto.getRandomValues(arr)
  return Array.from(arr, n => chars[n % chars.length]).join('')
}

// ── Vault Row ────────────────────────────────────────────────────────────────

interface RowProps {
  entry: VaultEntry
  onEdit: (e: VaultEntry) => void
  onDelete: (id: string) => void
  onReveal: (id: string) => Promise<string>
}

function VaultRow({ entry, onEdit, onDelete, onReveal }: RowProps) {
  const { t } = useLanguage()
  const [password, setPassword]   = useState('••••••••••')
  const [revealed, setRevealed]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState<'user' | 'pass' | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = async (text: string, type: 'user' | 'pass') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 1500)
  }

  const toggleReveal = async () => {
    if (revealed) {
      setRevealed(false)
      setPassword('••••••••••')
      if (hideTimer.current) clearTimeout(hideTimer.current)
      return
    }
    setLoading(true)
    const pw = await onReveal(entry.id)
    setLoading(false)
    if (!pw) return
    setPassword(pw)
    setRevealed(true)
    hideTimer.current = setTimeout(() => {
      setRevealed(false)
      setPassword('••••••••••')
    }, 30_000)
  }

  const color = CAT_COLOR[entry.category] || '#94a3b8'

  return (
    <div
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12 }}
      className="px-4 py-3 flex gap-3 items-start"
    >
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
      }}>
        {entry.url ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(entry.url).hostname } catch { return 'x' } })()}&sz=32`}
            style={{ width: 22, height: 22, borderRadius: 4 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement!).textContent = CAT_ICON[entry.category] || '🔑' }}
          />
        ) : (
          <span>{CAT_ICON[entry.category] || '🔑'}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13 }} className="truncate">{entry.title}</span>
          <span style={{ background: color + '20', color, fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500, flexShrink: 0 }}>
            {entry.category}
          </span>
        </div>

        {/* Username */}
        {entry.username && (
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }} className="truncate flex-1">
              {entry.username}
            </span>
            <button onClick={() => copy(entry.username!, 'user')}
              style={{ color: copied === 'user' ? '#34d399' : 'var(--text-muted)', fontSize: 11, flexShrink: 0, cursor: 'pointer' }}
              className="hover:text-white transition-colors">
              {copied === 'user' ? '✓' : t.vaultCopy}
            </button>
          </div>
        )}

        {/* Password */}
        <div className="flex items-center gap-2">
          <span style={{
            color: 'var(--text-muted)', fontSize: 12,
            fontFamily: 'monospace', letterSpacing: revealed ? 0 : 3,
          }} className="truncate flex-1">
            {password}
          </span>
          <button onClick={toggleReveal}
            style={{ color: revealed ? '#fbbf24' : 'var(--text-muted)', fontSize: 14, flexShrink: 0, cursor: 'pointer' }}
            className="hover:opacity-80 transition-opacity">
            {loading ? '⟳' : revealed ? '🙈' : '👁'}
          </button>
          <button
            onClick={() => revealed && copy(password, 'pass')}
            disabled={!revealed}
            style={{
              color: copied === 'pass' ? '#34d399' : revealed ? 'var(--text-muted)' : 'var(--border)',
              fontSize: 11, flexShrink: 0, cursor: revealed ? 'pointer' : 'default',
            }}
            className="hover:text-white transition-colors">
            {copied === 'pass' ? '✓' : t.vaultCopy}
          </button>
        </div>

        {/* URL hint */}
        {entry.url && (
          <a href={entry.url} target="_blank" rel="noreferrer"
            style={{ color: 'var(--text-muted)', fontSize: 11 }}
            className="truncate block mt-0.5 hover:text-white transition-colors">
            {entry.url}
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button onClick={() => onEdit(entry)}
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
          className="hover:text-white hover:border-white/30 transition-colors">
          {t.vaultEdit}
        </button>
        <button onClick={() => onDelete(entry.id)}
          style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
          className="hover:bg-red-400/10 transition-colors">
          {t.vaultDelete}
        </button>
      </div>
    </div>
  )
}

// ── Add / Edit Modal ─────────────────────────────────────────────────────────

interface ModalProps {
  initial: VaultEntry | null
  onSave: (data: VaultFormData) => Promise<void>
  onClose: () => void
}

function VaultModal({ initial, onSave, onClose }: ModalProps) {
  const { t } = useLanguage()
  const [form, setForm] = useState({
    title:    initial?.title    || '',
    username: initial?.username || '',
    password: '',
    url:      initial?.url      || '',
    notes:    initial?.notes    || '',
    category: initial?.category || 'other',
  })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('عنوان الزامی است'); return }
    if (!initial && !form.password) { setErr('رمز عبور الزامی است'); return }
    setSaving(true)
    try { await onSave(form) } catch { setErr('خطا در ذخیره') } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', padding: '7px 10px',
    fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90vh', overflowY: 'auto' }}
        dir={t.dir}
      >
        <h2 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15, margin: 0 }}>
          {initial ? t.vaultEdit : `+ ${t.vaultAdd}`}
        </h2>

        {err && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{err}</p>}

        {/* Title */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.vaultSite} *</span>
          <input style={inp} value={form.title} onChange={set('title')} placeholder="Gmail, GitHub, Instagram…" />
        </label>

        {/* Username */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.vaultUsername}</span>
          <input style={inp} value={form.username} onChange={set('username')} placeholder="user@example.com" dir="ltr" />
        </label>

        {/* Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {t.vaultPassword}{initial ? <span style={{ opacity: 0.5 }}> (خالی = بدون تغییر)</span> : ' *'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={{ ...inp, flex: 1 }}
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="••••••••"
              dir="ltr"
            />
            <button onClick={() => setShowPw(s => !s)}
              style={{ ...inp, width: 'auto', padding: '7px 10px', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {showPw ? '🙈' : '👁'}
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}
              style={{ ...inp, width: 'auto', padding: '7px 10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
              {t.vaultGenerate}
            </button>
          </div>
          {form.password && (
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#34d399', wordBreak: 'break-all' }}
              dir="ltr">{form.password}</span>
          )}
        </div>

        {/* URL */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.vaultUrl}</span>
          <input style={inp} value={form.url} onChange={set('url')} placeholder="https://…" dir="ltr" />
        </label>

        {/* Category */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.vaultCategory}</span>
          <select style={{ ...inp, cursor: 'pointer' }} value={form.category} onChange={set('category')}>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
          </select>
        </label>

        {/* Notes */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.vaultNotes}</span>
          <textarea
            style={{ ...inp, resize: 'vertical', minHeight: 56 }}
            value={form.notes}
            onChange={set('notes')}
            placeholder="ایمیل بازیابی، سوال امنیتی، …"
          />
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button onClick={onClose}
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
            {t.vaultCancel}
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ background: 'var(--accent)', color: 'white', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? '…' : t.vaultSave}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const { t } = useLanguage()
  const { entries, loading, addEntry, updateEntry, deleteEntry, revealPassword } = useVault()
  const [modal, setModal]       = useState<{ open: boolean; entry: VaultEntry | null }>({ open: false, entry: null })
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const filtered = entries.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || e.title.toLowerCase().includes(q) || (e.username || '').toLowerCase().includes(q) || (e.url || '').toLowerCase().includes(q)
    const matchCat = catFilter === 'all' || e.category === catFilter
    return matchSearch && matchCat
  })

  const handleSave = async (data: VaultFormData) => {
    if (modal.entry) {
      await updateEntry(modal.entry.id, data)
    } else {
      await addEntry(data)
    }
    setModal({ open: false, entry: null })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('این رمز حذف شود؟')) return
    await deleteEntry(id)
  }

  return (
    <div className="flex flex-col h-full w-full min-w-0">

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        className="px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <span style={{ color: 'var(--text)' }} className="text-sm font-semibold flex-1">🔐 {t.vaultTitle}</span>
        <button
          onClick={() => setModal({ open: true, entry: null })}
          style={{ background: 'var(--accent)', color: 'white', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          + {t.vaultAdd}
        </button>
        <LanguageSwitcher />
      </div>

      {/* Search + Category filter */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '8px 16px' }}
        className="flex gap-2 items-center flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.vaultSearch}
          dir="auto"
          style={{
            flex: 1, minWidth: 120,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)', padding: '5px 10px', fontSize: 12, outline: 'none',
          }}
        />
        <div className="flex gap-1 flex-wrap" dir="ltr">
          {(['all', ...CATEGORIES] as const).map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                background: catFilter === c ? (c === 'all' ? 'var(--accent)' : CAT_COLOR[c]) : 'var(--surface-2)',
                color: catFilter === c ? 'white' : 'var(--text-muted)',
                border: `1px solid ${catFilter === c ? 'transparent' : 'var(--border)'}`,
              }}>
              {c === 'all' ? 'همه' : `${CAT_ICON[c]} ${c}`}
            </button>
          ))}
        </div>
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2" dir={t.dir}>
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="w-5 h-5 rounded-full border-2 border-zinc-600 border-t-purple-400 animate-spin" style={{ display: 'inline-block' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span style={{ fontSize: 44 }}>🔐</span>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.vaultEmpty}</p>
            {!search && (
              <button
                onClick={() => setModal({ open: true, entry: null })}
                style={{ background: 'var(--accent)', color: 'white', borderRadius: 10, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + {t.vaultAdd}
              </button>
            )}
          </div>
        ) : (
          filtered.map(e => (
            <VaultRow
              key={e.id}
              entry={e}
              onEdit={entry => setModal({ open: true, entry })}
              onDelete={handleDelete}
              onReveal={revealPassword}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <VaultModal
          initial={modal.entry}
          onSave={handleSave}
          onClose={() => setModal({ open: false, entry: null })}
        />
      )}
    </div>
  )
}
