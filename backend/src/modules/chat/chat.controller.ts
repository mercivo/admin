import { Controller, Get, Post, Put, Delete, Param, Body, Headers, Query, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, SendPublicMessageDto, CreateMessageDto, UpdateSessionDto } from './chat.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '../../common/types/auth-user';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions/list') listSessions(@Req() req: { user: AuthUser }) { return this.chatService.listSessions(req.user.siteId); }
  @Post('sessions') createSession(@Req() req: { user: AuthUser }) { return this.chatService.createSession(req.user.tenantId, req.user.siteId); }
  @Put('sessions/:id') updateSession(@Param('id') id: string, @Body() dto: UpdateSessionDto, @Req() req: { user: AuthUser }) { return this.chatService.updateSession(id, dto, req.user.siteId); }
  @Delete('sessions/:id') deleteSession(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.chatService.deleteSession(id, req.user.siteId); }
  @Delete('sessions/:id/messages') clearSession(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.chatService.clearSession(id, req.user.siteId); }

  @Get(':sessionId')
  async getMessages(@Param('sessionId') sessionId: string, @Req() req: { user: AuthUser }) {
    return this.chatService.getMessages(sessionId, req.user.siteId);
  }

  @Post('send')
  async sendMessage(@Body() dto: SendMessageDto, @Req() req: { user: AuthUser }) {
    return this.chatService.sendMessage(dto, req.user.siteId);
  }

  @Post('public/send')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async sendPublicMessage(
    @Headers('x-forwarded-host') forwardedHost: string,
    @Headers('host') host: string,
    @Query('site') site: string | undefined,
    @Body() dto: SendPublicMessageDto,
  ) {
    return this.chatService.sendPublicMessage(forwardedHost || host || 'localhost', site, dto);
  }

  @Post('message')
  async createMessage(@Body() dto: CreateMessageDto) {
    return this.chatService.createMessage(dto);
  }
}
