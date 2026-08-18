const save = jest.fn().mockResolvedValue(undefined);
const file = jest.fn(() => ({ save }));
const bucket = jest.fn(() => ({ file }));
jest.mock('@google-cloud/storage', () => ({ Storage: jest.fn(() => ({ bucket })) }));

import { ServiceUnavailableException } from '@nestjs/common';
import { ProductStorageService } from './product-storage.service';

describe('ProductStorageService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads into a tenant and site isolated object path', async () => {
    const config = { get: jest.fn((key: string) => ({ GCS_BUCKET: 'product-bucket', GCS_PROJECT_ID: 'project', GCS_PUBLIC_BASE_URL: 'https://cdn.example.com' } as Record<string, string>)[key]) };
    const service = new ProductStorageService(config as never);
    const result = await service.uploadProductImage({ originalname: '产品 图.webp', mimetype: 'image/webp', buffer: Buffer.from('image') } as Express.Multer.File, 'tenant-1', 'site-1');
    expect(result.objectName).toMatch(/^tenants\/tenant-1\/sites\/site-1\/products\/[a-f0-9-]+\.webp$/);
    expect(result.url).toBe(`https://cdn.example.com/${result.objectName}`);
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({ contentType: 'image/webp', resumable: false, validation: 'crc32c' }));
  });

  it('returns a friendly error when storage is not configured', async () => {
    const service = new ProductStorageService({ get: jest.fn() } as never);
    await expect(service.uploadProductImage({} as Express.Multer.File, 'tenant-1', 'site-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
