import { useEffect } from 'react'
import { useMonitorWizard } from '../hooks/useMonitorWizard'
import type { MonitorTarget } from '../hooks/useMonitors'
import { useLanguage } from '../i18n/LanguageContext'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'

interface Props {
  onClose: () => void
  onCreated: (target: MonitorTarget) => void
  /** Swaps this chat wizard for the manual form. */
  onSwitchToForm: () => void
}

export default function MonitorWizardModal({ onClose, onCreated, onSwitchToForm }: Props) {
  const { t } = useLanguage()
  const { messages, loading, error, createdTarget, send } = useMonitorWizard(t.monitorWizardGreeting)

  useEffect(() => {
    if (createdTarget) {
      onCreated(createdTarget)
      onClose()
    }
  }, [createdTarget, onCreated, onClose])

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
          borderRadius: 18, width: 560, height: '78vh', maxHeight: 680,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,.72),0 0 0 1px rgba(124,58,237,.1)',
        }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ color: 'var(--accent)' }}>✦</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {t.monitorWizardTab}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={onSwitchToForm}
              style={{
                background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '5px 10px', fontSize: 11.5, fontWeight: 600,
                color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >{t.monitorFormTab}</button>
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
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <MessageList messages={messages} />
          {loading && <TypingIndicator />}
          {error && (
            <div
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
              className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs flex-shrink-0"
            >
              {error}
            </div>
          )}
          <ChatInput onSend={send} loading={loading} />
        </div>
      </div>
    </div>
  )
}
