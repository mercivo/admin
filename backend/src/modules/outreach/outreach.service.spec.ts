import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OutreachService } from './outreach.service';

describe('OutreachService', () => {
  const campaigns = { find: jest.fn(), findOne: jest.fn(), create: jest.fn((value) => value), save: jest.fn(async value => value), remove: jest.fn() };
  const customers = { count: jest.fn() };
  const leads = { count: jest.fn() };
  const service = new OutreachService(campaigns as never, customers as never, leads as never);
  beforeEach(() => jest.clearAllMocks());

  it('scopes campaign reads to the active site', async () => {
    campaigns.find.mockResolvedValue([]);
    await service.list('site-1');
    expect(campaigns.find).toHaveBeenCalledWith({ where: { siteId: 'site-1' }, order: { updatedAt: 'DESC' } });
  });

  it('captures current customer count when creating a campaign', async () => {
    customers.count.mockResolvedValue(8);
    const result = await service.create({ name: 'EU buyers', audienceType: 'customers', audienceLabel: 'EU', subject: 'Hello', content: 'Body' }, 'tenant-1', 'site-1', 'user-1');
    expect(result).toMatchObject({ tenantId: 'tenant-1', siteId: 'site-1', recipientCount: 8, status: 'draft' });
    expect(customers.count).toHaveBeenCalledWith({ where: { siteId: 'site-1', status: 'active' } });
  });

  it('rejects scheduling when the active audience is empty', async () => {
    campaigns.findOne.mockResolvedValue({ id: 'campaign-1', siteId: 'site-1', subject: 'Hello', content: 'Body', audienceType: 'leads' });
    leads.count.mockResolvedValue(0);
    await expect(service.schedule('campaign-1', { scheduledAt: new Date(Date.now() + 60000) }, 'site-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not access a campaign belonging to another site', async () => {
    campaigns.findOne.mockResolvedValue(null);
    await expect(service.update('campaign-1', { name: 'changed' }, 'site-2')).rejects.toBeInstanceOf(NotFoundException);
    expect(campaigns.findOne).toHaveBeenCalledWith({ where: { id: 'campaign-1', siteId: 'site-2' } });
  });
});
