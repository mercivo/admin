import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCustomerDto, CreateCustomerLevelDto } from './customer.dto';

describe('CreateCustomerDto', () => {
  it('accepts only customer profile fields exposed by customer management', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      name: '示例企业', email: 'hello@example.com', phone: '13800000001',
      level: 'lvl_a', country: '中国', status: 'active', notes: '重点客户',
    });
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
  });

  it.each(['company', 'orders', 'totalAmount', 'lastOrderAt'])('rejects client-managed field %s', async field => {
    const dto = plainToInstance(CreateCustomerDto, { name: '示例客户', [field]: field === 'company' ? '企业' : 1 });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some(error => error.property === field)).toBe(true);
  });

  it('allows optional contact fields to be omitted', async () => {
    const dto = plainToInstance(CreateCustomerDto, { name: '仅名称客户' });
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
  });
});

describe('CreateCustomerLevelDto', () => {
  it.each([95, 100, 125.5])('accepts a positive price percentage: %s', async discountRate => {
    const dto = plainToInstance(CreateCustomerLevelDto, { name: '重点客户', discountRate });
    expect(await validate(dto)).toEqual([]);
  });

  it.each([0, -1])('rejects a non-positive price percentage: %s', async discountRate => {
    const dto = plainToInstance(CreateCustomerLevelDto, { name: '重点客户', discountRate });
    expect(await validate(dto)).not.toEqual([]);
  });

  it('allows the discount policy to be left unconfigured', async () => {
    const dto = plainToInstance(CreateCustomerLevelDto, { name: '普通客户', discountRate: null });
    expect(await validate(dto)).toEqual([]);
  });
});
