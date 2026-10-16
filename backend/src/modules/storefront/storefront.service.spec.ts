import { StorefrontService } from './storefront.service';

const builder = (result: unknown) => {
  const value: Record<string, jest.Mock> = {};
  for (const method of ['where', 'andWhere', 'select', 'addSelect', 'groupBy', 'orderBy', 'skip', 'take']) value[method] = jest.fn(() => value);
  value.getManyAndCount = jest.fn().mockResolvedValue(result);
  value.getRawMany = jest.fn().mockResolvedValue(result);
  return value;
};

describe('StorefrontService product pool', () => {
  it('returns only synced products with a read-only category tree', async () => {
    const listBuilder = builder([[{ id: 'product-1', status: 'published', category: 'child' }], 1]);
    const countBuilder = builder([{ category: 'child', count: '1' }]);
    const productRepository = { createQueryBuilder: jest.fn().mockReturnValueOnce(listBuilder).mockReturnValueOnce(countBuilder) };
    const categoryRepository = { find: jest.fn().mockResolvedValue([
      { code: 'parent', label: '一级分类', parentCode: null, status: 'enabled', sort: 1 },
      { code: 'child', label: '二级分类', parentCode: 'parent', status: 'enabled', sort: 1 },
    ]) };
    const service = new StorefrontService(productRepository as never, categoryRepository as never, {} as never, {} as never, {} as never);

    const result = await service.productPool({ page: 1, pageSize: 20, category: 'parent,child' } as never, 'site-1');

    expect(listBuilder.andWhere).toHaveBeenCalledWith('product.status = :status', { status: 'published' });
    expect(listBuilder.andWhere).toHaveBeenCalledWith('product.category IN (:...categories)', { categories: ['parent', 'child'] });
    expect(countBuilder.andWhere).toHaveBeenCalledWith('product.status = :status', { status: 'published' });
    expect(result.summary.totalProducts).toBe(1);
    expect(result.categories[0]).toMatchObject({ code: 'parent', children: [expect.objectContaining({ code: 'child' })] });
  });
});

describe('StorefrontService inquiry leads', () => {
  const dto = { name: ' 张三 ', contact: ' buyer@example.com 或 13800000000 ', requirements: ' 采购 100 件 ' };

  it('stores public inquiries in the ERP lead pool as a new lead', async () => {
    const leadRepository = { create: jest.fn(value => value), save: jest.fn(value => Promise.resolve({ id: 'lead-1', ...value })) };
    const siteService = { resolvePublicSite: jest.fn().mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1' }) };
    const service = new StorefrontService({} as never, {} as never, leadRepository as never, {} as never, siteService as never);

    const result = await service.createLead('shop.example.com', undefined, dto);

    expect(result).toMatchObject({ tenantId: 'tenant-1', siteId: 'site-1', status: 'new', name: '张三', contact: 'buyer@example.com 或 13800000000', email: '', phone: '', requirements: '采购 100 件' });
  });

  it('stores manually created leads through the same persistence path', async () => {
    const leadRepository = { create: jest.fn(value => value), save: jest.fn(value => Promise.resolve({ id: 'lead-2', ...value })) };
    const service = new StorefrontService({} as never, {} as never, leadRepository as never, {} as never, {} as never);

    const result = await service.createManagedLead(dto, 'tenant-1', 'site-1');

    expect(result).toMatchObject({ tenantId: 'tenant-1', siteId: 'site-1', status: 'new' });
    expect(leadRepository.save).toHaveBeenCalledTimes(1);
  });

  it('limits non-admin lead queries to the signed-in assignee', async () => {
    const leadBuilder = builder([[], 0]);
    const service = new StorefrontService({} as never, {} as never, { createQueryBuilder: jest.fn(() => leadBuilder) } as never, {} as never, {} as never);

    await service.listLeads({ page: 1, pageSize: 20 } as never, { userId: 'member-1', role: 'member', siteId: 'site-1' } as never);

    expect(leadBuilder.andWhere).toHaveBeenCalledWith('lead.assigned_to_user_id = :assignedToUserId', { assignedToUserId: 'member-1' });
  });

  it('still limits members with assignment permission to their own leads', async () => {
    const leadBuilder = builder([[], 0]);
    const service = new StorefrontService({} as never, {} as never, { createQueryBuilder: jest.fn(() => leadBuilder) } as never, {} as never, {} as never);

    await service.listLeads({ page: 1, pageSize: 20 } as never, { userId: 'dispatcher-1', role: 'member', siteId: 'site-1', permissions: ['storefront.lead.assign'] } as never);

    expect(leadBuilder.andWhere).toHaveBeenCalledWith('lead.assigned_to_user_id = :assignedToUserId', { assignedToUserId: 'dispatcher-1' });
  });

  it('lets administrators see all leads regardless of action permissions', async () => {
    const leadBuilder = builder([[], 0]);
    const service = new StorefrontService({} as never, {} as never, { createQueryBuilder: jest.fn(() => leadBuilder) } as never, {} as never, {} as never);

    await service.listLeads({ page: 1, pageSize: 20 } as never, { userId: 'admin-1', role: 'admin', siteId: 'site-1', permissions: [] } as never);

    expect(leadBuilder.andWhere).not.toHaveBeenCalledWith('lead.assigned_to_user_id = :assignedToUserId', expect.anything());
  });

  it('keeps assignment and later processing as separate permissions', async () => {
    const lead = { id: 'lead-1', siteId: 'site-1', status: 'new', assignedToUserId: 'dispatcher-1', assignedToName: '指派员', note: null };
    const leadRepository = { findOne: jest.fn().mockResolvedValue(lead), save: jest.fn(value => Promise.resolve(value)) };
    const teamRepository = { findOne: jest.fn().mockResolvedValue({ userId: 'dispatcher-1', siteId: 'site-1', name: '指派员', role: 'member', permissions: ['storefront.lead.assign'] }) };
    const service = new StorefrontService({} as never, {} as never, leadRepository as never, teamRepository as never, {} as never);
    const dispatcher = { userId: 'dispatcher-1', role: 'member', siteId: 'site-1', permissions: ['storefront.lead.assign'] } as never;

    await expect(service.updateLead('lead-1', { status: 'following', note: '开始跟进' }, dispatcher)).resolves.toMatchObject({ status: 'following', assignedToUserId: 'dispatcher-1', assignedToName: '指派员' });
    await expect(service.updateLead('lead-1', { status: 'converted', note: '确认转化' }, dispatcher)).rejects.toThrow('无跟进和处理线索权限');
  });

  it('renders administrator candidates as 管理员 instead of the enterprise name', async () => {
    const teamRepository = { find: jest.fn().mockResolvedValue([{ userId: 'admin-1', siteId: 'site-1', name: '某某企业', role: 'admin', permissions: [] }]) };
    const service = new StorefrontService({} as never, {} as never, {} as never, teamRepository as never, {} as never);

    await expect(service.leadAssignees({ userId: 'admin-1', role: 'admin', tenantId: 'tenant-1', siteId: 'site-1' } as never))
      .resolves.toMatchObject({ currentUserId: 'admin-1', members: [{ userId: 'admin-1', name: '管理员', role: 'admin' }] });
  });

  it('lists all project members and never offers the administrator to non-admins', async () => {
    const members = [
      { userId: 'admin-1', siteId: 'site-1', name: '某某企业', role: 'admin', permissions: [] },
      { userId: 'assign-1', siteId: 'site-1', name: '指派成员', role: 'member', permissions: ['storefront.lead.assign'] },
      { userId: 'manage-1', siteId: 'site-1', name: '处理成员', role: 'member', permissions: ['storefront.lead.manage'] },
      { userId: 'plain-1', siteId: 'site-1', name: '普通成员', role: 'member', permissions: [] },
    ];
    const teamRepository = { find: jest.fn().mockResolvedValue(members) };
    const service = new StorefrontService({} as never, {} as never, {} as never, teamRepository as never, {} as never);

    const adminResult = await service.leadAssignees({ userId: 'admin-1', role: 'admin', tenantId: 'tenant-1', siteId: 'site-1', permissions: ['storefront.lead.assign'] } as never);
    expect(adminResult.members.map(member => member.userId)).toEqual(['admin-1', 'assign-1', 'manage-1', 'plain-1']);
    const memberResult = await service.leadAssignees({ userId: 'assign-1', role: 'member', tenantId: 'tenant-1', siteId: 'site-1', permissions: ['storefront.lead.assign'] } as never);
    expect(memberResult.members.map(member => member.userId)).toEqual(['assign-1', 'manage-1', 'plain-1']);
  });

  it('requires notes for follow-up and allows assigning any ordinary project member', async () => {
    const lead = { id: 'lead-1', siteId: 'site-1', status: 'new', assignedToUserId: null, note: null };
    const leadRepository = { findOne: jest.fn().mockResolvedValue(lead), save: jest.fn(value => Promise.resolve(value)) };
    const teamRepository = { findOne: jest.fn().mockResolvedValue({ userId: 'member-1', siteId: 'site-1', name: '业务员', role: 'member', permissions: ['storefront.lead.assign'] }) };
    const service = new StorefrontService({} as never, {} as never, leadRepository as never, teamRepository as never, {} as never);

    const admin = { userId: 'admin-1', role: 'admin', siteId: 'site-1', permissions: ['storefront.lead.assign'] } as never;
    await expect(service.updateLead('lead-1', { status: 'following', assigneeUserId: 'member-1', note: '' }, admin)).rejects.toThrow('请填写备注信息');
    const result = await service.updateLead('lead-1', { status: 'following', assigneeUserId: 'member-1', note: '电话沟通报价' }, admin);
    expect(result).toMatchObject({ status: 'following', assignedToUserId: 'member-1', assignedToName: '业务员', note: '电话沟通报价' });
  });

  it('allows an administrator to self-assign even while legacy data is missing a team-member row', async () => {
    const lead = { id: 'lead-1', siteId: 'site-1', status: 'new', assignedToUserId: null, assignedToName: '', note: null };
    const leadRepository = { findOne: jest.fn().mockResolvedValue(lead), save: jest.fn(value => Promise.resolve(value)) };
    const teamRepository = { findOne: jest.fn() };
    const service = new StorefrontService({} as never, {} as never, leadRepository as never, teamRepository as never, {} as never);
    const admin = { userId: 'admin-1', role: 'admin', tenantId: 'tenant-1', siteId: 'site-1', permissions: ['storefront.lead.assign', 'storefront.lead.manage'] } as never;

    await expect(service.updateLead('lead-1', { status: 'following', note: '管理员开始跟进' }, admin))
      .resolves.toMatchObject({ status: 'following', assignedToUserId: 'admin-1', assignedToName: '管理员' });
    expect(teamRepository.findOne).not.toHaveBeenCalled();
  });

  it('allows assigning members without lead execution permission and requires a close reason', async () => {
    const lead = { id: 'lead-1', siteId: 'site-1', status: 'new', assignedToUserId: null, note: null, closeReason: null };
    const leadRepository = { findOne: jest.fn().mockResolvedValue(lead), save: jest.fn(value => Promise.resolve(value)) };
    const teamRepository = { findOne: jest.fn().mockResolvedValue({ userId: 'member-2', siteId: 'site-1', name: '无权限成员', role: 'member', permissions: ['page.storefront.leads'] }) };
    const service = new StorefrontService({} as never, {} as never, leadRepository as never, teamRepository as never, {} as never);
    const admin = { userId: 'admin-1', role: 'admin', siteId: 'site-1', permissions: ['storefront.lead.assign', 'storefront.lead.manage'] } as never;

    await expect(service.updateLead('lead-1', { status: 'following', assigneeUserId: 'member-2', note: '准备跟进' }, admin))
      .resolves.toMatchObject({ status: 'following', assignedToUserId: 'member-2', assignedToName: '无权限成员' });
    lead.status = 'new';
    await expect(service.updateLead('lead-1', { status: 'closed', closeReason: '' }, admin)).rejects.toThrow('请填写关闭原因');
    const result = await service.updateLead('lead-1', { status: 'closed', closeReason: '客户取消采购' }, admin);
    expect(result).toMatchObject({ status: 'closed', closeReason: '客户取消采购' });
  });

  it('does not bypass action permissions for administrators', async () => {
    const lead = { id: 'lead-1', siteId: 'site-1', status: 'new', assignedToUserId: null, note: null };
    const leadRepository = { findOne: jest.fn().mockResolvedValue(lead), save: jest.fn(value => Promise.resolve(value)) };
    const service = new StorefrontService({} as never, {} as never, leadRepository as never, {} as never, {} as never);
    const admin = { userId: 'admin-1', role: 'admin', siteId: 'site-1', permissions: ['page.storefront.leads'] } as never;

    await expect(service.updateLead('lead-1', { status: 'following', note: '开始跟进' }, admin)).rejects.toThrow('无跟进和指派权限');
  });

  it('prevents non-admins from assigning a lead back to the administrator', async () => {
    const lead = { id: 'lead-1', siteId: 'site-1', status: 'new', assignedToUserId: 'member-1', note: null };
    const leadRepository = { findOne: jest.fn().mockResolvedValue(lead), save: jest.fn(value => Promise.resolve(value)) };
    const teamRepository = { findOne: jest.fn().mockResolvedValue({ userId: 'admin-1', siteId: 'site-1', name: '企业名', role: 'admin', permissions: ['storefront.lead.assign'] }) };
    const service = new StorefrontService({} as never, {} as never, leadRepository as never, teamRepository as never, {} as never);
    const member = { userId: 'member-1', role: 'member', siteId: 'site-1', permissions: ['storefront.lead.assign'] } as never;

    await expect(service.updateLead('lead-1', { status: 'following', assigneeUserId: 'admin-1', note: '转交管理员' }, member))
      .rejects.toThrow('普通成员不能将线索指派给管理员');
  });

  it('does not let manage-only members reassign an existing lead', async () => {
    const lead = { id: 'lead-1', siteId: 'site-1', status: 'following', assignedToUserId: 'member-1', note: null };
    const leadRepository = { findOne: jest.fn().mockResolvedValue(lead), save: jest.fn(value => Promise.resolve(value)) };
    const service = new StorefrontService({} as never, {} as never, leadRepository as never, {} as never, {} as never);
    const member = { userId: 'member-1', role: 'member', siteId: 'site-1', permissions: ['storefront.lead.manage'] } as never;

    await expect(service.updateLead('lead-1', { status: 'following', assigneeUserId: 'member-2', note: '转交其他成员' }, member))
      .rejects.toThrow('无跟进和指派权限');
  });

  it('lets manage-only members start following a lead already assigned to them without reassigning it', async () => {
    const lead = { id: 'lead-1', siteId: 'site-1', status: 'new', assignedToUserId: 'member-1', assignedToName: '处理成员', note: null };
    const leadRepository = { findOne: jest.fn().mockResolvedValue(lead), save: jest.fn(value => Promise.resolve(value)) };
    const teamRepository = { findOne: jest.fn() };
    const service = new StorefrontService({} as never, {} as never, leadRepository as never, teamRepository as never, {} as never);
    const member = { userId: 'member-1', role: 'member', siteId: 'site-1', permissions: ['storefront.lead.manage'] } as never;

    await expect(service.updateLead('lead-1', { status: 'following', note: '开始联系客户' }, member))
      .resolves.toMatchObject({ status: 'following', assignedToUserId: 'member-1', assignedToName: '处理成员' });
    expect(teamRepository.findOne).not.toHaveBeenCalled();
  });

  it('allows closing only new or following leads', async () => {
    const lead = { id: 'lead-1', siteId: 'site-1', status: 'converted', assignedToUserId: 'member-1', note: null, closeReason: null };
    const leadRepository = { findOne: jest.fn().mockResolvedValue(lead), save: jest.fn(value => Promise.resolve(value)) };
    const service = new StorefrontService({} as never, {} as never, leadRepository as never, {} as never, {} as never);
    const member = { userId: 'member-1', role: 'member', siteId: 'site-1', permissions: ['storefront.lead.manage'] } as never;

    await expect(service.updateLead('lead-1', { status: 'closed', closeReason: '不应允许' }, member))
      .rejects.toThrow('只有新线索或跟进中的线索可以关闭');
    expect(leadRepository.save).not.toHaveBeenCalled();
  });
});
