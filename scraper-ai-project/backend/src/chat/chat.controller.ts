import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('sessions')
export class ChatController {
  constructor(private chat: ChatService) {}

  @Post('users')
  getOrCreateUser(@Body('email') email: string, @Body('name') name?: string) {
    return this.chat.getOrCreateUser(email, name);
  }

  @Post()
  createSession(@Body('userId') userId?: string, @Body('title') title?: string) {
    return this.chat.createSession(userId, title);
  }

  @Get()
  getSessions(@Query('userId') userId?: string) {
    return this.chat.getSessions(userId);
  }

  @Get('by-source')
  getSessionsForSource(@Query('sourceId') sourceId?: string) {
    return this.chat.getSessionsForSource(sourceId);
  }

  @Post('by-source')
  createSourceSession(@Body('sourceId') sourceId?: string) {
    return this.chat.createSourceSession(sourceId);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.chat.getMessages(id);
  }

  @Post(':id/messages')
  sendMessage(@Param('id') id: string, @Body('message') message: string) {
    return this.chat.sendMessage(id, message);
  }

  @Delete(':id/messages')
  clearMessages(@Param('id') id: string) {
    return this.chat.clearMessages(id);
  }

  @Delete(':id')
  deleteSession(@Param('id') id: string) {
    return this.chat.deleteSession(id);
  }
}
