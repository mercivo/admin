import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let customers: Record<string, jest.Mock>;
  let levels: Record<string, jest.Mock>;

  beforeEach(() => {
    customers = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      exists: jest.fn().mockResolvedValue(false),
      createQueryBuilder: jest.fn(),
      create: jest.fn(value => value),
      save: jest.fn(value => Promise.resolve({ id: 'customer-1', ...value })),
      remove: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };
    levels = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn(value => value),
      save: jest.fn(value => Promise.resolve({ id: 'level-1', ...value })),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    service = new CustomerService(customers as never, levels as never, { findOne: jest.fn(), save: jest.fn() } as never);
  });

  it('lists customers only for the active site', async () => {
    await service.list('site-1');
    expect(customers.find).toHaveBeenCalledWith({ where: { siteId: 'site-1' }, order: { updatedAt: 'DESC' } });
  });

  it('creates a tenant and site scoped customer with a valid level', async () => {
    levels.exists.mockResolvedValue(true);
    const result = await service.create({ name: '张三', company: '示例公司', phone: '13800000001', level: 'lvl_a' }, 'tenant-1', 'site-1');
    expect(levels.exists).toHaveBeenCalledWith({ where: { siteId: 'site-1', code: 'lvl_a' } });
    expect(customers.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', level: 'lvl_a' }));
    expect(result.id).toBe('customer-1');
  });

  it('rejects a customer level from another site', async () => {
    await expect(service.create({ name: '张三', company: '示例公司', phone: '13800000001', level: 'foreign' }, 'tenant-1', 'site-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(customers.save).not.toHaveBeenCalled();
  });

  it('updates and deletes only customers in the active site', async () => {
    const customer = { id: 'customer-1', siteId: 'site-1', name: '旧名称', level: '' };
    customers.createQueryBuilder.mockReturnValue({ addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(customer) });
    customers.findOne.mockResolvedValue(customer);
    await service.update('customer-1', { name: '新名称', company: '示例公司', phone: '13800000001', level: '' }, 'site-1');
    expect(customers.save).toHaveBeenCalledWith(expect.objectContaining({ name: '新名称' }));
    await service.remove('customer-1', 'site-1');
    expect(customers.findOne).toHaveBeenLastCalledWith({ where: { id: 'customer-1', siteId: 'site-1' } });
    expect(customers.remove).toHaveBeenCalledWith(customer);
  });

  it('returns not found when a customer is outside the active site', async () => {
    customers.findOne.mockResolvedValue(null);
    customers.createQueryBuilder.mockReturnValue({ addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null) });
    await expect(service.update('foreign', { name: '名称', company: '公司', phone: '13800000001' }, 'site-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('foreign', 'site-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a custom level with normalized data and unique code', async () => {
    const result = await service.createLevel({ name: '  重点客户  ', note: '  重点跟进  ' }, 'tenant-1', 'site-1');
    expect(result).toMatchObject({ name: '重点客户', note: '重点跟进', tenantId: 'tenant-1', siteId: 'site-1' });
    expect(result.code).toMatch(/^lvl_[a-f0-9]{20}$/);
  });

  it('rejects duplicate level names in the same site', async () => {
    levels.exists.mockResolvedValue(true);
    await expect(service.createLevel({ name: '重点客户' }, 'tenant-1', 'site-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a level and prevents duplicate names', async () => {
    levels.findOne.mockResolvedValueOnce({ id: 'level-1', siteId: 'site-1', name: '旧等级', note: '' }).mockResolvedValueOnce({ id: 'level-2', siteId: 'site-1', name: '重复等级' });
    await expect(service.updateLevel('level-1', { name: '重复等级' }, 'site-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('clears customer assignments before deleting a level', async () => {
    const level = { id: 'level-1', siteId: 'site-1', code: 'lvl_a', name: '重点客户' };
    levels.findOne.mockResolvedValue(level);
    await service.removeLevel('level-1', 'site-1');
    expect(customers.update).toHaveBeenCalledWith({ siteId: 'site-1', level: 'lvl_a' }, { level: '' });
    expect(levels.remove).toHaveBeenCalledWith(level);
  });
});
