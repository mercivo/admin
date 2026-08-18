import { Controller, Get, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthUser } from '../../common/types/auth-user';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Req() req: { user: AuthUser }) {
    return this.dashboardService.getStats(req.user.siteId);
  }
}
