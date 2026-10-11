import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { ProductCategory } from './product-category.entity';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './product-category.dto';

export type ProductCategoryTreeNode = Omit<ProductCategory, 'parentCode'> & { parentCode: string | null; children: ProductCategoryTreeNode[] };

@Injectable()
export class ProductCategoryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ProductCategory) private readonly categories: Repository<ProductCategory>,
  ) {}

  async findTree(siteId: string): Promise<ProductCategoryTreeNode[]> {
    const entries = await this.categories.find({ where: { siteId }, order: { sort: 'ASC', createdAt: 'ASC' } });
    const build = (parentCode: string | null): ProductCategoryTreeNode[] => entries
      .filter(entry => entry.parentCode === parentCode)
      .map(entry => ({ ...entry, children: build(entry.code) }));
    return build(null);
  }

  async create(dto: CreateProductCategoryDto, tenantId: string, siteId: string): Promise<ProductCategory> {
    if (dto.parentCode && !(await this.categories.exist({ where: { siteId, code: dto.parentCode, parentCode: IsNull() } }))) {
      throw new BadRequestException('父级商品分类不存在');
    }
    const code = `cat_${randomUUID().replace(/-/g, '')}`;
    return this.categories.save(this.categories.create({ ...dto, code, tenantId, siteId, parentCode: dto.parentCode || null }));
  }

  async update(code: string, dto: UpdateProductCategoryDto, siteId: string): Promise<ProductCategory> {
    return this.dataSource.transaction(async manager => {
      const entry = await manager.findOne(ProductCategory, { where: { siteId, code } });
      if (!entry) throw new NotFoundException('商品分类不存在');
      Object.assign(entry, dto);
      return manager.save(ProductCategory, entry);
    });
  }

  async remove(code: string, siteId: string): Promise<void> {
    await this.dataSource.transaction(async manager => {
      const entry = await manager.findOne(ProductCategory, { where: { siteId, code } });
      if (!entry) throw new NotFoundException('商品分类不存在');
      const children = await manager.find(ProductCategory, { where: { siteId, parentCode: code } });
      const codes = [code, ...children.map(child => child.code)];
      const used = await manager.createQueryBuilder().from('products', 'product').where('product.site_id = :siteId', { siteId }).andWhere('product.category IN (:...codes)', { codes }).getCount();
      if (used > 0) throw new BadRequestException('该分类下存在商品，无法删除');
      if (children.length) await manager.remove(ProductCategory, children);
      await manager.remove(ProductCategory, entry);
    });
  }
}
