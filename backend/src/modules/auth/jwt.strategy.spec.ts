import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy plan permissions", () => {
  const activeIat = () => Math.floor(Date.now() / 1000) - 60;
  it("keeps administrator-configured ERP permissions for an existing session", async () => {
    const user = {
      id: "user-1",
      role: "admin",
      status: "active",
      tenantId: "tenant-1",
      permissions: [],
    };
    const tenant = {
      id: "tenant-1",
      plan: "erp",
      status: "active",
      expiresAt: null,
      permissions: ["group.sales", "group.purchase"],
      permissionsCustomized: false,
    };
    const plan = {
      code: "erp",
      enabled: true,
      permissions: ["group.sales", "group.purchase"],
    };
    const users = { findOne: jest.fn().mockResolvedValue(user) };
    const tenants = {
      findOne: jest.fn().mockResolvedValue(tenant),
      save: jest.fn(async (value) => value),
    };
    const plans = {
      findOne: jest.fn().mockResolvedValue(plan),
      save: jest.fn(async (value) => value),
    };
    const config = { get: jest.fn().mockReturnValue("test-secret") } as unknown as ConfigService;
    const strategy = new JwtStrategy(config, users as never, tenants as never, plans as never);

    const result = await strategy.validate({
      sub: "user-1",
      account: "admin",
      role: "admin",
      tenantId: "tenant-1",
      siteId: "site-1",
      iat: activeIat(),
    });

    expect(result.permissions).toEqual(["group.sales", "group.purchase"]);
    expect(plans.save).not.toHaveBeenCalled();
    expect(tenants.save).not.toHaveBeenCalled();
  });

  it("does not overwrite explicitly customized tenant permissions", async () => {
    const users = { findOne: jest.fn().mockResolvedValue({ id: "user-1", role: "admin", status: "active", tenantId: "tenant-1", permissions: [] }) };
    const tenant = { id: "tenant-1", plan: "erp", status: "active", expiresAt: null, permissions: ["group.sales"], permissionsCustomized: true };
    const tenants = { findOne: jest.fn().mockResolvedValue(tenant), save: jest.fn() };
    const plans = { findOne: jest.fn(), save: jest.fn() };
    const config = { get: jest.fn().mockReturnValue("test-secret") } as unknown as ConfigService;
    const strategy = new JwtStrategy(config, users as never, tenants as never, plans as never);

    const result = await strategy.validate({ sub: "user-1", account: "admin", role: "admin", tenantId: "tenant-1", siteId: "site-1", iat: activeIat() });

    expect(result.permissions).toEqual(["group.sales"]);
    expect(plans.findOne).not.toHaveBeenCalled();
    expect(tenants.save).not.toHaveBeenCalled();
  });

  it("rejects every team member session when its tenant is suspended", async () => {
    const users = { findOne: jest.fn().mockResolvedValue({ id: "member-1", role: "member", status: "active", tenantId: "tenant-1", permissions: ["page.dashboard"] }) };
    const tenants = { findOne: jest.fn().mockResolvedValue({ id: "tenant-1", status: "suspended" }), save: jest.fn() };
    const config = { get: jest.fn().mockReturnValue("test-secret") } as unknown as ConfigService;
    const strategy = new JwtStrategy(config, users as never, tenants as never, {} as never);

    await expect(strategy.validate({ sub: "member-1", account: "member@example.com", role: "member", tenantId: "tenant-1", siteId: "site-1", iat: activeIat() }))
      .rejects.toThrow("商户已停用");
  });

  it.each([
    ['missing', undefined],
    ['invalid', Number.NaN],
    ['future', Math.floor(Date.now() / 1000) + 60],
    ['older than 24 hours', Math.floor(Date.now() / 1000) - 24 * 60 * 60],
  ])('rejects a %s issued-at claim before querying account data', async (_label, iat) => {
    const users = { findOne: jest.fn() };
    const config = { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService;
    const strategy = new JwtStrategy(config, users as never, {} as never, {} as never);

    await expect(strategy.validate({ sub: 'user-1', account: 'admin', role: 'admin', tenantId: null, siteId: null, iat }))
      .rejects.toThrow('登录已失效，请重新登录');
    expect(users.findOne).not.toHaveBeenCalled();
  });
});
