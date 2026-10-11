import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/product.entity';
import { Customer } from '../customer/customer.entity';
import { AppConfig } from '../workspace/app-config.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Customer) private readonly customerRepository: Repository<Customer>,
    @InjectRepository(AppConfig) private readonly configRepository: Repository<AppConfig>,
  ) {}

  async getStats(siteId: string) {
    const [totalProducts, publishedProducts, customers, dashboardConfig] = await Promise.all([
      this.productRepository.count({ where: { siteId } }),
      this.productRepository.count({ where: { siteId, status: 'published' } }),
      this.customerRepository.find({ where: { siteId } }),
      this.configRepository.findOne({ where: { key: `${siteId}:dashboard` } }).then(async scoped => scoped || this.configRepository.findOne({ where: { key: 'dashboard' } })),
    ]);

    const topProducts = await this.productRepository.find({
      where: { siteId, status: 'published' },
      order: { stock: 'DESC' },
      take: 4,
    });

    return {
      totalProducts,
      publishedProducts,
      totalCustomers: customers.length,
      customerValue: customers.reduce((sum, customer) => sum + Number(customer.totalAmount), 0),
      traffic: Array.isArray((dashboardConfig?.value as { traffic?: unknown[] } | undefined)?.traffic) ? (dashboardConfig?.value as { traffic: unknown[] }).traffic : [],
      topProducts: topProducts.map((p) => ({ name: p.nameEn, stock: p.stock, status: p.status })),
    };
  }
}
