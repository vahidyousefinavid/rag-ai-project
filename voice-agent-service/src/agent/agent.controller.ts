import { Body, Controller, Headers, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AgentService } from './agent.service';
import { SttTtsService } from '../stt-tts/stt-tts.service';

interface TurnBody {
  text?: string;
  tenantId: string;
  sessionId: string;
}

@Controller('api/voice-agent')
export class AgentController {
  constructor(
    private agent: AgentService,
    private sttTts: SttTtsService,
  ) {}

  /** One voice-agent turn: optional recorded audio (STT) or plain text in, spoken + written reply out. */
  @Post('turn')
  @UseInterceptors(FileInterceptor('audio'))
  async turn(@UploadedFile() audio: Express.Multer.File | undefined, @Body() body: TurnBody, @Headers('authorization') authHeader: string) {
    let transcript: string;
    try {
      transcript = audio ? await this.sttTts.transcribe(audio.buffer, audio.originalname) : (body.text || '').trim();
    } catch {
      return { transcript: '', reply: 'سرویس تشخیص گفتار در دسترس نیست، لطفاً بعداً امتحان کن.', pendingConfirmation: false, executed: [], ttsAudio: null };
    }

    if (!transcript) {
      return { transcript: '', reply: 'صدایی شنیده نشد یا متنی دریافت نشد.', pendingConfirmation: false, executed: [], ttsAudio: null };
    }

    const result = await this.agent.handleTurn(body.tenantId, body.sessionId, transcript, authHeader);

    // TTS is a nice-to-have on top of an already-decided action — a down/unreachable
    // speech service must never roll back or hide a mutation that already happened.
    let ttsAudio: string | null = null;
    try {
      ttsAudio = (await this.sttTts.speak(result.reply)).toString('base64');
    } catch {
      ttsAudio = null;
    }

    return {
      transcript,
      reply: result.reply,
      pendingConfirmation: result.pendingConfirmation,
      executed: result.executed,
      ttsAudio,
    };
  }
}
