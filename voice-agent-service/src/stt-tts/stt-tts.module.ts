import { Module } from '@nestjs/common';
import { SttTtsService } from './stt-tts.service';

@Module({
  providers: [SttTtsService],
  exports: [SttTtsService],
})
export class SttTtsModule {}
