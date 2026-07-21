import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { StructuredToolInterface } from '@langchain/core/tools';
import { OllamaService } from '../llm/ollama.service';
import { Session, SessionStoreService } from '../session/session-store.service';
import { TENANT_MANIFESTS } from '../tenants/manifests';

export interface ExecutedAction {
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

export interface TurnResult {
  reply: string;
  pendingConfirmation: boolean;
  executed: ExecutedAction[];
}

const MAX_AGENT_STEPS = 4;

// JS's non-unicode \b only recognizes ASCII [A-Za-z0-9_] as "word" characters, so it never
// matches around Persian text — matching is done by exact first-word comparison instead.
const CONFIRM_WORDS = new Set(['بله', 'بلی', 'آره', 'اره', 'تایید', 'تاييد', 'قبوله', 'باشه', 'بزن', 'درسته', 'اوکی', 'ok', 'yes', 'yep', 'sure']);
const CANCEL_WORDS = new Set(['نه', 'نخیر', 'خیر', 'بیخیال', 'کنسل', 'منصرف', 'لغو', 'نمیخوام', 'نمی‌خوام', 'no', 'cancel', 'nope']);

function firstWordMatches(text: string, words: Set<string>): boolean {
  const firstWord = text.split(/\s+/)[0]?.replace(/[.,!?؟،]+$/, '').toLowerCase();
  return !!firstWord && words.has(firstWord);
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private ollama: OllamaService,
    private sessions: SessionStoreService,
  ) {}

  async handleTurn(tenantId: string, sessionId: string, text: string, authHeader: string): Promise<TurnResult> {
    const manifest = TENANT_MANIFESTS[tenantId];
    if (!manifest) throw new NotFoundException(`تنانت "${tenantId}" شناخته‌شده نیست.`);

    const session = this.sessions.get(sessionId);
    const agentTools = manifest.buildTools({ authHeader });
    const executed: ExecutedAction[] = [];
    const trimmed = text.trim();

    if (session.pendingAction) {
      const pending = session.pendingAction;

      if (firstWordMatches(trimmed, CONFIRM_WORDS)) {
        this.sessions.setPendingAction(sessionId, undefined);
        const match = agentTools.find((t) => t.tool.name === pending.toolName);
        const result = match ? await this.invokeTool(match.tool, pending.args) : 'ابزار موردنظر دیگر در دسترس نیست.';
        executed.push({ tool: pending.toolName, args: pending.args, result });
        this.pushHistory(session, text, result);
        return { reply: result, pendingConfirmation: false, executed };
      }

      if (firstWordMatches(trimmed, CANCEL_WORDS)) {
        this.sessions.setPendingAction(sessionId, undefined);
        const reply = 'باشه، این تغییر رو لغو کردم.';
        this.pushHistory(session, text, reply);
        return { reply, pendingConfirmation: false, executed };
      }

      // Ambiguous reply — drop the stale pending action and fall through to treat this as a fresh instruction.
      this.sessions.setPendingAction(sessionId, undefined);
    }

    const chat = this.ollama.getChatModel();
    const boundChat = chat.bindTools(agentTools.map((t) => t.tool));

    const messages: BaseMessage[] = [
      new SystemMessage(this.buildSystemPrompt(manifest.domainPrompt)),
      ...session.history.slice(-8).map((m) => (m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content))),
      new HumanMessage(text),
    ];

    let answer: string | null = null;
    let pendingConfirmation = false;

    for (let step = 0; step < MAX_AGENT_STEPS && answer === null; step++) {
      const res = await boundChat.invoke(messages);

      if (!res.tool_calls || res.tool_calls.length === 0) {
        answer = this.contentToText(res.content);
        break;
      }

      messages.push(res);

      for (const call of res.tool_calls) {
        const match = agentTools.find((t) => t.tool.name === call.name);
        if (!match) {
          messages.push(new ToolMessage({ content: `ابزار "${call.name}" شناخته‌شده نیست.`, tool_call_id: call.id ?? call.name, name: call.name }));
          continue;
        }

        if (match.requiresConfirmation) {
          this.sessions.setPendingAction(sessionId, {
            toolName: call.name,
            args: call.args as Record<string, unknown>,
            description: JSON.stringify(call.args),
          });
          pendingConfirmation = true;
          messages.push(
            new ToolMessage({
              content: `این عملیات هنوز اجرا نشده — نیاز به تایید صریح کاربر دارد. پارامترهای درخواستی: ${JSON.stringify(call.args)}. پاسخ نهایی‌ات باید فقط یک سوال کوتاه فارسی برای گرفتن تایید یا رد از کاربر باشد؛ هیچ عدد یا تغییری را به‌عنوان امر انجام‌شده گزارش نکن.`,
              tool_call_id: call.id ?? call.name,
              name: call.name,
            }),
          );
          break; // one pending action at a time — don't run any further tool calls from this response
        }

        const output = await this.invokeTool(match.tool, call.args as Record<string, unknown>);
        executed.push({ tool: call.name, args: call.args as Record<string, unknown>, result: output });
        messages.push(new ToolMessage({ content: output, tool_call_id: call.id ?? call.name, name: call.name }));
      }
    }

    if (answer === null) {
      const res = await chat.invoke([...messages, new HumanMessage('بر اساس اطلاعاتی که تا الان جمع‌آوری کردی، همین حالا پاسخ نهایی را به فارسی بده.')]);
      answer = this.contentToText(res.content);
    }

    this.pushHistory(session, text, answer);
    return { reply: answer, pendingConfirmation, executed };
  }

  /** A tool touches a real remote API (auth failures, network errors, 4xx/5xx) — never let that surface as a raw 500. */
  private async invokeTool(tool: StructuredToolInterface, args: Record<string, unknown>): Promise<string> {
    try {
      return String(await tool.invoke(args as any));
    } catch (err) {
      this.logger.error(`tool "${tool.name}" failed: ${err instanceof Error ? err.message : err}`);
      return 'اجرای این عملیات با خطا مواجه شد — ممکن است اتصال به سرویس مقصد یا احراز هویت مشکل داشته باشد.';
    }
  }

  private pushHistory(session: Session, userText: string, replyText: string) {
    session.history.push({ role: 'user', content: userText });
    session.history.push({ role: 'assistant', content: replyText });
    session.updatedAt = Date.now();
  }

  private contentToText(content: unknown): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map((c) => (typeof c === 'string' ? c : (c as any)?.text ?? '')).join('');
    return String(content ?? '');
  }

  private buildSystemPrompt(domainPrompt: string): string {
    return `${domainPrompt}

قوانین مهم:
- فقط بر اساس نتیجه‌ی ابزارها پاسخ بده، نه حدس یا دانش عمومی خودت
- هرگز بدون تایید صریح کاربر (بله/تایید) یک تغییر واقعی (بروزرسانی یا ثبت) را قطعی اعلام نکن — فقط بپرس و منتظر تایید صریح بمان
- برای پیدا کردن یا جستجوی اطلاعات از ابزار جستجو استفاده کن، هیچ‌وقت حدس نزن
- پاسخ نهایی را کوتاه، دقیق و به فارسی بده`;
  }
}
