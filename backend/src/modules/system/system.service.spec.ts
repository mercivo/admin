import { SystemService } from "./system.service";
import { TRIAL_PERMISSIONS } from "./permission-catalog";
import { User } from "../auth/user.entity";
import { verifyPassword } from "../auth/password.util";

describe("SystemService default plans", () => {
  it("creates the annual standard plan with full permissions and requested quotas", async () => {
    const saved: any[] = [];
    const plans = { findOne: jest.fn().mockResolvedValueOnce({ code: 'trial' }).mockResolvedValueOnce(null), create: jest.fn(value => value), save: jest.fn(async value => { saved.push(value); return value; }) };
    const service = new SystemService({} as never, {} as never, {} as never, plans as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    await service.ensureDefaultPlans();
    expect(saved).toContainEqual(expect.objectContaining({ code: 'standard', name: '标准版', price: 1680, billingCycle: 'year', maxProducts: 50, maxMembers: 5, maxWarehouses: 3, enabled: true }));
    expect(saved[0].permissions.length).toBeGreaterThan(20);
  });
  it("preserves an administrator's customized trial-plan permissions", async () => {
    const trial = { code: "trial", permissions: ["menu.dashboard"] };
    const plans = {
      findOne: jest.fn().mockResolvedValue(trial),
      save: jest.fn(async (value) => value),
    };
    const tenants = {
      find: jest.fn(),
      save: jest.fn(),
    };
    const unusedRepository = {};
    const service = new SystemService(
      tenants as never,
      unusedRepository as never,
      unusedRepository as never,
      plans as never,
      unusedRepository as never,
      unusedRepository as never,
      unusedRepository as never,
      unusedRepository as never,
      unusedRepository as never,
    );

    await service.ensureDefaultPlans();

    expect(plans.save).not.toHaveBeenCalled();
    expect(trial.permissions).toEqual(["menu.dashboard"]);
    expect(tenants.save).not.toHaveBeenCalled();
  });

  it("propagates saved permissions to tenants that follow the plan", async () => {
    const plan = { id: "plan-1", code: "erp", name: "ERP", maxProducts: 10, maxMembers: 2, maxWarehouses: 1, features: {}, permissions: ["group.sales"], enabled: true };
    const inheritedTenant = { id: "tenant-1", plan: "erp", maxProducts: 10, maxMembers: 2, maxWarehouses: 1, permissions: ["group.sales"], permissionsCustomized: false };
    const customizedTenant = { id: "tenant-2", plan: "erp", maxProducts: 10, maxMembers: 2, maxWarehouses: 1, permissions: ["group.sales"], permissionsCustomized: true };
    const plans = {
      findOne: jest.fn().mockResolvedValue(plan),
      save: jest.fn(async (value) => value),
    };
    const tenants = {
      find: jest.fn().mockResolvedValue([inheritedTenant, customizedTenant]),
      merge: jest.fn((target, source) => Object.assign(target, source)),
      save: jest.fn(async (value) => value),
    };
    const unusedRepository = {};
    const service = new SystemService(
      tenants as never,
      unusedRepository as never,
      unusedRepository as never,
      plans as never,
      unusedRepository as never,
      unusedRepository as never,
      unusedRepository as never,
      unusedRepository as never,
      unusedRepository as never,
    );

    await service.updatePlan("plan-1", {
      name: "ERP", price: 0, currency: "CNY", billingCycle: "month", description: "", maxProducts: 10,
      maxMembers: 2, maxWarehouses: 1, features: {}, permissions: ["page.dashboard"], enabled: true, sortOrder: 0,
    });

    expect(tenants.save).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: "tenant-1", permissions: ["menu.dashboard", "page.dashboard"] }),
    ]));
    expect(customizedTenant.permissions).toEqual(["group.sales"]);
  });

  it("creates tenant resources with the standard initial password and can reset it", async () => {
    const saved: Array<{ entity: unknown; value: any }> = [];
    const manager = { create: jest.fn((entity, value) => ({ ...value, __entity: entity })), save: jest.fn(async (entity, value) => { const result = { id: `${entity.name.toLowerCase()}-1`, ...value }; saved.push({ entity, value: result }); return result; }) };
    const tenantRepo = { manager: { transaction: jest.fn(async callback => callback(manager)) }, findOne: jest.fn().mockResolvedValue({ id: 'tenant-1' }) };
    const administrator = { id: 'user-1', tenantId: 'tenant-1', role: 'admin', phone: '13800000000', username: null, passwordHash: 'old' };
    const users = { exist: jest.fn().mockResolvedValue(false), findOne: jest.fn().mockResolvedValue(administrator), save: jest.fn(async value => value) };
    const plans = { findOne: jest.fn().mockResolvedValue({ code: 'standard', enabled: true, maxProducts: 50, maxMembers: 5, maxWarehouses: 3, features: {}, permissions: ['page.dashboard'] }) };
    const service = new SystemService(tenantRepo as never, {} as never, users as never, plans as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    const created = await service.createTenant({ name: '新租户', phone: '13800000000', plan: 'standard' });
    const createdUser = saved.find(entry => entry.entity === User)?.value;
    expect(created).toMatchObject({ account: '13800000000', initialPassword: '12345678' });
    expect(await verifyPassword('12345678', createdUser.passwordHash)).toBe(true);
    const reset = await service.resetTenantPassword('tenant-1');
    expect(reset.initialPassword).toBe('12345678');
    expect(await verifyPassword('12345678', administrator.passwordHash)).toBe(true);
  });
});
