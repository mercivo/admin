import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './product-category.dto';
import { ProductCategoryService } from './product-category.service';

@Controller('product-categories')
export class ProductCategoryController {
  constructor(private readonly productCategories: ProductCategoryService) {}
  @Get() findTree(@Req() req: { user: AuthUser }) { return this.productCategories.findTree(req.user.siteId); }
  @Post() create(@Body() dto: CreateProductCategoryDto, @Req() req: { user: AuthUser }) { return this.productCategories.create(dto, req.user.tenantId, req.user.siteId); }
  @Put(':code') update(@Param('code') code: string, @Body() dto: UpdateProductCategoryDto, @Req() req: { user: AuthUser }) { return this.productCategories.update(code, dto, req.user.siteId); }
  @Delete(':code') remove(@Param('code') code: string, @Req() req: { user: AuthUser }) { return this.productCategories.remove(code, req.user.siteId); }
}
