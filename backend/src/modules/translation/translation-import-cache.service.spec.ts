import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { TranslationImportCacheService } from './translation-import-cache.service';

jest.mock('ioredis', () => ({ __esModule: true, default: jest.fn() }));

describe('TranslationImportCacheService', () => {
  const RedisMock = Redis as unknown as jest.Mock;
  const config = { get: jest.fn().mockReturnValue({ host: 'redis.internal', port: 6379 }) } as unknown as ConfigService;

  beforeEach(() => {
    delete process.env.REDIS_HOST;
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.REDIS_HOST;
  });

  it('stores, reads and deletes preview data in memory when Redis is not configured', async () => {
    const service = new TranslationImportCacheService(config);
    const value = { locale: 'hr_HR', rows: 79 };

    await service.set('preview-1', value, 30_000);

    await expect(service.get('preview-1')).resolves.toEqual(value);
    await service.del('preview-1');
    await service.del('missing-preview');
    await expect(service.get('preview-1')).resolves.toBeNull();
    expect(RedisMock).not.toHaveBeenCalled();
  });

  it('expires in-memory preview data after its TTL', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const service = new TranslationImportCacheService(config);
    await service.set('preview-1', { ready: 74 }, 500);

    now.mockReturnValue(1_500);

    await expect(service.get('preview-1')).resolves.toBeNull();
    now.mockRestore();
  });

  it('clears in-memory preview data on module shutdown', async () => {
    const service = new TranslationImportCacheService(config);
    await service.set('preview-1', { ready: 1 }, 30_000);

    await service.onModuleDestroy();

    await expect(service.get('preview-1')).resolves.toBeNull();
  });

  it('uses Redis when configured and exposes connection failures', async () => {
    process.env.REDIS_HOST = 'redis.internal';
    const connectionError = new Error('Redis unavailable');
    const client = { status: 'wait', connect: jest.fn().mockRejectedValue(connectionError) };
    RedisMock.mockImplementation(() => client);
    const service = new TranslationImportCacheService(config);

    await expect(service.set('preview-1', { ready: 1 }, 30_000)).rejects.toThrow('Redis unavailable');
    expect(RedisMock).toHaveBeenCalledWith(expect.objectContaining({ host: 'redis.internal', port: 6379 }));
  });
});
