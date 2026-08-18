import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { CreateTestimonialDto, UpdateTestimonialDto } from './storefront.dto';

@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('products')
  async getFeaturedProducts() {
    return this.storefrontService.getFeaturedProducts();
  }

  @Get('testimonials')
  async getTestimonials() {
    return this.storefrontService.findAllTestimonials();
  }

  @Post('testimonials')
  async createTestimonial(@Body() dto: CreateTestimonialDto) {
    return this.storefrontService.createTestimonial(dto);
  }

  @Put('testimonials/:id')
  async updateTestimonial(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.storefrontService.updateTestimonial(id, dto);
  }

  @Delete('testimonials/:id')
  async deleteTestimonial(@Param('id') id: string) {
    return this.storefrontService.deleteTestimonial(id);
  }
}