import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ChatSession } from '../database/entities/chat-session.entity';
import { Message, MessageRole } from '../database/entities/message.entity';
import { User } from '../database/entities/user.entity';
import { RagService } from '../rag/rag.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession) private sessions: Repository<ChatSession>,
    @InjectRepository(Message) private messages: Repository<Message>,
    @InjectRepository(User) private users: Repository<User>,
    private rag: RagService,
  ) {}

  async getOrCreateUser(email: string, name?: string): Promise<User> {
    let user = await this.users.findOne({ where: { email } });
    if (!user) {
      user = this.users.create({ email, name });
      await this.users.save(user);
    }
    return user;
  }

  async createSession(userId?: string, title?: string): Promise<ChatSession> {
    const session = this.sessions.create({ userId, title: title ?? 'New Chat' });
    return this.sessions.save(session);
  }

  async getSessions(userId?: string): Promise<ChatSession[]> {
    const where: any = { sourceId: IsNull() };
    if (userId) where.userId = userId;
    return this.sessions.find({ where, order: { createdAt: 'DESC' } });
  }

  async getSession(id: string): Promise<ChatSession> {
    const session = await this.sessions.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /**
   * RAG sessions are scoped per source: `sourceId` undefined means the
   * "all sources" RAG chat, stored under the '' sentinel (kept distinct
   * from null, which marks a general, non-RAG chat session). Each source
   * (or the "all sources" scope) can hold multiple, independently saved chats.
   */
  async getSessionsForSource(sourceId?: string): Promise<ChatSession[]> {
    const key = sourceId ?? '';
    return this.sessions.find({ where: { sourceId: key }, order: { createdAt: 'DESC' } });
  }

  async createSourceSession(sourceId?: string): Promise<ChatSession> {
    const key = sourceId ?? '';
    const session = this.sessions.create({ sourceId: key, title: 'چت جدید' });
    return this.sessions.save(session);
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    await this.getSession(sessionId);
    return this.messages.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async sendMessage(sessionId: string, content: string): Promise<{ userMessage: Message; assistantMessage: Message }> {
    const session = await this.getSession(sessionId);
    const isFirstMessage = (await this.messages.count({ where: { sessionId } })) === 0;

    // Save user message first
    const userMessage = await this.messages.save(
      this.messages.create({ sessionId, role: MessageRole.USER, content }),
    );

    // Auto-title the session using its first user message
    if (isFirstMessage) {
      const newTitle = content.slice(0, 40) + (content.length > 40 ? '…' : '');
      await this.sessions.update(sessionId, { title: newTitle });
    }

    // Fetch last 6 messages as conversation history for RAG context
    const recentMessages = await this.messages.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: 7,
    });
    // Reverse to chronological order, exclude the message we just saved (last one)
    const history = recentMessages
      .reverse()
      .slice(0, -1)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const { answer, sources } = await this.rag.ask(content, history, session.sourceId || undefined);

    const assistantMessage = await this.messages.save(
      this.messages.create({
        sessionId,
        role: MessageRole.ASSISTANT,
        content: answer,
        sources,
      }),
    );

    return { userMessage, assistantMessage };
  }

  async deleteSession(id: string): Promise<void> {
    await this.getSession(id);
    await this.sessions.delete(id);
  }

  async clearMessages(sessionId: string): Promise<void> {
    await this.getSession(sessionId);
    await this.messages.delete({ sessionId });
  }
}
