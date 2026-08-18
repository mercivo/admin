import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial } from './testimonial.entity';
import { Product } from '../product/product.entity';
import { CreateTestimonialDto, UpdateTestimonialDto } from './storefront.dto';

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(Testimonial)
    private readonly testimonialRepository: Repository<Testimonial>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  // ---- Featured Products ----
  async getFeaturedProducts(): Promise<Product[]> {
    return this.productRepository.find({
      where: { status: 'published' },
      order: { createdAt: 'DESC' },
      take: 6,
    });
  }

  // ---- Testimonials ----
  async findAllTestimonials(): Promise<Testimonial[]> {
    return this.testimonialRepository.find({ order: { sort: 'ASC' } });
  }

  async createTestimonial(dto: CreateTestimonialDto): Promise<Testimonial> {
    return this.testimonialRepository.save(dto);
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto): Promise<Testimonial> {
    const testimonial = await this.testimonialRepository.findOne({ where: { id } });
    if (!testimonial) throw new NotFoundException(`Testimonial ${id} not found`);
    Object.assign(testimonial, dto);
    return this.testimonialRepository.save(testimonial);
  }

  async deleteTestimonial(id: string): Promise<void> {
    await this.testimonialRepository.delete(id);
  }
}