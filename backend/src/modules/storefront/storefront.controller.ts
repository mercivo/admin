import { Controller, Get, Post, Param, Body, Headers, Query, Req, Patch } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { CreateInquiryLeadDto, InquiryLeadQueryDto, StorefrontProductQueryDto, UpdateInquiryLeadDto } from './storefront.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '../../common/types/auth-user';

@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('products')
  async getFeaturedProducts() {
    return this.storefrontService.getFeaturedProducts();
  }

  @Get('overview')
  overview(@Req() req: { user: AuthUser }) { return this.storefrontService.overview(req.user); }

  @Get('product-pool')
  productPool(@Query() query: StorefrontProductQueryDto, @Req() req: { user: AuthUser }) { return this.storefrontService.productPool(query, req.user.siteId); }

  @Get('leads')
  leads(@Query() query: InquiryLeadQueryDto, @Req() req: { user: AuthUser }) { return this.storefrontService.listLeads(query, req.user); }

  @Get('lead-assignees')
  leadAssignees(@Req() req: { user: AuthUser }) { return this.storefrontService.leadAssignees(req.user); }

  @Post('leads')
  createManagedLead(@Body() dto: CreateInquiryLeadDto, @Req() req: { user: AuthUser }) { return this.storefrontService.createManagedLead(dto, req.user.tenantId, req.user.siteId, req.user); }

  @Patch('leads/:id')
  updateLead(@Param('id') id: string, @Body() dto: UpdateInquiryLeadDto, @Req() req: { user: AuthUser }) { return this.storefrontService.updateLead(id, dto, req.user); }

}

@Controller('public/inquiries')
@Public()
export class StorefrontInquiryController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Post()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  create(@Headers('x-forwarded-host') forwardedHost: string, @Headers('host') host: string, @Query('site') site: string | undefined, @Body() dto: CreateInquiryLeadDto) {
    return this.storefrontService.createLead(forwardedHost || host || 'localhost', site, dto);
  }
}
