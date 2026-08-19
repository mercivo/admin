import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SiteService } from './site.service';
import { CreateDomainDto, CreatePublicInquiryDto, CreateSiteDto, PublishSiteDto, RollbackSiteDto, TranslatePublishedSiteDto, UpdateSiteDto } from './site.dto';
import { PublicCustomerLoginDto } from '../customer/customer.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '../../common/types/auth-user';

@Controller('admin/sites')
@Roles('admin', 'editor')
export class SiteAdminController {
  constructor(private readonly service: SiteService) {}
  @Get('tenants') tenants(@Req() req: { user: AuthUser }) { return this.service.listTenants(req.user.tenantId); }
  @Get() sites(@Req() req: { user: AuthUser }) { return this.service.listSites(req.user.tenantId); }
  @Post() create(@Body() dto: CreateSiteDto, @Req() req: { user: AuthUser }) { return this.service.createSite({ ...dto, tenantId: req.user.tenantId }); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateSiteDto, @Req() req: { user: AuthUser }) { return this.service.updateSite(id, dto, req.user.tenantId); }
  @Get(':id/domains') domains(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.listDomains(id, req.user.tenantId); }
  @Post(':id/domains') addDomain(@Param('id') id: string, @Body() dto: CreateDomainDto, @Req() req: { user: AuthUser }) { return this.service.addDomain(id, dto, req.user.tenantId); }
  @Post('domains/:id/verify') verifyDomain(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.verifyDomain(id, req.user.tenantId); }
  @Delete('domains/:id') removeDomain(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.removeDomain(id, req.user.tenantId); }
  @Get(':id/versions') versions(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.listVersions(id, req.user.tenantId); }
  @Post(':id/publish') publish(@Param('id') id: string, @Body() dto: PublishSiteDto, @Req() req: { user: AuthUser }) { return this.service.publish(id, dto.publishedBy, req.user.tenantId); }
  @Post(':id/rollback') rollback(@Param('id') id: string, @Body() dto: RollbackSiteDto, @Req() req: { user: AuthUser }) { return this.service.rollback(id, dto.versionId, req.user.tenantId); }
}

@Controller('public')
@Public()
export class SitePublicController {
  constructor(private readonly service: SiteService) {}
  @Get('site') getSite(@Headers('x-forwarded-host') forwardedHost: string, @Headers('host') host: string, @Headers('authorization') authorization: string, @Query('site') site?: string) { return this.service.resolvePublished(forwardedHost || host || 'localhost', site, authorization); }
  @Get('domains/authorize') async authorizeDomain(@Query('domain') domain: string, @Res() response: Response) { response.status(await this.service.authorizeDomain(domain || '') ? 200 : 404).send(); }
  @Get('sitemap.xml') async sitemap(@Headers('x-forwarded-host') forwardedHost: string, @Headers('host') host: string, @Query('site') site: string | undefined, @Res() response: Response) { response.type('application/xml').send(await this.service.sitemap(forwardedHost || host || 'localhost', site)); }
  @Get('robots.txt') async robots(@Headers('x-forwarded-host') forwardedHost: string, @Headers('host') host: string, @Query('site') site: string | undefined, @Res() response: Response) { response.type('text/plain').send(await this.service.robots(forwardedHost || host || 'localhost', site)); }
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('customer/login') customerLogin(@Headers('x-forwarded-host') forwardedHost: string, @Headers('host') host: string, @Query('site') site: string | undefined, @Body() dto: PublicCustomerLoginDto) { return this.service.loginPublicCustomer(forwardedHost || host || 'localhost', site, dto.phone); }
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('site/translate') translateSite(@Headers('x-forwarded-host') forwardedHost: string, @Headers('host') host: string, @Query('site') site: string | undefined, @Body() dto: TranslatePublishedSiteDto) { return this.service.translatePublished(forwardedHost || host || 'localhost', site, dto.language); }
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('inquiries') createInquiry(@Headers('x-forwarded-host') forwardedHost: string, @Headers('host') host: string, @Query('site') site: string | undefined, @Body() dto: CreatePublicInquiryDto) { return this.service.createPublicInquiry(forwardedHost || host || 'localhost', site, dto); }
}
