import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SavePlanDto, UpdateTenantControlDto } from './system.dto';

describe('system control DTOs', () => {
  it('accepts a normalized plan permission payload', async () => {
    const dto = plainToInstance(SavePlanDto, {
      name: '试用版',
      price: 0,
      currency: 'CNY',
      billingCycle: 'month',
      description: '',
      maxProducts: 20,
      maxMembers: 1,
      maxSites: 1,
      maxWarehouses: 1,
      features: {},
      permissions: ['group.products', 'menu.products', 'page.products'],
      enabled: true,
      sortOrder: 0,
    });

    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
  });

  it('transforms tenant quota values before validation', async () => {
    const dto = plainToInstance(UpdateTenantControlDto, {
      status: 'active',
      plan: 'trial',
      maxProducts: '20',
      maxMembers: '1',
      maxSites: '1',
      maxWarehouses: '1',
      permissions: ['group.products', 'menu.products'],
      permissionsCustomized: true,
    });

    expect(dto.maxProducts).toBe(20);
    expect(dto.maxMembers).toBe(1);
    expect(dto.maxSites).toBe(1);
    expect(dto.maxWarehouses).toBe(1);
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
  });
});
