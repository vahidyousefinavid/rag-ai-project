import { useState, useEffect, useRef, FormEvent, DragEvent } from 'react'
import { useRag } from '../hooks/useRag'
import type { RagSource, SourceType, RagChatSession } from '../hooks/useRag'
import { useLanguage } from '../i18n/LanguageContext'

const ANIM = `
  @keyframes rag-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.7)}}
  @keyframes rag-bounce{0%,80%,100%{transform:translateY(0);opacity:.45}40%{transform:translateY(-5px);opacity:1}}
`

const Ic = {
  db:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
  file:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  plus:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  refresh: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  send:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  check:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  xmark:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  upload:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  clear:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>,
  brain:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
  chevron: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>,
  globe:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  spark:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
}

const TYPE_META: Record<SourceType, { label: string; color: string; icon: JSX.Element }> = {
  postgres: { label: 'PostgreSQL', color: '#4f93ce', icon: Ic.db },
  mysql:    { label: 'MySQL',      color: '#f29111', icon: Ic.db },
  mongodb:  { label: 'MongoDB',    color: '#47a248', icon: Ic.db },
  file:     { label: 'File',       color: '#a78bfa', icon: Ic.file },
}

const STATUS_COLOR: Record<string, string> = {
  ready:    '#22c55e',
  indexing: '#f59e0b',
  error:    '#ef4444',
  idle:     '#4b5563',
}

/* ══════════════════════════════════════════════════════════════════ */
export default function RagPage() {
  const { t } = useLanguage()
  const {
    sources, messages, loading, error, chatSessions, sessionId,
    fetchSources, createSource, deleteSource, ingestSource,
    uploadFile, testConnection, ask, clearChat,
    selectSource, newChat, selectChat, deleteChat,
  } = useRag()

  const [activeSource,  setActiveSource]  = useState<string | undefined>()
  const [modal,         setModal]         = useState(false)
  const [input,         setInput]         = useState('')
  const [inputFocused,  setInputFocused]  = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchSources() }, [fetchSources])
  useEffect(() => { selectSource(activeSource) }, [activeSource, selectSource])
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    await ask(q, activeSource)
  }

  const activeSourceObj = sources.find(s => s.id === activeSource)
  const totalChunks = sources.reduce((a, s) => a + s.docCount, 0)

  return (
    <>
      <style>{ANIM}</style>
      <div style={{ display: 'flex', flex: 1, minWidth: 0, height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <aside style={{
          width: 260, flexShrink: 0,
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
                }}>RAG ENGINE</span>
              </div>
              <AddBtn label={t.ragNew} onClick={() => setModal(true)} />
            </div>
            <AllSourcesBtn
              label={t.ragAllSources}
              active={!activeSource}
              count={sources.length}
              onClick={() => setActiveSource(undefined)}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {sources.length === 0
              ? <SidebarEmpty label={t.ragNoSources} addLabel={t.ragAddFirst} onAdd={() => setModal(true)} />
              : sources.map(src => (
                <SourceCard
                  key={src.id}
                  source={src}
                  active={activeSource === src.id}
                  syncLabel={t.ragSync}
                  continueLabel={t.ragContinue}
                  deleteLabel={t.ragDelete}
                  indexingLabel={t.ragIndexing}
                  chunksLabel={t.ragChunksLabel}
                  onSelect={() => setActiveSource(src.id)}
                  onIngest={() => ingestSource(src.id)}
                  onDelete={() => deleteSource(src.id)}
                />
              ))
            }
          </div>

          {sources.length > 0 && (
            <div style={{ padding: '9px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 14 }}>
              <StatPill label={t.ragSources} value={sources.length} />
              <StatPill label={t.ragReady}   value={sources.filter(s => s.status === 'ready').length} color="#22c55e" />
              <StatPill label={t.ragChunks}  value={totalChunks > 999 ? `${(totalChunks / 1000).toFixed(1)}k` : totalChunks} />
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
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{t.ragQuery}</span>
              <span style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }}>{Ic.chevron}</span>
              {activeSourceObj ? (
                <>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: TYPE_META[activeSourceObj.sourceType].color,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {activeSourceObj.name}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 6px', flexShrink: 0,
                    background: `${STATUS_COLOR[activeSourceObj.status]}18`,
                    color: STATUS_COLOR[activeSourceObj.status],
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    {activeSourceObj.status}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{t.ragAllSources}</span>
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
                {Ic.clear} {t.ragClear}
              </button>
            )}
          </div>

          {chatSessions.length > 0 && (
            <ChatThreadsBar
              sessions={chatSessions}
              activeId={sessionId}
              newChatLabel={t.newChat}
              onSelect={id => selectChat(id, activeSource)}
              onNew={() => newChat(activeSource)}
              onDelete={id => deleteChat(id, activeSource)}
            />
          )}

          <div style={{
            flex: 1, overflowY: 'auto', padding: '20px 24px',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {messages.length === 0 && !loading && (
              <EmptyChat
                sources={sources}
                onSelectSource={setActiveSource}
                onAdd={() => setModal(true)}
                noDataLabel={t.ragNoDataSources}
                readyLabel={t.ragReadyToQuery}
                emptyHint={t.ragEmptyHint}
                selectHint={t.ragSelectHint}
                addLabel={t.ragAddSource}
              />
            )}
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} sources={sources} />
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
              placeholder={activeSourceObj ? t.ragAskAbout(activeSourceObj.name) : t.ragAskAll}
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
          <AddSourceModal
            t={t}
            onClose={() => setModal(false)}
            onCreateDb={async (name, type, config) => {
              const src = await createSource(name, type, config)
              setModal(false)
              return src
            }}
            onIngest={ingestSource}
            onUploadFile={uploadFile}
            onTest={testConnection}
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

function AllSourcesBtn({ label, active, count, onClick }: { label: string; active: boolean; count: number; onClick: () => void }) {
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
        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
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

/* ── Source card ────────────────────────────────────────────────── */
function SourceCard({ source, active, syncLabel, continueLabel, deleteLabel, indexingLabel, chunksLabel, onSelect, onIngest, onDelete }: {
  source: RagSource; active: boolean;
  syncLabel: string; continueLabel: string; deleteLabel: string; indexingLabel: string; chunksLabel: string;
  onSelect: () => void; onIngest: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false)
  const meta = TYPE_META[source.sourceType]
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
        borderLeft: `3px solid ${active ? '#7c3aed' : meta.color}`,
        cursor: 'pointer', transition: 'background .12s,border-color .12s',
        boxShadow: active ? '0 0 0 1px rgba(124,58,237,.15),inset 0 0 16px rgba(124,58,237,.04)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
        <span style={{ color: meta.color, marginTop: 1, flexShrink: 0 }}>{meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5,
          }}>
            {source.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
              background: STATUS_COLOR[source.status],
              animation: source.status === 'indexing' ? 'rag-pulse 1.4s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: STATUS_COLOR[source.status] }}>
              {source.status === 'indexing' ? indexingLabel : source.status}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{meta.label}</span>
          </div>
          {source.docCount > 0 && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
              {source.docCount.toLocaleString()}
              {source.status === 'indexing' && source.totalChunks ? ` / ${source.totalChunks.toLocaleString()}` : ''}
              {' '}{chunksLabel}
            </div>
          )}
          {source.lastError && (
            <div style={{ fontSize: 10, color: '#fca5a5', marginTop: 3, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {source.lastError.slice(0, 80)}
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
        <MiniBtn onClick={onIngest} color="#7c3aed">
          {Ic.refresh} {source.status === 'indexing' || source.status === 'error' ? continueLabel : syncLabel}
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
  sessions: RagChatSession[]; activeId: string | null; newChatLabel: string
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
        <ThreadPill
          key={s.id}
          session={s}
          active={s.id === activeId}
          onSelect={() => onSelect(s.id)}
          onDelete={() => onDelete(s.id)}
        />
      ))}
    </div>
  )
}

function ThreadPill({ session, active, onSelect, onDelete }: {
  session: RagChatSession; active: boolean; onSelect: () => void; onDelete: () => void
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
      <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {session.title || '…'}
      </span>
      <span
        onClick={e => { e.stopPropagation(); onDelete() }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%',
          opacity: hovered || active ? 1 : 0,
          flexShrink: 0,
        }}
      >
        {Ic.xmark}
      </span>
    </div>
  )
}

/* ── Chat bubble ────────────────────────────────────────────────── */
function ChatBubble({ msg, sources }: {
  msg: { role: string; content: string; sources?: string[]; sourceId?: string }
  sources: RagSource[]
}) {
  const isUser = msg.role === 'user'
  const srcObj = msg.sourceId ? sources.find(s => s.id === msg.sourceId) : undefined

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
        {!isUser && srcObj && (
          <div style={{
            fontSize: 10, color: TYPE_META[srcObj.sourceType].color,
            marginBottom: 5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {TYPE_META[srcObj.sourceType].icon} {srcObj.name}
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
                maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {s.slice(0, 60)}
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
            animation: `rag-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

/* ── Empty chat ─────────────────────────────────────────────────── */
function EmptyChat({ sources, onSelectSource, onAdd, noDataLabel, readyLabel, emptyHint, selectHint, addLabel }: {
  sources: RagSource[]; onSelectSource: (id?: string) => void; onAdd: () => void
  noDataLabel: string; readyLabel: string; emptyHint: string; selectHint: string; addLabel: string
}) {
  const readySources = sources.filter(s => s.status === 'ready')
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
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 7 }}>
          {sources.length === 0 ? noDataLabel : readyLabel}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.65, maxWidth: 320 }}>
          {sources.length === 0 ? emptyHint : selectHint}
        </div>
      </div>
      {sources.length === 0 ? (
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
      ) : readySources.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 380 }}>
          {readySources.map(s => (
            <button key={s.id} onClick={() => onSelectSource(s.id)} style={{
              background: 'var(--surface)',
              border: `1px solid ${TYPE_META[s.sourceType].color}38`,
              borderRadius: 9, padding: '6px 14px', fontSize: 12, fontWeight: 500,
              color: TYPE_META[s.sourceType].color, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'border-color .15s',
            }}>
              {TYPE_META[s.sourceType].icon} {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   ADD SOURCE MODAL
══════════════════════════════════════════════════════════════════ */
const DB_TYPES: { value: SourceType; label: string; color: string }[] = [
  { value: 'postgres', label: 'PostgreSQL', color: '#4f93ce' },
  { value: 'mysql',    label: 'MySQL',      color: '#f29111' },
  { value: 'mongodb',  label: 'MongoDB',    color: '#47a248' },
]
const DEFAULT_PORTS: Record<string, number> = { postgres: 5432, mysql: 3306 }

const TAB_ICONS = {
  db:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
  file: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
}

function AddSourceModal({ t, onClose, onCreateDb, onIngest, onUploadFile, onTest }: {
  t: import('../i18n').Translation
  onClose: () => void
  onCreateDb: (name: string, type: SourceType, config: Record<string, any>) => Promise<RagSource>
  onIngest: (id: string) => void
  onUploadFile: (file: File, name: string) => Promise<RagSource>
  onTest: (type: SourceType, config: Record<string, any>) => Promise<{ ok: boolean; error?: string }>
}) {
  const [tab,      setTab]      = useState<'db' | 'file'>('db')
  const [dbType,   setDbType]   = useState<SourceType>('postgres')
  const [name,     setName]     = useState('')
  const [host,     setHost]     = useState('localhost')
  const [port,     setPort]     = useState('5432')
  const [user,     setUser]     = useState('')
  const [pass,     setPass]     = useState('')
  const [dbName,   setDbName]   = useState('')
  const [uri,      setUri]      = useState('')
  const [query,    setQuery]    = useState('SELECT * FROM information_schema.tables LIMIT 500')
  const [coll,     setColl]     = useState('data')
  const [ssl,      setSsl]      = useState(false)
  const [testRes,  setTestRes]  = useState<{ ok: boolean; error?: string } | null>(null)
  const [testing,  setTesting]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [file,     setFile]     = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading,setUploading]= useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleDbTypeChange(t: SourceType) {
    setDbType(t); setPort(String(DEFAULT_PORTS[t] ?? '')); setTestRes(null)
  }

  function buildConfig(): Record<string, any> {
    if (dbType === 'mongodb') return { uri, database: dbName, collection: coll, limit: 2000 }
    return { host, port: Number(port), user, password: pass, database: dbName, query, ssl }
  }

  async function handleTest() {
    setTesting(true); setTestRes(null)
    setTestRes(await onTest(dbType, buildConfig())); setTesting(false)
  }

  async function handleSaveDb(e: FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const src = await onCreateDb(name || `${dbType}-${dbName}`, dbType, buildConfig())
      onIngest(src.id); onClose()
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setFileName(f.name.replace(/\.[^.]+$/, '')) }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault(); if (!file) return
    setUploading(true)
    try { await onUploadFile(file, fileName || file.name); onClose() }
    catch (err: any) { alert(err.message) }
    finally { setUploading(false) }
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
          borderRadius: 18, width: 520, maxHeight: '88vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,.72),0 0 0 1px rgba(124,58,237,.1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px 0',
          background: 'linear-gradient(180deg,rgba(124,58,237,.07) 0%,transparent 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--accent)' }}>{Ic.plus}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t.ragAddDataSource}</span>
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

          {/* Underline tabs with SVG icons */}
          <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)' }}>
            {(['db', 'file'] as const).map(tabKey => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px 10px', fontSize: 12, fontWeight: 600,
                  background: 'transparent', border: 'none',
                  borderBottom: `2px solid ${tab === tabKey ? 'var(--accent)' : 'transparent'}`,
                  color: tab === tabKey ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'color .15s,border-color .15s',
                  marginBottom: -1,
                }}
              >
                {TAB_ICONS[tabKey]}
                {tabKey === 'db' ? t.ragDatabase : t.ragFileUpload}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 20px' }}>

          {tab === 'db' && (
            <form onSubmit={handleSaveDb} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>{t.ragDatabaseType}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {DB_TYPES.map(dt => (
                    <button
                      key={dt.value} type="button"
                      onClick={() => handleDbTypeChange(dt.value)}
                      style={{
                        flex: 1, padding: '9px 6px', borderRadius: 9, fontSize: 11, fontWeight: 700,
                        border: `1.5px solid ${dbType === dt.value ? dt.color : 'var(--border)'}`,
                        background: dbType === dt.value ? `${dt.color}16` : 'rgba(255,255,255,.03)',
                        color: dbType === dt.value ? dt.color : 'var(--text-muted)',
                        cursor: 'pointer', transition: 'all .15s',
                        boxShadow: dbType === dt.value ? `0 0 16px ${dt.color}1a` : 'none',
                      }}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>{t.ragSourceName}</label>
                <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder={t.ragSourceNamePlaceholder} />
              </div>

              {dbType === 'mongodb' ? (
                <>
                  <div>
                    <label style={lbl}>{t.ragConnectionUri}</label>
                    <input style={inp} value={uri} onChange={e => setUri(e.target.value)} placeholder="mongodb://user:pass@host:27017" required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={lbl}>{t.ragDatabase}</label><input style={inp} value={dbName} onChange={e => setDbName(e.target.value)} placeholder="mydb" required /></div>
                    <div><label style={lbl}>{t.ragCollection}</label><input style={inp} value={coll} onChange={e => setColl(e.target.value)} placeholder="data" /></div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
                    <div><label style={lbl}>{t.ragHost}</label><input style={inp} value={host} onChange={e => setHost(e.target.value)} placeholder="localhost" required /></div>
                    <div><label style={lbl}>{t.ragPort}</label><input style={inp} value={port} onChange={e => setPort(e.target.value)} required /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={lbl}>{t.ragUsername}</label><input style={inp} value={user} onChange={e => setUser(e.target.value)} placeholder="postgres" required /></div>
                    <div><label style={lbl}>{t.ragPassword}</label><input style={inp} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" /></div>
                  </div>
                  <div>
                    <label style={lbl}>{t.ragDatabaseName}</label>
                    <input style={inp} value={dbName} onChange={e => setDbName(e.target.value)} placeholder="mydb" required />
                  </div>
                  <div>
                    <label style={lbl}>
                      {t.ragSqlQuery}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 5 }}>{t.ragRowsToIndex}</span>
                    </label>
                    <textarea
                      style={{ ...inp, resize: 'vertical', minHeight: 72, fontFamily: '"Fira Code",monospace', fontSize: 11, lineHeight: 1.6 }}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={ssl} onChange={e => setSsl(e.target.checked)} />
                    {t.ragEnableSsl}
                  </label>
                </>
              )}

              {testRes && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                  background: testRes.ok ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
                  border: `1px solid ${testRes.ok ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
                  borderRadius: 9, fontSize: 12,
                  color: testRes.ok ? '#4ade80' : '#fca5a5',
                }}>
                  {testRes.ok ? Ic.check : Ic.xmark}
                  {testRes.ok ? t.ragConnSuccess : testRes.error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button" onClick={handleTest} disabled={testing}
                  style={{
                    padding: '9px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                    border: '1px solid var(--border)', background: 'rgba(255,255,255,.04)',
                    color: 'var(--text)', cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.6 : 1,
                  }}
                >
                  {testing ? t.ragTesting : t.ragTestConn}
                </button>
                <button
                  type="submit" disabled={saving}
                  style={{
                    flex: 1, padding: '9px 16px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? t.ragSaving : t.ragSaveIngest}
                </button>
              </div>
            </form>
          )}

          {tab === 'file' && (
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? 'var(--accent)' : file ? '#22c55e' : 'var(--border)'}`,
                  borderRadius: 14, padding: '32px 24px', textAlign: 'center',
                  cursor: 'pointer', transition: 'border-color .15s,background .15s',
                  background: dragging ? 'rgba(124,58,237,.06)' : file ? 'rgba(34,197,94,.04)' : 'rgba(255,255,255,.02)',
                }}
              >
                <input
                  ref={fileRef} type="file" accept=".txt,.csv,.json,.pdf"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setFile(f); setFileName(f.name.replace(/\.[^.]+$/, '')) }
                  }}
                  style={{ display: 'none' }}
                />
                {file ? (
                  <div>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5"
                      style={{ margin: '0 auto 8px', display: 'block' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {(file.size / 1024).toFixed(1)} KB · {t.ragClickChange}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>{Ic.upload}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>{t.ragDropFile}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.ragFileTypes}</div>
                  </div>
                )}
              </div>

              {file && (
                <div>
                  <label style={lbl}>{t.ragSourceName}</label>
                  <input style={inp} value={fileName} onChange={e => setFileName(e.target.value)} placeholder={t.ragDocPlaceholder} />
                </div>
              )}

              <button
                type="submit" disabled={!file || uploading}
                style={{
                  padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: !file || uploading ? 'rgba(255,255,255,.06)' : 'var(--accent)',
                  color: !file || uploading ? 'var(--text-muted)' : '#fff',
                  border: 'none',
                  cursor: !file || uploading ? 'not-allowed' : 'pointer',
                }}
              >
                {uploading ? t.ragUploading : t.ragUploadIndex}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
