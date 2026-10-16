import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { hashPassword, verifyPassword } from "./password.util";
import { TeamMember } from "../workspace/team-member.entity";

describe("AuthService", () => {
  let service: AuthService;
  let tenants: Record<string, jest.Mock>;
  let plans: Record<string, jest.Mock>;
  beforeAll(async () => {
    const user = {
      id: "user-1",
      phone: "13800000000",
      username: null,
      passwordHash: await hashPassword("TestTenant!Only2026"),
      role: "admin",
      status: "active",
      tenantId: "tenant-1",
      siteId: "site-1",
      lastLoginAt: null,
    };
    const jwt = {
      signAsync: jest.fn().mockResolvedValue("signed-token"),
    } as unknown as JwtService;
    const users = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockImplementation((value) => value),
      exist: jest.fn(),
    };
    tenants = {
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: "tenant-1",
          name: "Demo",
          plan: "trial",
          status: "active",
          expiresAt: null,
          permissions: [],
          permissionsCustomized: false,
        }),
      save: jest.fn().mockImplementation((value) => value),
    };
    plans = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((value) => value),
    };
    const cache = { getdel: jest.fn(), set: jest.fn() };
    service = new AuthService(
      jwt,
      {} as never,
      users as never,
      tenants as never,
      {} as never,
      plans as never,
      cache as never,
    );
  });
  beforeEach(() => jest.clearAllMocks());
  it("returns a tenant-scoped token for valid credentials", async () => {
    const result = await service.login({
      account: "13800000000",
      password: "TestTenant!Only2026",
    });
    expect(result.accessToken).toBe("signed-token");
    expect(result.user).toMatchObject({
      role: "admin",
      siteId: "site-1",
      tenantId: "tenant-1",
    });
  });
  it("rejects invalid credentials", async () => {
    await expect(
      service.login({ account: "13800000000", password: "incorrect-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it("rejects a valid team account when the owning tenant is suspended", async () => {
    tenants.findOne.mockResolvedValueOnce({ id: "tenant-1", status: "suspended" });
    await expect(service.login({ account: "13800000000", password: "TestTenant!Only2026" }))
      .rejects.toThrow("商户已被停用");
  });
  it("uses the administrator-configured trial permissions without resetting them", async () => {
    plans.findOne.mockResolvedValueOnce({
      code: "trial",
      enabled: true,
      permissions: ["menu.dashboard"],
    });
    const result = await service.login({
      account: "13800000000",
      password: "TestTenant!Only2026",
    });
    expect(result.tenant?.permissions).toEqual(["menu.dashboard"]);
    expect(plans.save).not.toHaveBeenCalled();
    expect(tenants.save).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: ["menu.dashboard"],
      }),
    );
  });
  it("does not add permissions that were removed from an ERP plan", async () => {
    tenants.findOne.mockResolvedValueOnce({
      id: "tenant-1",
      name: "Demo",
      plan: "erp",
      status: "active",
      expiresAt: null,
      permissions: ["group.sales", "group.purchase"],
      permissionsCustomized: false,
    });
    plans.findOne.mockResolvedValueOnce({
      code: "erp",
      enabled: true,
      permissions: ["group.sales", "group.purchase"],
    });

    const result = await service.login({
      account: "13800000000",
      password: "TestTenant!Only2026",
    });

    expect(result.tenant?.permissions).toEqual(["group.sales", "group.purchase"]);
    expect(plans.save).not.toHaveBeenCalled();
  });
});

describe("AuthService registration", () => {
  it("creates the tenant administrator team member in the registration transaction", async () => {
    const saved: Array<{ entity: unknown; value: Record<string, unknown> }> = [];
    const manager = {
      create: jest.fn((entity, value) => ({ ...value, __entity: entity })),
      save: jest.fn(async (entity, value) => {
        const result = { id: `${entity.name.toLowerCase()}-1`, ...value };
        saved.push({ entity, value: result });
        return result;
      }),
    };
    const dataSource = {
      transaction: jest.fn(async callback => callback(manager)),
      getRepository: jest.fn(),
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue("signed-token") };
    const users = { exist: jest.fn().mockResolvedValue(false) };
    const tenants = { save: jest.fn() };
    const plans = { findOne: jest.fn().mockResolvedValue(null) };
    const cache = { getdel: jest.fn().mockResolvedValue("ABCD"), set: jest.fn() };
    const service = new AuthService(
      jwt as never,
      dataSource as never,
      users as never,
      tenants as never,
      {} as never,
      plans as never,
      cache as never,
    );

    await service.register({
      phone: "13800000001",
      password: "TestTenant!Only2026",
      tenantName: "验收企业",
      captchaId: "captcha-1",
      captchaCode: "ABCD",
    });

    const member = saved.find(entry => entry.entity === TeamMember)?.value;
    expect(member).toMatchObject({
      userId: "user-1",
      tenantId: "tenant-1",
      siteId: "site-1",
      name: "验收企业",
      phone: "13800000001",
      role: "admin",
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});

describe("AuthService password changes", () => {
  it("verifies the current password and persists the new password hash", async () => {
    const user = { id: 'user-1', status: 'active', passwordHash: await hashPassword('12345678') };
    const users = { findOne: jest.fn().mockResolvedValue(user), save: jest.fn(async value => value) };
    const service = new AuthService({} as never, {} as never, users as never, {} as never, {} as never, {} as never, {} as never);
    await service.changePassword('user-1', { currentPassword: '12345678', newPassword: 'NewPassword123' });
    expect(await verifyPassword('NewPassword123', user.passwordHash)).toBe(true);
    expect(users.save).toHaveBeenCalledWith(user);
  });
});
