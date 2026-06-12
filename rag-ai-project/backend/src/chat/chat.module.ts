import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatSession } from '../database/entities/chat-session.entity';
import { Message } from '../database/entities/message.entity';
import { User } from '../database/entities/user.entity';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatSession, Message, User]), RagModule],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
