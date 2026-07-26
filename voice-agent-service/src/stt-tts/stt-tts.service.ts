import { Injectable, Logger } from '@nestjs/common';

const STT_TTS_SERVICE_URL = process.env.STT_TTS_SERVICE_URL || 'http://127.0.0.1:8010';
const TTS_VOICE = process.env.TTS_VOICE || 'fa-IR-DilaraNeural';

@Injectable()
export class SttTtsService {
  private readonly logger = new Logger(SttTtsService.name);

  /** Sends recorded audio to the standalone stt-tts-service (faster-whisper) and returns the Persian transcript. */
  async transcribe(audio: Buffer, filename: string): Promise<string> {
    const form = new FormData();
    form.append('file', new Blob([audio]), filename || 'audio.webm');

    const res = await fetch(`${STT_TTS_SERVICE_URL}/api/transcribe`, { method: 'POST', body: form });
    if (!res.ok) {
      this.logger.error(`transcribe failed: ${res.status} ${await res.text()}`);
      throw new Error('STT service error');
    }
    const data = await res.json();
    return (data.text || '').trim();
  }

  /** Sends reply text to the standalone stt-tts-service (edge-tts) and returns an mp3 buffer. */
  async speak(text: string): Promise<Buffer> {
    const res = await fetch(`${STT_TTS_SERVICE_URL}/api/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: TTS_VOICE }),
    });
    if (!res.ok) {
      this.logger.error(`speak failed: ${res.status} ${await res.text()}`);
      throw new Error('TTS service error');
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
