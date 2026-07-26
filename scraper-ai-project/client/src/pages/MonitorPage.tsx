import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useMonitors } from '../hooks/useMonitors'
import MonitorWizardModal from '../components/MonitorWizardModal'
import type {
  MonitorTarget, MonitorRun, SchedulePreset, NotifyChannel, CrawlLevel,
  ExtractionField, DbSinkType, DbSinkMode, MonitorFormDto, DbSinkFormInput,
} from '../hooks/useMonitors'
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
  edit:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>,
  key:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5L18 10M12.5 10.5L15 13"/></svg>,
  database: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>,
  copy:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  plug:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 9V6a2 2 0 0 0-2-2h-3V1M6 4H3a2 2 0 0 0-2 2v3M4 13h16M9 17v3a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-3"/></svg>,
}

const STATUS_COLOR: Record<string, string> = {
  ready:    '#22c55e',
  checking: '#f59e0b',
  error:    '#ef4444',
  idle:     '#4b5563',
}

const SCHEDULE_PRESETS: SchedulePreset[] = ['hourly', 'every6h', 'daily', 'weekly', 'custom']
const NOTIFY_CHANNELS: NotifyChannel[] = ['email', 'telegram', 'webhook', 'sms']
const CRAWL_LEVELS: CrawlLevel[] = [1, 2, 3]

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
    fetchTargets, createTarget, adoptTarget, updateTarget, deleteTarget, checkNow, fetchRuns,
    generateApiKey, revokeApiKey, fetchDataPreview, testDbSink,
    ask, clearChat, selectTarget, newChat, selectChat, deleteChat,
  } = useMonitors()

  const [activeTarget, setActiveTarget] = useState<string | undefined>()
  const [modalMode,     setModalMode]   = useState<'create' | 'edit' | null>(null)
  const [wizardOpen,    setWizardOpen]  = useState(false)
  const [editTargetId,  setEditTargetId]= useState<string | null>(null)
  const [apiPanelId,    setApiPanelId]  = useState<string | null>(null)
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
  const editTargetObj = targets.find(s => s.id === editTargetId)
  const apiPanelTarget = targets.find(s => s.id === apiPanelId)

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
              <AddBtn label={t.monitorNew} onClick={() => setModalMode('create')} />
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
              ? <SidebarEmpty label={t.monitorNoTargets} addLabel={t.monitorAddFirst} onAdd={() => setModalMode('create')} />
              : targets.map(tg => (
                <TargetCard
                  key={tg.id}
                  target={tg}
                  active={activeTarget === tg.id}
                  checkNowLabel={t.monitorCheckNow}
                  deleteLabel={t.monitorDelete}
                  editLabel={t.monitorEdit}
                  apiLabel={t.monitorApiPanel}
                  checkingLabel={t.monitorChecking}
                  chunksLabel={t.monitorChunksLabel}
                  historyLabel={t.monitorHistory}
                  never={t.monitorNever}
                  dbSinkErrorLabel={t.monitorDbSinkErrorLabel}
                  extractionWarningLabel={t.monitorExtractionWarningLabel}
                  onSelect={() => setActiveTarget(tg.id)}
                  onCheckNow={() => checkNow(tg.id)}
                  onDelete={() => deleteTarget(tg.id)}
                  onHistory={() => setHistoryId(tg.id)}
                  onEdit={() => { setEditTargetId(tg.id); setModalMode('edit') }}
                  onApi={() => setApiPanelId(tg.id)}
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
                onAdd={() => setModalMode('create')}
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

        {modalMode && (
          <MonitorFormModal
            t={t}
            initial={modalMode === 'edit' ? editTargetObj : undefined}
            testDbSink={testDbSink}
            onClose={() => { setModalMode(null); setEditTargetId(null) }}
            onSubmit={async (dto) => {
              if (modalMode === 'edit' && editTargetId) await updateTarget(editTargetId, dto)
              else await createTarget(dto as MonitorFormDto)
              setModalMode(null)
              setEditTargetId(null)
            }}
            onSwitchToChat={modalMode === 'create' ? () => { setModalMode(null); setWizardOpen(true) } : undefined}
          />
        )}

        {wizardOpen && (
          <MonitorWizardModal
            onClose={() => setWizardOpen(false)}
            onCreated={(target) => { adoptTarget(target); setWizardOpen(false) }}
            onSwitchToForm={() => { setWizardOpen(false); setModalMode('create') }}
          />
        )}

        {apiPanelTarget && (
          <ApiDataModal
            t={t}
            target={apiPanelTarget}
            generateApiKey={generateApiKey}
            revokeApiKey={revokeApiKey}
            fetchDataPreview={fetchDataPreview}
            onClose={() => setApiPanelId(null)}
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
function TargetCard({
  target, active, checkNowLabel, deleteLabel, editLabel, apiLabel, checkingLabel, chunksLabel, historyLabel, never,
  dbSinkErrorLabel, extractionWarningLabel,
  onSelect, onCheckNow, onDelete, onHistory, onEdit, onApi,
}: {
  target: MonitorTarget; active: boolean;
  checkNowLabel: string; deleteLabel: string; editLabel: string; apiLabel: string;
  checkingLabel: string; chunksLabel: string; historyLabel: string; never: string;
  dbSinkErrorLabel: string; extractionWarningLabel: string;
  onSelect: () => void; onCheckNow: () => void; onDelete: () => void; onHistory: () => void;
  onEdit: () => void; onApi: () => void;
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
            <div title={target.lastError} style={{ fontSize: 10, color: '#fca5a5', marginTop: 3, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {target.lastError.slice(0, 120)}
            </div>
          )}
          {target.lastDbSinkError && (
            <div title={target.lastDbSinkError} style={{ fontSize: 10, color: '#fb923c', marginTop: 3, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {dbSinkErrorLabel} {target.lastDbSinkError.slice(0, 100)}
            </div>
          )}
          {target.lastExtractionWarning && (
            <div title={target.lastExtractionWarning} style={{ fontSize: 10, color: '#fbbf24', marginTop: 3, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {extractionWarningLabel} {target.lastExtractionWarning.slice(0, 100)}
            </div>
          )}
        </div>
      </div>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 4,
          marginTop: showActions ? 8 : 0,
          paddingTop: showActions ? 7 : 0,
          borderTop: showActions ? '1px solid var(--border)' : '1px solid transparent',
          maxHeight: showActions ? 72 : 0,
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
        <MiniBtn onClick={onEdit} color="#a78bfa" title={editLabel}>
          {Ic.edit}
        </MiniBtn>
        <MiniBtn onClick={onApi} color="#22c55e" title={apiLabel}>
          {Ic.key}
        </MiniBtn>
        <MiniBtn onClick={onDelete} color="#ef4444" title={deleteLabel}>
          {Ic.trash}
        </MiniBtn>
      </div>
    </div>
  )
}

function MiniBtn({ onClick, disabled, color, title, children }: {
  onClick: () => void; disabled?: boolean; color: string; title?: string; children: React.ReactNode
}) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
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

const DB_TYPES: DbSinkType[] = ['postgres', 'mysql', 'mongodb']
const DB_MODES: DbSinkMode[] = ['append', 'replace', 'upsert']
const DB_DEFAULT_PORT: Record<DbSinkType, number> = { postgres: 5432, mysql: 3306, mongodb: 27017 }

/* ══════════════════════════════════════════════════════════════════
   ADD / EDIT MONITOR MODAL
══════════════════════════════════════════════════════════════════ */
function MonitorFormModal({ t, initial, testDbSink, onClose, onSubmit, onSwitchToChat }: {
  t: import('../i18n').Translation
  initial?: MonitorTarget
  testDbSink: (cfg: DbSinkFormInput) => Promise<{ ok: boolean; error?: string }>
  onClose: () => void
  onSubmit: (dto: Partial<MonitorFormDto>) => Promise<void>
  /** Only offered when creating (not editing) — swaps this form for the conversational setup wizard. */
  onSwitchToChat?: () => void
}) {
  const isEdit = !!initial
  const [name,          setName]          = useState(initial?.name ?? '')
  const [url,            setUrl]          = useState(initial?.url ?? '')
  const [maxPages,       setMaxPages]     = useState(String(initial?.maxPages ?? 20))
  const [crawlLevel,     setCrawlLevel]   = useState<CrawlLevel>(initial?.crawlLevel ?? 2)
  const [schedulePreset, setPreset]       = useState<SchedulePreset>(initial?.schedulePreset ?? 'daily')
  const [scheduleCron,   setCron]         = useState(initial?.scheduleCron ?? '0 */6 * * *')
  const [whatToCheck,    setWhatToCheck]  = useState(initial?.whatToCheck ?? '')
  const [channels,       setChannels]     = useState<Set<NotifyChannel>>(new Set(initial?.notifyChannels ?? []))
  const [email,          setEmail]        = useState(initial?.notifyConfig.email ?? '')
  const [telegramChatId, setTelegramId]   = useState(initial?.notifyConfig.telegramChatId ?? '')
  const [webhookUrl,     setWebhookUrl]   = useState(initial?.notifyConfig.webhookUrl ?? '')
  const [smsPhone,       setSmsPhone]     = useState(initial?.notifyConfig.smsPhone ?? '')
  const [requiresLogin,  setRequiresLogin]= useState(!!initial?.loginUrl)
  const [loginUrl,       setLoginUrl]     = useState(initial?.loginUrl ?? '')
  const [loginUsername,  setLoginUsername]= useState(initial?.loginUsername ?? '')
  const [loginPassword,  setLoginPassword]= useState('')
  const [showAdvLogin,   setShowAdvLogin] = useState(false)
  const [userSelector,   setUserSelector] = useState(initial?.loginUsernameSelector ?? '')
  const [passSelector,   setPassSelector] = useState(initial?.loginPasswordSelector ?? '')
  const [submitSelector, setSubmitSelector]= useState(initial?.loginSubmitSelector ?? '')
  const [saving,         setSaving]       = useState(false)

  // ── Structured extraction ──────────────────────────────────────
  const [extractionEnabled, setExtractionEnabled] = useState(!!initial?.extractionSchema)
  const [itemSelector,      setItemSelector]      = useState(initial?.extractionSchema?.itemSelector ?? '')
  const [fields,            setFields]            = useState<ExtractionField[]>(
    initial?.extractionSchema?.fields?.length ? initial.extractionSchema.fields : [{ name: '', selector: '', attr: '' }],
  )
  function updateField(i: number, patch: Partial<ExtractionField>) {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f))
  }
  function addField() { setFields(prev => [...prev, { name: '', selector: '', attr: '' }]) }
  function removeField(i: number) { setFields(prev => prev.filter((_, idx) => idx !== i)) }

  // ── Smart crawl agent (LLM) ─────────────────────────────────────
  const [agentGoal, setAgentGoal] = useState(initial?.agentGoal ?? '')

  // ── DB sink ─────────────────────────────────────────────────────
  const [dbSinkEnabled, setDbSinkEnabled] = useState(!!initial?.dbSink?.enabled)
  const [dbType,        setDbType]        = useState<DbSinkType>(initial?.dbSink?.type ?? 'postgres')
  const [dbHost,        setDbHost]        = useState(initial?.dbSink?.host ?? '')
  const [dbPort,        setDbPort]        = useState(String(initial?.dbSink?.port ?? DB_DEFAULT_PORT.postgres))
  const [dbUser,        setDbUser]        = useState(initial?.dbSink?.user ?? '')
  const [dbPassword,    setDbPassword]    = useState('')
  const [dbDatabase,    setDbDatabase]    = useState(initial?.dbSink?.database ?? '')
  const [dbTable,       setDbTable]       = useState(initial?.dbSink?.table ?? '')
  const [dbMode,        setDbMode]        = useState<DbSinkMode>(initial?.dbSink?.mode ?? 'append')
  const [dbUpsertKey,   setDbUpsertKey]   = useState(initial?.dbSink?.upsertKey ?? '')
  const [dbTesting,     setDbTesting]     = useState(false)
  const [dbTestResult,  setDbTestResult]  = useState<{ ok: boolean; error?: string } | null>(null)

  function selectDbType(next: DbSinkType) {
    setDbType(next)
    setDbTestResult(null)
    // only auto-fill the port if it still matches a known default — don't clobber a custom one
    if (Object.values(DB_DEFAULT_PORT).includes(Number(dbPort))) setDbPort(String(DB_DEFAULT_PORT[next]))
  }

  async function handleTestDbSink() {
    setDbTesting(true)
    setDbTestResult(null)
    try {
      const result = await testDbSink({
        enabled: true, type: dbType, host: dbHost, port: Number(dbPort) || DB_DEFAULT_PORT[dbType],
        user: dbUser, password: dbPassword || undefined, database: dbDatabase, table: dbTable.trim(), mode: dbMode,
      })
      setDbTestResult(result)
    } finally {
      setDbTesting(false)
    }
  }

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
  const CRAWL_LEVEL_LABEL: Record<CrawlLevel, string> = {
    1: t.crawlLevel1, 2: t.crawlLevel2, 3: t.crawlLevel3,
  }
  const CRAWL_LEVEL_HINT: Record<CrawlLevel, string> = {
    1: t.crawlLevel1Hint, 2: t.crawlLevel2Hint, 3: t.crawlLevel3Hint,
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    setSaving(true)
    try {
      const cleanFields = fields
        .map(f => ({ name: f.name.trim(), selector: f.selector.trim(), attr: f.attr?.trim() || undefined }))
        .filter(f => f.name && f.selector)

      await onSubmit({
        name: name.trim(),
        url: url.trim(),
        maxPages: Number(maxPages) || 20,
        crawlLevel,
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
        extractionSchema: extractionEnabled && cleanFields.length > 0
          ? { itemSelector: itemSelector.trim() || undefined, fields: cleanFields }
          : null,
        agentGoal: agentGoal.trim() || null,
        dbSink: dbSinkEnabled && dbTable.trim()
          ? {
              enabled: true, type: dbType, host: dbHost, port: Number(dbPort) || DB_DEFAULT_PORT[dbType],
              user: dbUser, password: dbPassword || undefined, database: dbDatabase, table: dbTable.trim(),
              mode: dbMode, upsertKey: dbUpsertKey.trim() || undefined,
            }
          : (isEdit ? null : undefined),
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
            <span style={{ color: 'var(--accent)' }}>{isEdit ? Ic.edit : Ic.plus}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{isEdit ? t.monitorEditModalTitle : t.monitorAddModalTitle}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onSwitchToChat && (
              <button
                type="button"
                onClick={onSwitchToChat}
                style={{
                  background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.3)',
                  borderRadius: 8, padding: '5px 10px', fontSize: 11.5, fontWeight: 600,
                  color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                }}
              >✦ {t.monitorWizardTab}</button>
            )}
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
            <label style={lbl}>{t.monitorCrawlLevel}</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CRAWL_LEVELS.map(lv => (
                <button
                  key={lv} type="button"
                  onClick={() => setCrawlLevel(lv)}
                  style={{
                    flex: 1, minWidth: 100, padding: '7px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: `1.5px solid ${crawlLevel === lv ? '#7c3aed' : 'var(--border)'}`,
                    background: crawlLevel === lv ? 'rgba(124,58,237,.14)' : 'rgba(255,255,255,.03)',
                    color: crawlLevel === lv ? '#a78bfa' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  {CRAWL_LEVEL_LABEL[lv]}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
              {CRAWL_LEVEL_HINT[crawlLevel]}
            </div>
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
                    <input
                      style={inp} type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                      placeholder={isEdit && initial?.hasLoginPassword ? t.monitorDbPasswordPlaceholder : t.monitorLoginPasswordPlaceholder}
                      required={requiresLogin && !(isEdit && initial?.hasLoginPassword)}
                    />
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)', cursor: 'pointer', fontWeight: 500 }}>
              <input type="checkbox" checked={extractionEnabled} onChange={e => setExtractionEnabled(e.target.checked)} />
              {t.monitorExtraction}
            </label>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{t.monitorExtractionHint}</div>

            {extractionEnabled && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,.02)' }}>
                <div>
                  <label style={lbl}>{t.monitorItemSelector}</label>
                  <input style={{ ...inp, fontFamily: '"Fira Code",monospace' }} value={itemSelector} onChange={e => setItemSelector(e.target.value)} placeholder={t.monitorItemSelectorPlaceholder} />
                </div>
                <div>
                  <label style={lbl}>{t.monitorExtractionFields}</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fields.map((f, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr auto', gap: 6, alignItems: 'center' }}>
                        <input style={inp} value={f.name} onChange={e => updateField(i, { name: e.target.value })} placeholder={t.monitorFieldNamePlaceholder} />
                        <input style={{ ...inp, fontFamily: '"Fira Code",monospace' }} value={f.selector} onChange={e => updateField(i, { selector: e.target.value })} placeholder={t.monitorFieldSelectorPlaceholder} />
                        <input style={inp} value={f.attr ?? ''} onChange={e => updateField(i, { attr: e.target.value })} placeholder={t.monitorFieldAttrPlaceholder} />
                        <button
                          type="button" onClick={() => removeField(i)} disabled={fields.length === 1}
                          title={t.monitorRemoveField}
                          style={{
                            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 6,
                            width: 26, height: 26, color: '#ef4444', cursor: fields.length === 1 ? 'not-allowed' : 'pointer',
                            opacity: fields.length === 1 ? 0.35 : 1, flexShrink: 0,
                          }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button" onClick={addField}
                    style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {Ic.plus} {t.monitorAddField}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
              {t.monitorAgentGoal}
            </label>
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 64 }}
              value={agentGoal} onChange={e => setAgentGoal(e.target.value)}
              placeholder={t.monitorAgentGoalPlaceholder}
            />
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{t.monitorAgentGoalHint}</div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)', cursor: 'pointer', fontWeight: 500 }}>
              <input type="checkbox" checked={dbSinkEnabled} onChange={e => setDbSinkEnabled(e.target.checked)} />
              {t.monitorDbSink}
            </label>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{t.monitorDbSinkHint}</div>

            {dbSinkEnabled && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,.02)' }}>
                <div>
                  <label style={lbl}>{t.monitorDbType}</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DB_TYPES.map(dt => (
                      <button
                        key={dt} type="button" onClick={() => selectDbType(dt)}
                        style={{
                          padding: '7px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          border: `1.5px solid ${dbType === dt ? '#7c3aed' : 'var(--border)'}`,
                          background: dbType === dt ? 'rgba(124,58,237,.14)' : 'rgba(255,255,255,.03)',
                          color: dbType === dt ? '#a78bfa' : 'var(--text-muted)',
                          cursor: 'pointer', transition: 'all .15s',
                        }}
                      >
                        {dt}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>{t.monitorDbHost}</label>
                    <input style={inp} value={dbHost} onChange={e => setDbHost(e.target.value)} placeholder="localhost" />
                  </div>
                  <div>
                    <label style={lbl}>{t.monitorDbPort}</label>
                    <input style={inp} type="number" value={dbPort} onChange={e => setDbPort(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>{t.monitorDbUser}</label>
                    <input style={inp} value={dbUser} onChange={e => setDbUser(e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>{t.monitorDbPassword}</label>
                    <input
                      style={inp} type="password" value={dbPassword} onChange={e => setDbPassword(e.target.value)}
                      placeholder={isEdit && initial?.dbSink?.hasPassword ? t.monitorDbPasswordPlaceholder : ''}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>{t.monitorDbDatabase}</label>
                    <input style={inp} value={dbDatabase} onChange={e => setDbDatabase(e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>{dbType === 'mongodb' ? t.monitorDbCollection : t.monitorDbTable}</label>
                    <input style={inp} value={dbTable} onChange={e => setDbTable(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>{t.monitorDbMode}</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DB_MODES.map(m => (
                      <button
                        key={m} type="button" onClick={() => setDbMode(m)}
                        style={{
                          flex: 1, minWidth: 130, padding: '7px 11px', borderRadius: 8, fontSize: 10.5, fontWeight: 600,
                          border: `1.5px solid ${dbMode === m ? '#7c3aed' : 'var(--border)'}`,
                          background: dbMode === m ? 'rgba(124,58,237,.14)' : 'rgba(255,255,255,.03)',
                          color: dbMode === m ? '#a78bfa' : 'var(--text-muted)',
                          cursor: 'pointer', transition: 'all .15s',
                        }}
                      >
                        {m === 'append' ? t.dbModeAppend : m === 'replace' ? t.dbModeReplace : t.dbModeUpsert}
                      </button>
                    ))}
                  </div>
                </div>
                {dbMode === 'upsert' && (
                  <div>
                    <label style={lbl}>{t.monitorDbUpsertKey}</label>
                    <input style={inp} value={dbUpsertKey} onChange={e => setDbUpsertKey(e.target.value)} placeholder={t.monitorDbUpsertKeyPlaceholder} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button" onClick={handleTestDbSink} disabled={dbTesting || !dbHost || !dbTable.trim()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', borderRadius: 8,
                      padding: '7px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text)',
                      cursor: dbTesting || !dbHost || !dbTable.trim() ? 'not-allowed' : 'pointer',
                      opacity: dbTesting || !dbHost || !dbTable.trim() ? 0.5 : 1,
                    }}
                  >
                    {Ic.plug} {dbTesting ? t.monitorDbTesting : t.monitorDbTestConn}
                  </button>
                  {dbTestResult && (
                    <span style={{ fontSize: 11, color: dbTestResult.ok ? '#4ade80' : '#f87171' }}>
                      {dbTestResult.ok ? t.monitorDbTestOk : `${t.monitorDbTestFail}: ${dbTestResult.error ?? ''}`}
                    </span>
                  )}
                </div>
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
            {saving ? t.monitorSaving : isEdit ? t.monitorSaveChanges : t.monitorSave}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   API & DATA MODAL
══════════════════════════════════════════════════════════════════ */
function ApiDataModal({ t, target, generateApiKey, revokeApiKey, fetchDataPreview, onClose }: {
  t: import('../i18n').Translation
  target: MonitorTarget
  generateApiKey: (id: string) => Promise<string>
  revokeApiKey: (id: string) => Promise<void>
  fetchDataPreview: (id: string) => Promise<Record<string, any>[]>
  onClose: () => void
}) {
  const [newKey,   setNewKey]   = useState<string | null>(null)
  const [copied,   setCopied]   = useState(false)
  const [busy,     setBusy]     = useState(false)
  const [preview,  setPreview]  = useState<Record<string, any>[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchDataPreview(target.id).then(r => { if (!cancelled) setPreview(r) })
    return () => { cancelled = true }
  }, [target.id, fetchDataPreview])

  async function handleGenerate() {
    setBusy(true)
    try {
      const key = await generateApiKey(target.id)
      setNewKey(key)
      setCopied(false)
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke() {
    setBusy(true)
    try {
      await revokeApiKey(target.id)
      setNewKey(null)
    } finally {
      setBusy(false)
    }
  }

  function copyKey() {
    if (!newKey) return
    navigator.clipboard?.writeText(newKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const curlCmd = `curl "${origin}/monitors/${target.id}/data" -H "X-Api-Key: YOUR_API_KEY"`

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    border: '1px solid var(--border)', borderRadius: 8,
    padding: '7px 12px', fontSize: 11, fontWeight: 600,
    cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1,
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
          borderRadius: 18, width: 560, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,.72),0 0 0 1px rgba(124,58,237,.1)',
        }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ color: 'var(--accent)' }}>{Ic.key}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.monitorApiPanel} — {target.name}
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            {newKey ? (
              <div style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(34,197,94,.3)', background: 'rgba(34,197,94,.06)' }}>
                <div style={{ fontSize: 11, color: '#4ade80', marginBottom: 6 }}>{t.monitorApiKeyShown}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <code style={{
                    flex: 1, fontSize: 11, fontFamily: '"Fira Code",monospace', background: 'rgba(0,0,0,.25)',
                    borderRadius: 6, padding: '6px 10px', overflowX: 'auto', whiteSpace: 'nowrap', color: 'var(--text)',
                  }}>{newKey}</code>
                  <button type="button" onClick={copyKey} style={{ ...btnStyle, background: 'rgba(255,255,255,.05)' }}>
                    {Ic.copy} {copied ? t.monitorApiKeyCopied : t.monitorApiKeyCopy}
                  </button>
                </div>
              </div>
            ) : target.hasApiKey ? (
              <div style={{ fontSize: 12, color: 'var(--text)' }}>{t.monitorApiKeyActive(target.apiKeyPrefix ?? '')}</div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.monitorApiKeyNone}</div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" onClick={handleGenerate} disabled={busy} style={{ ...btnStyle, background: 'rgba(124,58,237,.12)', borderColor: 'rgba(124,58,237,.35)', color: '#a78bfa' }}>
                {Ic.key} {t.monitorApiKeyGenerate}
              </button>
              {target.hasApiKey && (
                <button type="button" onClick={handleRevoke} disabled={busy} style={{ ...btnStyle, background: 'rgba(239,68,68,.08)', borderColor: 'rgba(239,68,68,.25)', color: '#f87171' }}>
                  {Ic.trash} {t.monitorApiKeyRevoke}
                </button>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{t.monitorApiEndpointHint}</div>
            <code style={{
              display: 'block', fontSize: 10.5, fontFamily: '"Fira Code",monospace', background: 'rgba(0,0,0,.25)',
              borderRadius: 8, padding: '10px 12px', overflowX: 'auto', whiteSpace: 'pre', color: 'var(--text-muted)',
            }}>{curlCmd}</code>
          </div>

          {target.lastDbSinkError && (
            <div style={{ fontSize: 11, color: '#fb923c', lineHeight: 1.6, padding: 10, borderRadius: 8, background: 'rgba(251,146,60,.08)', border: '1px solid rgba(251,146,60,.25)' }}>
              {t.monitorDbSinkErrorLabel} {target.lastDbSinkError}
            </div>
          )}
          {target.lastExtractionWarning && (
            <div style={{ fontSize: 11, color: '#fbbf24', lineHeight: 1.6, padding: 10, borderRadius: 8, background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.25)' }}>
              {t.monitorExtractionWarningLabel} {target.lastExtractionWarning}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.monitorApiPreview}</span>
              {preview && preview.length > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.monitorApiRecordCount(preview.length)}</span>
              )}
            </div>
            {preview === null ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: 10 }}>{t.loading}</div>
            ) : preview.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: 10 }}>{t.monitorApiPreviewEmpty}</div>
            ) : (
              <pre style={{
                margin: 0, fontSize: 10.5, fontFamily: '"Fira Code",monospace', background: 'rgba(0,0,0,.25)',
                borderRadius: 8, padding: '10px 12px', maxHeight: 260, overflow: 'auto', color: 'var(--text)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {JSON.stringify(preview.slice(0, 20), null, 2)}
              </pre>
            )}
          </div>
        </div>
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
                  {run.dbSinkError && (
                    <div style={{ fontSize: 12, color: '#fb923c', lineHeight: 1.6, marginTop: run.error ? 4 : 0 }}>
                      {t.monitorDbSinkErrorLabel} {run.dbSinkError}
                    </div>
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
