import { Controller, Post, Body } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('chat')
export class RagController {
  constructor(private rag: RagService) {}

  @Post()
  chat(@Body('message') message: string) {
    return this.rag.ask(message);
  }
}
