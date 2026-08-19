import { ProductStorageService } from './product-storage.service';

describe('ProductStorageService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads into a tenant and site isolated image path', async () => {
    const storage = { upload: jest.fn().mockResolvedValue({ url: 'https://image.example.com/image.webp', objectName: 'object.webp' }) };
    const service = new ProductStorageService(storage as never);
    const result = await service.uploadProductImage({ originalname: '产品 图.webp', mimetype: 'image/webp', buffer: Buffer.from('image') } as Express.Multer.File, 'tenant-1', 'site-1');
    expect(result.url).toBe('https://image.example.com/image.webp');
    expect(storage.upload).toHaveBeenCalledWith(expect.any(Object), 'tenants/tenant-1/sites/site-1/images');
  });
});
