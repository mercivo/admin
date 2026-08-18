import { LeadService } from './lead.service';

describe('LeadService conversion chain', () => {
  it('converts one site lead into a linked customer and opportunity atomically', async () => {
    const lead = { id: 'lead-1', tenantId: 'tenant-1', siteId: 'site-1', name: 'Alice', company: 'Buyer Ltd', email: 'alice@example.com', phone: '+1 555 0100', country: 'US', product: 'Bag', summary: 'MOQ 500', score: 70, assignedTo: 'owner', status: 'new' };
    const customerRepo = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn(value => value), save: jest.fn(async value => ({ id: 'customer-1', ...value })) };
    const opportunityRepo = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn(value => value), save: jest.fn(async value => ({ id: 'opportunity-1', ...value })) };
    const transactionalLeadRepo = { save: jest.fn(async value => value) };
    const manager = { getRepository: jest.fn(entity => entity.name === 'Customer' ? customerRepo : entity.name === 'Opportunity' ? opportunityRepo : transactionalLeadRepo) };
    const leadRepo = { findOne: jest.fn().mockResolvedValue(lead), manager: { transaction: jest.fn(async callback => callback(manager)) } };
    const service = new LeadService(leadRepo as never, {} as never);

    const result = await service.convertToCustomer('lead-1', 'tenant-1', 'site-1');

    expect(result.customer.id).toBe('customer-1');
    expect(result.opportunity).toMatchObject({ id: 'opportunity-1', sourceLeadId: 'lead-1', customerId: 'customer-1', siteId: 'site-1' });
    expect(result.lead.status).toBe('converted');
    expect(leadRepo.manager.transaction).toHaveBeenCalledTimes(1);
  });

  it('reuses an existing customer and linked opportunity on repeated conversion', async () => {
    const lead = { id: 'lead-1', siteId: 'site-1', name: 'Alice', company: 'Buyer Ltd', email: 'alice@example.com', phone: '', country: 'US', product: 'Bag', summary: '', score: 50, assignedTo: '', status: 'converted' };
    const customer = { id: 'customer-1' };
    const opportunity = { id: 'opportunity-1', sourceLeadId: 'lead-1', customerId: 'customer-1' };
    const customerRepo = { findOne: jest.fn().mockResolvedValue(customer), create: jest.fn(), save: jest.fn() };
    const opportunityRepo = { findOne: jest.fn().mockResolvedValue(opportunity), create: jest.fn(), save: jest.fn() };
    const transactionalLeadRepo = { save: jest.fn(async value => value) };
    const manager = { getRepository: jest.fn(entity => entity.name === 'Customer' ? customerRepo : entity.name === 'Opportunity' ? opportunityRepo : transactionalLeadRepo) };
    const leadRepo = { findOne: jest.fn().mockResolvedValue(lead), manager: { transaction: jest.fn(async callback => callback(manager)) } };
    const service = new LeadService(leadRepo as never, {} as never);

    const result = await service.convertToCustomer('lead-1', 'tenant-1', 'site-1');

    expect(result).toMatchObject({ customer, opportunity });
    expect(customerRepo.save).not.toHaveBeenCalled();
    expect(opportunityRepo.save).not.toHaveBeenCalled();
  });
});
