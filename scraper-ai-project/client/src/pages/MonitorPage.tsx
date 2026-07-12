import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useMonitors } from '../hooks/useMonitors'
import type { MonitorTarget, MonitorRun, SchedulePreset, NotifyChannel } from '../hooks/useMonitors'
import { useLanguage } from '../i18n/LanguageContext'

const ANIM = `
  @keyframes mon-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.7)}}
  @keyframes mon-bounce{0%,80%,100%{transform:translateY(0);opacity:.45}40%{transform:translateY(-5px);opacity:1}}
`

const Ic = {
  globe:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  plus:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  refresh: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  send:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  check:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  xmark:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  clear:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>,
  brain:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
  chevron: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>,
  spark:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  clock:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
  history: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l4 2"/></svg>,
  bell:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  lock:    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
}

const STATUS_COLOR: Record<string, string> = {
  ready:    '#22c55e',
  checking: '#f59e0b',
  error:    '#ef4444',
  idle:     '#4b5563',
}

const SCHEDULE_PRESETS: SchedulePreset[] = ['hourly', 'every6h', 'daily', 'weekly', 'custom']
const NOTIFY_CHANNELS: NotifyChannel[] = ['email', 'telegram', 'webhook', 'sms']

function timeAgo(iso: string | null, never: string): string {
  if (!iso) return never
  const diffMs = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diffMs / 60000)
  if (m < 1) return '<1m'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function timeUntil(iso: string | null, never: string): string {
  if (!iso) return never
  const diffMs = new Date(iso).getTime() - Date.now()
  if (diffMs <= 0) return '<1m'
  const m = Math.floor(diffMs / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function hostOf(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

/* ══════════════════════════════════════════════════════════════════ */
export default function MonitorPage() {
  const { t } = useLanguage()
  const {
    targets, messages, loading, error, chatSessions, sessionId,
    fetchTargets, createTarget, deleteTarget, checkNow, fetchRuns,
    ask, clearChat, selectTarget, newChat, selectChat, deleteChat,
  } = useMonitors()

  const [activeTarget, setActiveTarget] = useState<string | undefined>()
  const [modal,         setModal]        = useState(false)
  const [historyId,     setHistoryId]    = useState<string | null>(null)
  const [input,         setInput]        = useState('')
  const [inputFocused,  setInputFocused] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchTargets() }, [fetchTargets])
  useEffect(() => { selectTarget(activeTarget) }, [activeTarget, selectTarget])
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    await ask(q, activeTarget)
  }

  const activeTargetObj = targets.find(s => s.id === activeTarget)
  const totalChunks = targets.reduce((a, s) => a + s.docCount, 0)
  const historyTarget = targets.find(s => s.id === historyId)

  return (
    <>
      <style>{ANIM}</style>
      <div style={{ display: 'flex', flex: 1, minWidth: 0, height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <aside style={{
          width: 270, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div style={{
            padding: '13px 13px 11px',
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(180deg,rgba(124,58,237,.07) 0%,transparent 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ color: 'var(--accent)', opacity: 0.9 }}>{Ic.brain}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.4,
                  color: 'var(--text)', fontFamily: '"Fira Code",monospace',
                }}>SCRAPER</span>
              </div>
              <AddBtn label={t.monitorNew} onClick={() => setModal(true)} />
            </div>
            <AllTargetsBtn
              label={t.monitorAllTargets}
              active={!activeTarget}
              count={targets.length}
              onClick={() => setActiveTarget(undefined)}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {targets.length === 0
              ? <SidebarEmpty label={t.monitorNoTargets} addLabel={t.monitorAddFirst} onAdd={() => setModal(true)} />
              : targets.map(tg => (
                <TargetCard
                  key={tg.id}
                  target={tg}
                  active={activeTarget === tg.id}
                  checkNowLabel={t.monitorCheckNow}
                  deleteLabel={t.monitorDelete}
                  checkingLabel={t.monitorChecking}
                  chunksLabel={t.monitorChunksLabel}
                  historyLabel={t.monitorHistory}
                  never={t.monitorNever}
                  onSelect={() => setActiveTarget(tg.id)}
                  onCheckNow={() => checkNow(tg.id)}
                  onDelete={() => deleteTarget(tg.id)}
                  onHistory={() => setHistoryId(tg.id)}
                />
              ))
            }
          </div>

          {targets.length > 0 && (
            <div style={{ padding: '9px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 14 }}>
              <StatPill label={t.monitorTargets} value={targets.length} />
              <StatPill label={t.monitorReady}   value={targets.filter(s => s.status === 'ready').length} color="#22c55e" />
              <StatPill label={t.monitorChunks}  value={totalChunks > 999 ? `${(totalChunks / 1000).toFixed(1)}k` : totalChunks} />
            </div>
          )}
        </aside>

        {/* ── CHAT AREA ───────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{
            padding: '10px 18px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{Ic.spark}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{t.monitorQuery}</span>
              <span style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }}>{Ic.chevron}</span>
              {activeTargetObj ? (
                <>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {activeTargetObj.name}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 6px', flexShrink: 0,
                    background: `${STATUS_COLOR[activeTargetObj.status]}18`,
                    color: STATUS_COLOR[activeTargetObj.status],
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    {activeTargetObj.status === 'checking' ? t.monitorChecking : activeTargetObj.status === 'ready' ? t.monitorReady : activeTargetObj.status}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{t.monitorAllTargets}</span>
              )}
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 7, padding: '4px 10px', fontSize: 11,
                  color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                {Ic.clear} {t.monitorClear}
              </button>
            )}
          </div>

          {chatSessions.length > 0 && (
            <ChatThreadsBar
              sessions={chatSessions}
              activeId={sessionId}
              newChatLabel={t.newChat}
              onSelect={id => selectChat(id, activeTarget)}
              onNew={() => newChat(activeTarget)}
              onDelete={id => deleteChat(id, activeTarget)}
            />
          )}

          <div style={{
            flex: 1, overflowY: 'auto', padding: '20px 24px',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {messages.length === 0 && !loading && (
              <EmptyChat
                targets={targets}
                onSelectTarget={setActiveTarget}
                onAdd={() => setModal(true)}
                noDataLabel={t.monitorNoData}
                readyLabel={t.monitorReadyToQuery}
                emptyHint={t.monitorEmptyHint}
                selectHint={t.monitorSelectHint}
                addLabel={t.monitorAddTarget}
              />
            )}
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} targets={targets} />
            ))}
            {loading && <TypingBubble />}
            {error && (
              <div style={{
                fontSize: 12, color: '#fca5a5',
                background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)',
                borderRadius: 10, padding: '9px 14px',
              }}>
                {error}
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          <form
            onSubmit={handleSend}
            style={{
              padding: '11px 18px 13px', borderTop: '1px solid var(--border)',
              background: 'var(--surface)', display: 'flex', gap: 8,
            }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={activeTargetObj ? t.monitorAskAbout(activeTargetObj.name) : t.monitorAskAll}
              disabled={loading}
              style={{
                flex: 1, background: 'var(--surface-2)',
                border: `1px solid ${inputFocused ? 'rgba(124,58,237,.6)' : 'var(--border)'}`,
                boxShadow: inputFocused ? '0 0 0 3px rgba(124,58,237,.12),0 0 16px rgba(124,58,237,.08)' : 'none',
                borderRadius: 12, padding: '10px 16px',
                color: 'var(--text)', fontSize: 13, outline: 'none',
                transition: 'border-color .15s,box-shadow .15s',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface-2)',
                color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${input.trim() && !loading ? 'rgba(124,58,237,.5)' : 'var(--border)'}`,
                boxShadow: input.trim() && !loading ? '0 0 16px rgba(124,58,237,.25)' : 'none',
                borderRadius: 12, padding: '10px 16px',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center',
                transition: 'all .15s',
              }}
            >
              {Ic.send}
            </button>
          </form>
        </div>

        {modal && (
          <AddMonitorModal
            t={t}
            onClose={() => setModal(false)}
            onCreate={async (dto) => {
              await createTarget(dto)
              setModal(false)
            }}
          />
        )}

        {historyTarget && (
          <HistoryModal
            t={t}
            target={historyTarget}
            fetchRuns={fetchRuns}
            onClose={() => setHistoryId(null)}
          />
        )}
      </div>
    </>
  )
}

/* ── Atoms ──────────────────────────────────────────────────────── */
function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: h ? '#6d28d9' : 'var(--accent)', color: '#fff',
        border: 'none', borderRadius: 7,
        padding: '5px 9px', fontSize: 11, fontWeight: 600,
        cursor: 'pointer', transition: 'background .15s',
      }}
    >
      {Ic.plus} {label}
    </button>
  )
}

function AllTargetsBtn({ label, active, count, onClick }: { label: string; active: boolean; count: number; onClick: () => void }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
        display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', textAlign: 'left',
        background: active ? 'rgba(124,58,237,.13)' : h ? 'rgba(255,255,255,.03)' : 'transparent',
        border: `1px solid ${active ? 'rgba(124,58,237,.4)' : 'var(--border)'}`,
        color: active ? '#a78bfa' : 'var(--text-muted)',
        boxShadow: active ? '0 0 14px rgba(124,58,237,.1)' : 'none',
        transition: 'all .15s',
      }}
    >
      {Ic.globe}
      <span>{label}</span>
      <span style={{
        marginLeft: 'auto', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 6px',
        background: active ? 'rgba(124,58,237,.3)' : 'rgba(255,255,255,.07)',
        color: active ? '#c4b5fd' : 'var(--text-muted)',
      }}>{count}</span>
    </button>
  )
}

function StatPill({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color ?? 'var(--text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

/* ── Sidebar empty ──────────────────────────────────────────────── */
function SidebarEmpty({ label, addLabel, onAdd }: { label: string; addLabel: string; onAdd: () => void }) {
  return (
    <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
        style={{ margin: '0 auto 10px', display: 'block', opacity: 0.25 }}>
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      <div style={{ fontSize: 12, marginBottom: 8 }}>{label}</div>
      <button
        onClick={onAdd}
        style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
      >
        {addLabel}
      </button>
    </div>
  )
}

/* ── Target card ────────────────────────────────────────────────── */
function TargetCard({ target, active, checkNowLabel, deleteLabel, checkingLabel, chunksLabel, historyLabel, never, onSelect, onCheckNow, onDelete, onHistory }: {
  target: MonitorTarget; active: boolean;
  checkNowLabel: string; deleteLabel: string; checkingLabel: string; chunksLabel: string; historyLabel: string; never: string;
  onSelect: () => void; onCheckNow: () => void; onDelete: () => void; onHistory: () => void;
}) {
  const [hovered, setHovered] = useState(false)
  const showActions = hovered || active

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10, padding: '9px 10px 8px', marginBottom: 4,
        background: active ? 'rgba(124,58,237,.1)' : hovered ? 'rgba(255,255,255,.035)' : 'transparent',
        border: `1px solid ${active ? 'rgba(124,58,237,.38)' : hovered ? 'rgba(255,255,255,.1)' : 'var(--border)'}`,
        borderLeft: `3px solid ${active ? '#7c3aed' : '#a78bfa'}`,
        cursor: 'pointer', transition: 'background .12s,border-color .12s',
        boxShadow: active ? '0 0 0 1px rgba(124,58,237,.15),inset 0 0 16px rgba(124,58,237,.04)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
        <span style={{ color: '#a78bfa', marginTop: 1, flexShrink: 0 }}>{Ic.globe}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{target.name}</span>
            {target.loginUrl && <span style={{ color: 'var(--text-muted)', flexShrink: 0 }} title="requires login">{Ic.lock}</span>}
          </div>
          <div style={{
            fontSize: 10, color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5,
          }}>
            {hostOf(target.url)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
              background: STATUS_COLOR[target.status],
              animation: target.status === 'checking' ? 'mon-pulse 1.4s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: STATUS_COLOR[target.status] }}>
              {target.status === 'checking' ? checkingLabel : target.status}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }} title={`next check in ${timeUntil(target.nextRunAt, never)}`}>
              {Ic.clock} {timeAgo(target.lastCheckedAt, never)}
            </span>
          </div>
          {target.docCount > 0 && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
              {target.docCount.toLocaleString()} {chunksLabel}
            </div>
          )}
          {target.lastError && (
            <div style={{ fontSize: 10, color: '#fca5a5', marginTop: 3, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {target.lastError.slice(0, 80)}
            </div>
          )}
        </div>
      </div>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex', gap: 4,
          marginTop: showActions ? 8 : 0,
          paddingTop: showActions ? 7 : 0,
          borderTop: showActions ? '1px solid var(--border)' : '1px solid transparent',
          maxHeight: showActions ? 36 : 0,
          overflow: 'hidden',
          opacity: showActions ? 1 : 0,
          transition: 'max-height .15s,opacity .15s,padding .15s,margin .15s',
        }}
      >
        <MiniBtn onClick={onCheckNow} disabled={target.status === 'checking'} color="#7c3aed">
          {Ic.refresh} {checkNowLabel}
        </MiniBtn>
        <MiniBtn onClick={onHistory} color="#4f93ce">
          {Ic.history} {historyLabel}
        </MiniBtn>
        <MiniBtn onClick={onDelete} color="#ef4444">
          {Ic.trash} {deleteLabel}
        </MiniBtn>
      </div>
    </div>
  )
}

function MiniBtn({ onClick, disabled, color, children }: {
  onClick: () => void; disabled?: boolean; color: string; children: React.ReactNode
}) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: h && !disabled ? `${color}20` : `${color}0d`,
        border: `1px solid ${color}30`,
        color, borderRadius: 5, padding: '3px 8px',
        fontSize: 10, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background .12s',
      }}
    >
      {children}
    </button>
  )
}

/* ── Saved chat threads bar ────────────────────────────────────── */
function ChatThreadsBar({ sessions, activeId, newChatLabel, onSelect, onNew, onDelete }: {
  sessions: { id: string; title: string | null }[]; activeId: string | null; newChatLabel: string
  onSelect: (id: string) => void; onNew: () => void; onDelete: (id: string) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
      borderBottom: '1px solid var(--border)', background: 'var(--surface)',
      overflowX: 'auto',
    }}>
      <button
        onClick={onNew}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.35)',
          color: '#a78bfa', borderRadius: 20, padding: '4px 10px',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {Ic.plus} {newChatLabel}
      </button>
      {sessions.map(s => (
        <ThreadPill key={s.id} session={s} active={s.id === activeId} onSelect={() => onSelect(s.id)} onDelete={() => onDelete(s.id)} />
      ))}
    </div>
  )
}

function ThreadPill({ session, active, onSelect, onDelete }: {
  session: { id: string; title: string | null }; active: boolean; onSelect: () => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        borderRadius: 20, padding: '4px 6px 4px 12px', cursor: 'pointer',
        fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
        background: active ? 'rgba(124,58,237,.13)' : hovered ? 'rgba(255,255,255,.04)' : 'transparent',
        border: `1px solid ${active ? 'rgba(124,58,237,.4)' : 'var(--border)'}`,
        color: active ? '#c4b5fd' : 'var(--text-muted)',
        transition: 'background .12s,border-color .12s',
      }}
    >
      <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.title || '…'}</span>
      <span
        onClick={e => { e.stopPropagation(); onDelete() }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%',
          opacity: hovered || active ? 1 : 0, flexShrink: 0,
        }}
      >
        {Ic.xmark}
      </span>
    </div>
  )
}

/* ── Chat bubble ────────────────────────────────────────────────── */
function ChatBubble({ msg, targets }: {
  msg: { role: string; content: string; sources?: string[]; sourceId?: string }
  targets: MonitorTarget[]
}) {
  const isUser = msg.role === 'user'
  const tgObj = msg.sourceId ? targets.find(t => t.id === msg.sourceId) : undefined

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 10 }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          background: 'rgba(124,58,237,.14)', border: '1px solid rgba(124,58,237,.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa',
        }}>
          {Ic.spark}
        </div>
      )}
      <div style={{ maxWidth: '72%' }}>
        {!isUser && tgObj && (
          <div style={{
            fontSize: 10, color: '#a78bfa',
            marginBottom: 5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {Ic.globe} {tgObj.name}
          </div>
        )}
        <div style={{
          background: isUser ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'var(--surface-2)',
          color: 'var(--text)',
          borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
          padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          border: isUser ? 'none' : '1px solid var(--border)',
          boxShadow: isUser ? '0 2px 14px rgba(124,58,237,.22)' : 'none',
        }}>
          {msg.content}
        </div>
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {msg.sources.slice(0, 3).map((s, i) => (
              <span key={i} style={{
                fontSize: 10, color: 'var(--text-muted)',
                background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
                borderRadius: 5, padding: '2px 8px',
                maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {s.slice(0, 70)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Typing indicator ───────────────────────────────────────────── */
function TypingBubble() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(124,58,237,.14)', border: '1px solid rgba(124,58,237,.28)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa',
      }}>
        {Ic.spark}
      </div>
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: '4px 14px 14px 14px', padding: '13px 16px',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)',
            animation: `mon-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

/* ── Empty chat ─────────────────────────────────────────────────── */
function EmptyChat({ targets, onSelectTarget, onAdd, noDataLabel, readyLabel, emptyHint, selectHint, addLabel }: {
  targets: MonitorTarget[]; onSelectTarget: (id?: string) => void; onAdd: () => void
  noDataLabel: string; readyLabel: string; emptyHint: string; selectHint: string; addLabel: string
}) {
  const readyTargets = targets.filter(s => s.status === 'ready')
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20, color: 'var(--text-muted)', paddingBottom: 60,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(124,58,237,.55)',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 7 }}>
          {targets.length === 0 ? noDataLabel : readyLabel}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.65, maxWidth: 320 }}>
          {targets.length === 0 ? emptyHint : selectHint}
        </div>
      </div>
      {targets.length === 0 ? (
        <button
          onClick={onAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 10,
            padding: '9px 18px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {Ic.plus} {addLabel}
        </button>
      ) : readyTargets.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 380 }}>
          {readyTargets.map(s => (
            <button key={s.id} onClick={() => onSelectTarget(s.id)} style={{
              background: 'var(--surface)',
              border: '1px solid rgba(167,139,250,.38)',
              borderRadius: 9, padding: '6px 14px', fontSize: 12, fontWeight: 500,
              color: '#a78bfa', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'border-color .15s',
            }}>
              {Ic.globe} {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   ADD MONITOR MODAL
══════════════════════════════════════════════════════════════════ */
function AddMonitorModal({ t, onClose, onCreate }: {
  t: import('../i18n').Translation
  onClose: () => void
  onCreate: (dto: {
    name: string; url: string; maxPages: number
    schedulePreset: SchedulePreset; scheduleCron?: string
    whatToCheck?: string; notifyChannels: NotifyChannel[]
    notifyConfig: { email?: string; telegramChatId?: string; webhookUrl?: string; smsPhone?: string }
    loginUrl?: string; loginUsername?: string; loginPassword?: string
    loginUsernameSelector?: string; loginPasswordSelector?: string; loginSubmitSelector?: string
  }) => Promise<void>
}) {
  const [name,          setName]          = useState('')
  const [url,            setUrl]          = useState('')
  const [maxPages,       setMaxPages]     = useState('20')
  const [schedulePreset, setPreset]       = useState<SchedulePreset>('daily')
  const [scheduleCron,   setCron]         = useState('0 */6 * * *')
  const [whatToCheck,    setWhatToCheck]  = useState('')
  const [channels,       setChannels]     = useState<Set<NotifyChannel>>(new Set())
  const [email,          setEmail]        = useState('')
  const [telegramChatId, setTelegramId]   = useState('')
  const [webhookUrl,     setWebhookUrl]   = useState('')
  const [smsPhone,       setSmsPhone]     = useState('')
  const [requiresLogin,  setRequiresLogin]= useState(false)
  const [loginUrl,       setLoginUrl]     = useState('')
  const [loginUsername,  setLoginUsername]= useState('')
  const [loginPassword,  setLoginPassword]= useState('')
  const [showAdvLogin,   setShowAdvLogin] = useState(false)
  const [userSelector,   setUserSelector] = useState('')
  const [passSelector,   setPassSelector] = useState('')
  const [submitSelector, setSubmitSelector]= useState('')
  const [saving,         setSaving]       = useState(false)

  function toggleChannel(c: NotifyChannel) {
    setChannels(prev => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c); else next.add(c)
      return next
    })
  }

  const SCHEDULE_LABEL: Record<SchedulePreset, string> = {
    hourly: t.scheduleHourly, every6h: t.scheduleEvery6h, daily: t.scheduleDaily,
    weekly: t.scheduleWeekly, custom: t.scheduleCustom,
  }
  const CHANNEL_LABEL: Record<NotifyChannel, string> = {
    email: t.channelEmail, telegram: t.channelTelegram, webhook: t.channelWebhook, sms: t.channelSms,
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    setSaving(true)
    try {
      await onCreate({
        name: name.trim(),
        url: url.trim(),
        maxPages: Number(maxPages) || 20,
        schedulePreset,
        scheduleCron: schedulePreset === 'custom' ? scheduleCron : undefined,
        whatToCheck: whatToCheck.trim() || undefined,
        notifyChannels: [...channels],
        notifyConfig: { email: email || undefined, telegramChatId: telegramChatId || undefined, webhookUrl: webhookUrl || undefined, smsPhone: smsPhone || undefined },
        loginUrl: requiresLogin ? loginUrl || undefined : undefined,
        loginUsername: requiresLogin ? loginUsername || undefined : undefined,
        loginPassword: requiresLogin ? loginPassword || undefined : undefined,
        loginUsernameSelector: requiresLogin ? userSelector || undefined : undefined,
        loginPasswordSelector: requiresLogin ? passSelector || undefined : undefined,
        loginSubmitSelector: requiresLogin ? submitSelector || undefined : undefined,
      })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,.04)',
    border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 11px', color: 'var(--text)', fontSize: 12,
    outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-muted)', marginBottom: 4,
    display: 'block', fontWeight: 500, letterSpacing: 0.2,
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.78)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 18, width: 540, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,.72),0 0 0 1px rgba(124,58,237,.1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(180deg,rgba(124,58,237,.07) 0%,transparent 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)' }}>{Ic.plus}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t.monitorAddModalTitle}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)',
              borderRadius: 8, width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
            }}
          >✕</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 10 }}>
            <div>
              <label style={lbl}>{t.monitorName}</label>
              <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder={t.monitorNamePlaceholder} required />
            </div>
            <div>
              <label style={lbl}>{t.monitorMaxPages}</label>
              <input style={inp} type="number" min={1} max={200} value={maxPages} onChange={e => setMaxPages(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={lbl}>{t.monitorUrl}</label>
            <input style={inp} type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder={t.monitorUrlPlaceholder} required />
          </div>

          <div>
            <label style={lbl}>{t.monitorSchedule}</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SCHEDULE_PRESETS.map(p => (
                <button
                  key={p} type="button"
                  onClick={() => setPreset(p)}
                  style={{
                    padding: '7px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: `1.5px solid ${schedulePreset === p ? '#7c3aed' : 'var(--border)'}`,
                    background: schedulePreset === p ? 'rgba(124,58,237,.14)' : 'rgba(255,255,255,.03)',
                    color: schedulePreset === p ? '#a78bfa' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  {SCHEDULE_LABEL[p]}
                </button>
              ))}
            </div>
            {schedulePreset === 'custom' && (
              <input
                style={{ ...inp, marginTop: 8, fontFamily: '"Fira Code",monospace' }}
                value={scheduleCron} onChange={e => setCron(e.target.value)}
                placeholder={t.monitorCronPlaceholder}
              />
            )}
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)', cursor: 'pointer', fontWeight: 500 }}>
              <input type="checkbox" checked={requiresLogin} onChange={e => setRequiresLogin(e.target.checked)} />
              {t.monitorRequiresLogin}
            </label>

            {requiresLogin && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,.02)' }}>
                <div style={{ fontSize: 10.5, color: '#fbbf24', lineHeight: 1.5 }}>{t.monitorLoginWarning}</div>
                <div>
                  <label style={lbl}>{t.monitorLoginUrl}</label>
                  <input style={inp} type="url" value={loginUrl} onChange={e => setLoginUrl(e.target.value)} placeholder={t.monitorLoginUrlPlaceholder} required={requiresLogin} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>{t.monitorLoginUsername}</label>
                    <input style={inp} value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder={t.monitorLoginUsernamePlaceholder} required={requiresLogin} />
                  </div>
                  <div>
                    <label style={lbl}>{t.monitorLoginPassword}</label>
                    <input style={inp} type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder={t.monitorLoginPasswordPlaceholder} required={requiresLogin} />
                  </div>
                </div>
                <button
                  type="button" onClick={() => setShowAdvLogin(v => !v)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {Ic.chevron} {t.monitorLoginAdvanced}
                </button>
                {showAdvLogin && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <label style={lbl}>{t.monitorLoginUsernameSelector}</label>
                      <input style={{ ...inp, fontFamily: '"Fira Code",monospace' }} value={userSelector} onChange={e => setUserSelector(e.target.value)} placeholder={t.monitorLoginSelectorPlaceholder} />
                    </div>
                    <div>
                      <label style={lbl}>{t.monitorLoginPasswordSelector}</label>
                      <input style={{ ...inp, fontFamily: '"Fira Code",monospace' }} value={passSelector} onChange={e => setPassSelector(e.target.value)} placeholder={t.monitorLoginSelectorPlaceholder} />
                    </div>
                    <div>
                      <label style={lbl}>{t.monitorLoginSubmitSelector}</label>
                      <input style={{ ...inp, fontFamily: '"Fira Code",monospace' }} value={submitSelector} onChange={e => setSubmitSelector(e.target.value)} placeholder={t.monitorLoginSelectorPlaceholder} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label style={lbl}>{t.monitorWhatToCheck}</label>
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 56 }}
              value={whatToCheck} onChange={e => setWhatToCheck(e.target.value)}
              placeholder={t.monitorWhatToCheckPlaceholder}
            />
          </div>

          <div>
            <label style={lbl}>{t.monitorNotifyChannels}</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {NOTIFY_CHANNELS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => toggleChannel(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: `1.5px solid ${channels.has(c) ? '#7c3aed' : 'var(--border)'}`,
                    background: channels.has(c) ? 'rgba(124,58,237,.14)' : 'rgba(255,255,255,.03)',
                    color: channels.has(c) ? '#a78bfa' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  {Ic.bell} {CHANNEL_LABEL[c]}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {channels.has('email') && (
                <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.monitorEmailPlaceholder} />
              )}
              {channels.has('telegram') && (
                <input style={inp} value={telegramChatId} onChange={e => setTelegramId(e.target.value)} placeholder={t.monitorTelegramChatIdPlaceholder} />
              )}
              {channels.has('webhook') && (
                <input style={inp} type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder={t.monitorWebhookUrlPlaceholder} />
              )}
              {channels.has('sms') && (
                <input style={inp} value={smsPhone} onChange={e => setSmsPhone(e.target.value)} placeholder={t.monitorSmsPhonePlaceholder} />
              )}
            </div>
          </div>

          <button
            type="submit" disabled={saving || !name.trim() || !url.trim()}
            style={{
              padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: saving || !name.trim() || !url.trim() ? 'rgba(255,255,255,.06)' : 'var(--accent)',
              color: saving || !name.trim() || !url.trim() ? 'var(--text-muted)' : '#fff',
              border: 'none',
              cursor: saving || !name.trim() || !url.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? t.monitorSaving : t.monitorSave}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   HISTORY MODAL
══════════════════════════════════════════════════════════════════ */
function HistoryModal({ t, target, fetchRuns, onClose }: {
  t: import('../i18n').Translation
  target: MonitorTarget
  fetchRuns: (id: string) => Promise<MonitorRun[]>
  onClose: () => void
}) {
  const [runs, setRuns] = useState<MonitorRun[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchRuns(target.id).then(r => { if (!cancelled) setRuns(r) })
    return () => { cancelled = true }
  }, [target.id, fetchRuns])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.78)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 18, width: 520, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,.72),0 0 0 1px rgba(124,58,237,.1)',
        }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ color: 'var(--accent)' }}>{Ic.history}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.monitorHistory} — {target.name}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)',
              borderRadius: 8, width: 28, height: 28, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
            }}
          >✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {runs === null ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>{t.loading}</div>
          ) : runs.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>{t.monitorHistoryEmpty}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {runs.map(run => (
                <div key={run.id} style={{
                  border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px',
                  borderLeft: `3px solid ${run.error ? '#ef4444' : run.changed ? '#f59e0b' : '#22c55e'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: run.summary || run.error ? 6 : 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(run.ranAt).toLocaleString()}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 6px',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                      color: run.error ? '#ef4444' : run.changed ? '#f59e0b' : '#22c55e',
                      background: run.error ? 'rgba(239,68,68,.1)' : run.changed ? 'rgba(245,158,11,.1)' : 'rgba(34,197,94,.1)',
                    }}>
                      {run.error ? t.monitorFailedLabel : run.changed ? t.monitorChangedLabel : t.monitorNoChangeLabel}
                    </span>
                  </div>
                  {run.summary && (
                    <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{run.summary}</div>
                  )}
                  {run.error && (
                    <div style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.6 }}>{run.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
