import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, SwitchSiteDto } from './auth.dto';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '../../common/types/auth-user';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public() @Throttle({ default: { limit: 20, ttl: 60000 } }) @Get('captcha') captcha() { return this.auth.captcha(); }
  @Public() @Throttle({ default: { limit: 10, ttl: 60000 } }) @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Public() @Throttle({ default: { limit: 5, ttl: 60000 } }) @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Get('me') me(@Req() request: { user: unknown }) { return request.user; }
  @Post('switch-site') switchSite(@Body() dto: SwitchSiteDto, @Req() request: { user: AuthUser }) { return this.auth.switchSite(request.user.userId, request.user.tenantId, dto.siteId); }
}
