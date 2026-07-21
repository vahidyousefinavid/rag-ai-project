import { Injectable, Logger } from '@nestjs/common';

const API_KEY = process.env.NESHAN_API_KEY;

@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);

  async reverse(lat: number, lng: number): Promise<{ address: string | null }> {
    if (!API_KEY) return { address: null };
    try {
      const res = await fetch(`https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`, {
        headers: { 'Api-Key': API_KEY },
      });
      if (!res.ok) return { address: null };
      const data = await res.json();
      const address: string | null = data?.formatted_address || data?.address || null;
      return { address };
    } catch (err: any) {
      this.logger.warn(`neshan reverse geocode failed: ${err?.message || err}`);
      return { address: null };
    }
  }
}
