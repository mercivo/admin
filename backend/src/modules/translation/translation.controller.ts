import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthUser } from '../../common/types/auth-user';
import { CommitTranslationImportDto, SaveTranslationsDto, TranslationQueryDto } from './translation.dto';
import { TranslationService } from './translation.service';

@Controller('translations')
export class TranslationController {
  constructor(private readonly service: TranslationService) {}
  @Get() list(@Query() query: TranslationQueryDto, @Req() req: { user: AuthUser }) { return this.service.list(req.user.siteId, query); }
  @Get('summary') summary(@Req() req: { user: AuthUser }) { return this.service.sync(req.user.siteId).then(() => this.service.summary(req.user.siteId)); }
  @Put() save(@Body() dto: SaveTranslationsDto, @Req() req: { user: AuthUser }) { return this.service.save(req.user.siteId, dto); }
  @Get('export/:locale') async export(@Param('locale') locale: string, @Req() req: { user: AuthUser }, @Res() response: Response) { const result = await this.service.exportWorkbook(req.user.siteId, locale); response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`); response.send(result.data); }
  @Post('import/:locale/preview') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } })) previewImport(@Param('locale') locale: string, @UploadedFile() file: Express.Multer.File, @Req() req: { user: AuthUser }) { if (!file?.buffer) throw new BadRequestException('请选择 Excel 文件'); return this.service.previewImport(req.user.siteId, req.user.userId, locale, file.buffer); }
  @Post('import/:locale/commit') commitImport(@Param('locale') locale: string, @Body() dto: CommitTranslationImportDto, @Req() req: { user: AuthUser }) { return this.service.commitImport(req.user.siteId, req.user.userId, locale, dto.token); }
  @Get('import/report/:token') async importReport(@Param('token') token: string, @Req() req: { user: AuthUser }, @Res() response: Response) { const data = await this.service.importReport(req.user.siteId, req.user.userId, token); response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('多语言导入预检结果.xlsx')}`); response.send(data); }
}
