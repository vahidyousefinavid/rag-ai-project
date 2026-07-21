import { Injectable, OnModuleDestroy } from '@nestjs/common';

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PendingAction {
  toolName: string;
  args: Record<string, unknown>;
  /** Human-readable Persian description shown/spoken back while asking for confirmation. */
  description: string;
}

export interface Session {
  history: HistoryMessage[];
  pendingAction?: PendingAction;
  updatedAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class SessionStoreService implements OnModuleDestroy {
  private sessions = new Map<string, Session>();
  private sweepTimer: NodeJS.Timeout;

  constructor() {
    this.sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    this.sweepTimer.unref?.();
  }

  onModuleDestroy() {
    clearInterval(this.sweepTimer);
  }

  get(sessionId: string): Session {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = { history: [], updatedAt: Date.now() };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  touch(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) session.updatedAt = Date.now();
  }

  setPendingAction(sessionId: string, pending: PendingAction | undefined) {
    this.get(sessionId).pendingAction = pending;
  }

  private sweep() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.updatedAt > SESSION_TTL_MS) this.sessions.delete(id);
    }
  }
}
