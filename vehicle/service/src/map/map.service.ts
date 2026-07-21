import { Injectable, Logger } from '@nestjs/common';

const API_KEY = process.env.NESHAN_API_KEY;
const TILE_STYLE = 'standard-day';

export interface ProxiedImage {
  buffer: Buffer;
  status: number;
}

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);

  async tile(z: string, x: string, y: string): Promise<ProxiedImage | null> {
    if (!API_KEY) return null;
    try {
      const res = await fetch(`https://api.neshan.org/v1/map-tiles/${TILE_STYLE}/${z}/${x}/${y}.png`, {
        headers: { 'Api-Key': API_KEY },
      });
      if (!res.ok) return { buffer: Buffer.alloc(0), status: res.status };
      return { buffer: Buffer.from(await res.arrayBuffer()), status: 200 };
    } catch (err: any) {
      this.logger.warn(`neshan tile fetch failed: ${err?.message || err}`);
      return null;
    }
  }

  async staticMap(params: { lat: number; lng: number; zoom: number; width: number; height: number }): Promise<ProxiedImage | null> {
    if (!API_KEY) return null;
    try {
      const url =
        `https://api.neshan.org/v5/static?key=${API_KEY}&type=neshan` +
        `&width=${params.width}&height=${params.height}&zoom=${params.zoom}` +
        `&latitude=${params.lat}&longitude=${params.lng}&marker=red`;
      const res = await fetch(url);
      if (!res.ok) return { buffer: Buffer.alloc(0), status: res.status };
      return { buffer: Buffer.from(await res.arrayBuffer()), status: 200 };
    } catch (err: any) {
      this.logger.warn(`neshan static map fetch failed: ${err?.message || err}`);
      return null;
    }
  }
}
