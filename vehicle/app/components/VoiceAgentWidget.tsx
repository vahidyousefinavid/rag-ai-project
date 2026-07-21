'use client';
import { C } from './ui/tokens';
import { MicIcon, Volume2Icon, XIcon } from './icons';
import { ExecutedAction, useVoiceAgent } from '@/hooks/useVoiceAgent';

const PHASE_LABEL: Record<string, string> = {
  recording: 'در حال گوش دادن...',
  thinking: 'در حال فکر کردن...',
  speaking: 'در حال پاسخ...',
};

export default function VoiceAgentWidget({ tenantId, onExecuted }: { tenantId: string; onExecuted?: (actions: ExecutedAction[]) => void }) {
  const { phase, transcript, reply, pendingConfirmation, error, start, stop } = useVoiceAgent(tenantId, onExecuted);

  const isBusy = phase === 'recording' || phase === 'thinking' || phase === 'speaking';
  const showPanel = isBusy || !!reply || !!error;

  return (
    <div style={{ position: 'fixed', insetInlineEnd: 18, bottom: 'calc(88px + env(safe-area-inset-bottom))', zIndex: 55 }}>
      {showPanel && (
        <div
          style={{
            background: C.surfaceSolid,
            border: `1px solid ${C.borderStrong}`,
            borderRadius: 18,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            width: 280,
            padding: '14px 16px',
            marginBottom: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {phase === 'recording' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.red }} className="animate-pulse" />}
              {phase === 'thinking' && <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.green }} className="animate-spin" />}
              {phase === 'speaking' && <Volume2Icon size={14} color={C.green} />}
              <span style={{ fontSize: 12, fontWeight: 700, color: isBusy ? C.text : C.muted }}>
                {PHASE_LABEL[phase] || 'دستیار صوتی'}
              </span>
            </div>
            {!isBusy && (
              <button onClick={stop} style={{ background: 'none', border: 'none', color: C.subtle, cursor: 'pointer', padding: 2 }}>
                <XIcon size={13} />
              </button>
            )}
          </div>

          {error && (
            <p style={{ fontSize: 12, color: '#F87171', margin: 0 }}>{error}</p>
          )}

          {!error && transcript && (
            <p style={{ fontSize: 11.5, color: C.subtle, margin: 0, lineHeight: 1.6 }} dir="rtl">« {transcript} »</p>
          )}

          {!error && reply && (
            <p style={{ fontSize: 12.5, color: C.text, margin: 0, lineHeight: 1.7, fontWeight: 600 }} dir="rtl">{reply}</p>
          )}

          {pendingConfirmation && (
            <p style={{ fontSize: 11, color: C.amber, margin: 0 }}>برای اجرا، دوباره روی میکروفون بزن و «بله» بگو</p>
          )}
        </div>
      )}

      <button
        onClick={phase === 'recording' ? stop : start}
        disabled={phase === 'thinking' || phase === 'speaking'}
        style={{
          width: 56, height: 56, borderRadius: '50%',
          background: phase === 'recording' ? C.red : `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
          border: 'none',
          boxShadow: phase === 'recording' ? '0 8px 24px rgba(239,68,68,0.4)' : `0 8px 24px ${C.greenGlow}`,
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: phase === 'thinking' || phase === 'speaking' ? 'not-allowed' : 'pointer',
          opacity: phase === 'thinking' || phase === 'speaking' ? 0.6 : 1,
          transition: 'all 0.18s ease',
          marginInlineStart: 'auto',
        }}
        aria-label="دستیار صوتی"
      >
        <MicIcon size={24} />
      </button>
    </div>
  );
}
