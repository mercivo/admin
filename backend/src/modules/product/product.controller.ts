import { BadRequestException, Body, Controller, Delete, Get, Param, ParseFilePipeBuilder, Post, Put, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthUser } from '../../common/types/auth-user';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, UpdateProductSeoDto } from './product.dto';
import { ProductStorageService } from './product-storage.service';
import { ProductQueryDto } from './product-query.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService, private readonly storageService: ProductStorageService) { }

  @Post('images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async uploadImage(
    @UploadedFile(new ParseFilePipeBuilder()
      .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ })
      .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
      .build({ fileIsRequired: true, exceptionFactory: () => new BadRequestException('请选择 5MB 以内的 JPG、PNG、WebP 或 GIF 图片') })) file: Express.Multer.File,
    @Req() req: { user: AuthUser },
  ) {
    return this.storageService.uploadProductImage(file, req.user.tenantId, req.user.siteId);
  }

  @Post('site-logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024, files: 1 } }))
  async uploadSiteLogo(
    @UploadedFile(new ParseFilePipeBuilder()
      .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ })
      .addMaxSizeValidator({ maxSize: 500 * 1024 })
      .build({ fileIsRequired: true, exceptionFactory: () => new BadRequestException('请选择 500KB 以内的 JPG、PNG、WebP 或 GIF 图片') })) file: Express.Multer.File,
    @Req() req: { user: AuthUser },
  ) {
    return this.storageService.uploadProductImage(file, req.user.tenantId, req.user.siteId);
  }

  @Get()
  async findAll(@Query() query: ProductQueryDto, @Req() req: { user: AuthUser }) {
    return this.productService.findAll(req.user.siteId, query);
  }

  @Get('catalog/all')
  async catalog(@Req() req: { user: AuthUser }) { return this.productService.catalog(req.user.siteId); }

  @Get('options/all')
  async options(@Req() req: { user: AuthUser }) { return this.productService.catalog(req.user.siteId); }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    return this.productService.findById(id, req.user.siteId);
  }

  @Post()
  async create(@Body() dto: CreateProductDto, @Req() req: { user: AuthUser }) {
    return this.productService.create(dto, req.user.tenantId, req.user.siteId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req: { user: AuthUser }) {
    return this.productService.update(id, dto, req.user.siteId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    return this.productService.remove(id, req.user.siteId);
  }

  @Get(':id/seo')
  async getProductSeo(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    return this.productService.getProductSeo(id, req.user.siteId);
  }

  @Put(':id/seo')
  async updateProductSeo(@Param('id') id: string, @Body() dto: UpdateProductSeoDto, @Req() req: { user: AuthUser }) {
    return this.productService.updateProductSeo(id, dto, req.user.siteId);
  }
}
