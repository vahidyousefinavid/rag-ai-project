import { Controller, Post, Body } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('chat')
export class RagController {
  constructor(private rag: RagService) {}

  @Post()
  chat(@Body() body: { message: string; sourceId?: string; history?: any[] }) {
    return this.rag.ask(body.message, body.history ?? [], body.sourceId);
  }
}
