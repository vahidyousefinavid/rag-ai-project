'use client';
import { useRef, useState } from 'react';

export type VoicePhase = 'idle' | 'recording' | 'thinking' | 'speaking' | 'error';

export interface ExecutedAction {
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

interface TurnResponse {
  transcript: string;
  reply: string;
  pendingConfirmation: boolean;
  executed: ExecutedAction[];
  ttsAudio: string | null;
}

function authToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('vtoken') || '';
}

/**
 * Drives one voice-agent session against `vehicle-parts`: records the mic, sends the
 * clip to voice-agent-service, plays back the spoken reply, and reports which real
 * mutations were executed so the caller can refresh its data.
 */
export function useVoiceAgent(tenantId: string, onExecuted?: (actions: ExecutedAction[]) => void) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef(crypto.randomUUID());
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function playReply(base64Mp3: string): Promise<void> {
    audioRef.current?.pause();
    return new Promise((resolve) => {
      const audio = new Audio(`data:audio/mpeg;base64,${base64Mp3}`);
      audioRef.current = audio;
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  }

  async function sendTurn(blob: Blob) {
    setPhase('thinking');
    try {
      const form = new FormData();
      form.append('audio', blob, 'command.webm');
      form.append('tenantId', tenantId);
      form.append('sessionId', sessionIdRef.current);

      const res = await fetch('/voice-agent/turn', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken()}` },
        body: form,
      });
      if (!res.ok) throw new Error(`دستیار صوتی پاسخ نداد (کد ${res.status})`);

      const data: TurnResponse = await res.json();
      setTranscript(data.transcript);
      setReply(data.reply);
      setPendingConfirmation(data.pendingConfirmation);

      if (data.ttsAudio) {
        setPhase('speaking');
        await playReply(data.ttsAudio);
      }
      setPhase('idle');

      if (data.executed.length > 0) onExecuted?.(data.executed);
    } catch (e: any) {
      setError(e.message || 'خطای نامشخص');
      setPhase('error');
    }
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void sendTurn(new Blob(chunksRef.current, { type: 'audio/webm' }));
      };
      mr.start();
      mediaRef.current = mr;
      setPhase('recording');
    } catch {
      setError('دسترسی به میکروفون ممنوع است');
      setPhase('error');
    }
  }

  function stop() {
    mediaRef.current?.stop();
  }

  return { phase, transcript, reply, pendingConfirmation, error, start, stop };
}
