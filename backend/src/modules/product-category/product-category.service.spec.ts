import { ProductCategoryService } from './product-category.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductCategoryDto } from './product-category.dto';

describe('ProductCategoryService', () => {
  it('generates an internal category code when creating a category', async () => {
    const categories = {
      exist: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockImplementation(value => value),
      save: jest.fn().mockImplementation(value => Promise.resolve({ id: 'generated-id', ...value })),
    };
    const service = new ProductCategoryService({} as never, categories as never);

    const created = await service.create({ label: '旅行箱包', sort: 1, status: 'enabled', remark: '', parentCode: 'parent-code' }, 'tenant-1', 'site-1');

    expect(created.id).toBe('generated-id');
    expect(created.code).toMatch(/^cat_[a-f0-9]{32}$/);
    expect(categories.create).toHaveBeenCalledWith(expect.objectContaining({ label: '旅行箱包', code: created.code, tenantId: 'tenant-1', siteId: 'site-1' }));
  });

  it('does not accept a category code from the public create payload', async () => {
    const dto = plainToInstance(CreateProductCategoryDto, { label: '旅行箱包', code: 'public-code' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some(error => error.property === 'code')).toBe(true);
  });
});
