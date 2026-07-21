'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api, ChatMessage, toJalali } from '@/lib/api';
import { C, Button, Sheet, Spinner } from './ui';
import { MessageIcon, SendIcon } from './icons';

function dayLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return 'امروز';
  if (sameDay(d, yesterday)) return 'دیروز';
  return toJalali(dateStr.slice(0, 10));
}

export default function Chat({
  vehicleId, mechanicId, role, title, onClose,
}: {
  vehicleId: string;
  mechanicId: string;
  role: 'owner' | 'mechanic';
  title: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const meId = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('vuser') || '{}').id : null;

  const load = useCallback(() => {
    const p = role === 'owner' ? api.messages.listAsOwner(vehicleId, mechanicId) : api.messages.listAsMechanic(vehicleId);
    p.then(setMessages).finally(() => setLoading(false));
  }, [vehicleId, mechanicId, role]);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody('');
    setSending(true);
    try {
      const req = role === 'owner' ? api.messages.sendAsOwner(vehicleId, mechanicId, text) : api.messages.sendAsMechanic(vehicleId, text);
      const msg = await req;
      setMessages(prev => [...prev, msg]);
    } catch {
      setBody(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  let lastDay = '';

  return (
    <Sheet title={title} icon={<MessageIcon size={16} />} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 440, overflowY: 'auto', padding: '4px 2px' }}>
          {loading ? (
            <Spinner />
          ) : messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.muted, fontSize: 12.5, padding: '20px 0' }}>هنوز پیامی رد و بدل نشده. اولین پیام رو بفرست.</p>
          ) : (
            messages.map(m => {
              const mine = m.senderId === meId;
              const day = dayLabel(m.createdAt);
              const showSeparator = day !== lastDay;
              lastDay = day;
              return (
                <div key={m.id}>
                  {showSeparator && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 8px' }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, color: C.subtle,
                        background: C.surface2, border: `1px solid ${C.border}`,
                        padding: '3px 12px', borderRadius: 20,
                      }}>{day}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: mine ? 'flex-start' : 'flex-end', marginBottom: 4 }}>
                    <div style={{
                      maxWidth: '78%', padding: '9px 13px', borderRadius: mine ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                      background: mine ? `linear-gradient(135deg, ${C.green}, ${C.greenDark})` : C.surface2,
                      color: mine ? 'white' : C.text,
                      border: mine ? 'none' : `1px solid ${C.border}`,
                    }}>
                      <p style={{ fontSize: 13, margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</p>
                      <p style={{ fontSize: 9.5, margin: '4px 0 0', opacity: 0.65, textAlign: 'left' }}>
                        {new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="پیام بنویس..."
            style={{
              flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 14,
              padding: '11px 14px', fontSize: 13, color: C.text, fontFamily: 'Vazirmatn, sans-serif', outline: 'none',
            }}
          />
          <Button type="submit" loading={sending} disabled={!body.trim()} icon={<SendIcon size={15} />}>ارسال</Button>
        </form>
      </div>
    </Sheet>
  );
}
