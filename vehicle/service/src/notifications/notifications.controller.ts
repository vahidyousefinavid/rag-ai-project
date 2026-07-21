import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  list(@Request() req) {
    return this.svc.listForUser(req.user.id);
  }

  @Get('unread-count')
  async unreadCount(@Request() req) {
    return { count: await this.svc.unreadCount(req.user.id) };
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Request() req) {
    return this.svc.markRead(id, req.user.id);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Request() req) {
    return this.svc.confirm(id, req.user.id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Request() req) {
    return this.svc.reject(id, req.user.id);
  }
}
