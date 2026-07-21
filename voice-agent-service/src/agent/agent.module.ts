import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { LlmModule } from '../llm/llm.module';
import { SessionModule } from '../session/session.module';
import { SttTtsModule } from '../stt-tts/stt-tts.module';

@Module({
  imports: [LlmModule, SessionModule, SttTtsModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
