const save = jest.fn().mockResolvedValue(undefined);
const remove = jest.fn().mockResolvedValue(undefined);
const file = jest.fn(() => ({ save, delete: remove }));
const bucket = jest.fn(() => ({ file }));
jest.mock('@google-cloud/storage', () => ({ Storage: jest.fn(() => ({ bucket })) }));

import { ServiceUnavailableException } from '@nestjs/common';
import { CloudStorageService } from './cloud-storage.service';

describe('CloudStorageService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes public images beneath a tenant-isolated prefix', async () => {
    const config = { get: jest.fn((key: string) => ({ GCS_BUCKET: 'mercivo-assets', GCS_PROJECT_ID: 'project', GCS_PUBLIC_BASE_URL: 'https://image.aihubflux.com' } as Record<string, string>)[key]) };
    const service = new CloudStorageService(config as never);
    const result = await service.upload({ originalname: '产品.webp', mimetype: 'image/webp', buffer: Buffer.from('image') } as Express.Multer.File, 'tenants/t1/sites/s1/images');
    expect(result.objectName).toMatch(/^tenants\/t1\/sites\/s1\/images\/[a-f0-9-]+\.webp$/);
    expect(result.url).toBe(`https://image.aihubflux.com/${result.objectName}`);
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({ contentType: 'image/webp' }));
  });

  it('keeps knowledge objects private', async () => {
    const config = { get: jest.fn((key: string) => ({ GCS_BUCKET: 'mercivo-assets', GCS_PRIVATE_BUCKET: 'mercivo-private' } as Record<string, string>)[key]) };
    const service = new CloudStorageService(config as never);
    const result = await service.upload({ originalname: 'guide.md', mimetype: 'text/markdown', buffer: Buffer.from('text') } as Express.Multer.File, 'tenants/t1/sites/s1/knowledge', { public: false });
    expect(result.url).toBe('');
    expect(bucket).toHaveBeenCalledWith('mercivo-private');
  });

  it('returns a friendly error when storage is not configured', async () => {
    const service = new CloudStorageService({ get: jest.fn() } as never);
    await expect(service.upload({} as Express.Multer.File, 'images')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
