import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';

class SendMessageDto {
  @IsOptional() @IsString() mechanicId?: string;
  @IsString() body: string;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class MessagesController {
  constructor(private svc: MessagesService) {}

  @Get('vehicles/:vehicleId/messages')
  listAsOwner(@Param('vehicleId') vehicleId: string, @Query('mechanicId') mechanicId: string, @Request() req) {
    return this.svc.list(vehicleId, mechanicId, req.user.id, 'owner');
  }

  @Post('vehicles/:vehicleId/messages')
  sendAsOwner(@Param('vehicleId') vehicleId: string, @Body() dto: SendMessageDto, @Request() req) {
    return this.svc.send(vehicleId, dto.mechanicId!, req.user.id, 'owner', dto.body);
  }

  @Get('mechanic/vehicles/:vehicleId/messages')
  listAsMechanic(@Param('vehicleId') vehicleId: string, @Request() req) {
    return this.svc.list(vehicleId, req.user.id, req.user.id, 'mechanic');
  }

  @Post('mechanic/vehicles/:vehicleId/messages')
  sendAsMechanic(@Param('vehicleId') vehicleId: string, @Body() dto: SendMessageDto, @Request() req) {
    return this.svc.send(vehicleId, req.user.id, req.user.id, 'mechanic', dto.body);
  }

  @Get('messages/unread-count')
  unreadCount(@Request() req) {
    return this.svc.unreadCount(req.user.id, req.user.role).then((count) => ({ count }));
  }

  @Get('messages/conversations')
  conversations(@Request() req) {
    return this.svc.conversations(req.user.id, req.user.role);
  }
}
