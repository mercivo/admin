import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { hashPassword } from './password.util';

describe('AuthService', () => {
  let service: AuthService;
  beforeAll(async () => {
    const user = { id: 'user-1', phone: '13800000000', username: null, passwordHash: await hashPassword('TestTenant!Only2026'), role: 'admin', status: 'active', tenantId: 'tenant-1', siteId: 'site-1', lastLoginAt: null };
    const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') } as unknown as JwtService;
    const users = { findOne: jest.fn().mockResolvedValue(user), save: jest.fn().mockImplementation(value => value), exist: jest.fn() };
    const tenants = { findOne: jest.fn().mockResolvedValue({ id: 'tenant-1', name: 'Demo', plan: 'trial', status: 'active', expiresAt: null, permissions: [] }), save: jest.fn().mockImplementation(value => value) };
    const plans = { findOne: jest.fn() };
    const cache = { getdel: jest.fn(), set: jest.fn() };
    service = new AuthService(jwt, {} as never, users as never, tenants as never, {} as never, plans as never, cache as never);
  });
  it('returns a tenant-scoped token for valid credentials', async () => {
    const result = await service.login({ account: '13800000000', password: 'TestTenant!Only2026' });
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).toMatchObject({ role: 'admin', siteId: 'site-1', tenantId: 'tenant-1' });
  });
  it('rejects invalid credentials', async () => {
    await expect(service.login({ account: '13800000000', password: 'incorrect-password' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
