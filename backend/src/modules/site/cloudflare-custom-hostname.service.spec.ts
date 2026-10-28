import { ServiceUnavailableException } from '@nestjs/common';
import { CloudflareCustomHostnameService } from './cloudflare-custom-hostname.service';

describe('CloudflareCustomHostnameService', () => {
  const config = { get: jest.fn((key: string) => ({ CLOUDFLARE_API_TOKEN: 'token', CLOUDFLARE_SAAS_ZONE_ID: 'zone' })[key]) };
  const service = new CloudflareCustomHostnameService(config as any);
  const originalFetch = global.fetch;

  afterEach(() => { global.fetch = originalFetch; jest.clearAllMocks(); });

  it('reuses an existing custom hostname before creating one', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, result: [{ id: 'existing', hostname: 'shop.example.com' }] }) }) as any;
    await expect(service.create('shop.example.com')).resolves.toMatchObject({ id: 'existing' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('creates a custom hostname with delegated TLS when none exists', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, result: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, result: { id: 'created', hostname: 'shop.example.com', status: 'pending' } }) }) as any;
    await expect(service.create('shop.example.com')).resolves.toMatchObject({ id: 'created' });
    expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('/custom_hostnames'), expect.objectContaining({ method: 'POST', body: JSON.stringify({ hostname: 'shop.example.com', ssl: { method: 'http', type: 'dv' } }) }));
  });

  it('returns a retryable service error without leaking the token', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({ success: false, errors: [{ message: 'rate limited' }] }) }) as any;
    await expect(service.get('host-id')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.get('host-id')).rejects.not.toThrow('token');
  });

  it('refuses to run when production credentials are missing', async () => {
    const unconfigured = new CloudflareCustomHostnameService({ get: jest.fn() } as any);
    await expect(unconfigured.create('shop.example.com')).rejects.toThrow('尚未完成 Cloudflare 配置');
  });
});
