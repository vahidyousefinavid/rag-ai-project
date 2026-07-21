import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MapService } from './map.service';

const CACHE_HEADER = 'public, max-age=604800, stale-while-revalidate=86400';

@Controller('map')
export class MapController {
  constructor(private svc: MapService) {}

  // Public on purpose: <img src> and Leaflet's TileLayer cannot attach an Authorization header.
  @Get('tile/:z/:x/:y')
  async tile(@Param('z') z: string, @Param('x') x: string, @Param('y') y: string, @Res() res: Response) {
    const result = await this.svc.tile(z, x, y);
    if (!result || result.status !== 200) {
      res.status(result?.status ?? 503).end();
      return;
    }
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': CACHE_HEADER });
    res.send(result.buffer);
  }

  @Get('static')
  async staticMap(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('zoom') zoom: string,
    @Query('width') width: string,
    @Query('height') height: string,
    @Res() res: Response,
  ) {
    const result = await this.svc.staticMap({
      lat: Number(lat),
      lng: Number(lng),
      zoom: zoom ? Number(zoom) : 15,
      width: width ? Number(width) : 640,
      height: height ? Number(height) : 320,
    });
    if (!result || result.status !== 200) {
      res.status(result?.status ?? 503).end();
      return;
    }
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': CACHE_HEADER });
    res.send(result.buffer);
  }
}
