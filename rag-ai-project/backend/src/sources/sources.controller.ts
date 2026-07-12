import {
  Controller, Get, Post, Delete, Body, Param,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SourcesService } from './sources.service';

@Controller('sources')
export class SourcesController {
  constructor(private svc: SourcesService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() body: { name: string; sourceType: string; config: Record<string, any> }) {
    return this.svc.create(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/ingest')
  ingest(@Param('id') id: string) {
    return this.svc.startIngest(id);
  }

  @Post('connection/test')
  testConnection(@Body() body: { sourceType: string; config: Record<string, any> }) {
    return this.svc.testConnection(body.sourceType, body.config);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.svc.ingestFile(file.buffer, file.mimetype, file.originalname, name || file.originalname);
  }
}
