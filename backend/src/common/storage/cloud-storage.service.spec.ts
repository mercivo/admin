const save = jest.fn().mockResolvedValue(undefined);
const remove = jest.fn().mockResolvedValue(undefined);
const file = jest.fn(() => ({ save, delete: remove }));
const bucket = jest.fn(() => ({ file }));
jest.mock('@google-cloud/storage', () => ({ Storage: jest.fn(() => ({ bucket })) }));

import { ServiceUnavailableException } from '@nestjs/common';
import * as sharp from 'sharp';
import { CloudStorageService } from './cloud-storage.service';

describe('CloudStorageService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes public images beneath a tenant-isolated prefix', async () => {
    const config = { get: jest.fn((key: string) => ({ GCS_BUCKET: 'mercivo-assets', GCS_PROJECT_ID: 'project', GCS_PUBLIC_BASE_URL: '', GCS_OBJECT_PREFIX: 'local' } as Record<string, string>)[key]) };
    const service = new CloudStorageService(config as never);
    const result = await service.upload({ originalname: '产品.webp', mimetype: 'image/webp', buffer: Buffer.from('image') } as Express.Multer.File, 'tenants/t1/sites/s1/images');
    expect(result.objectName).toMatch(/^local\/tenants\/t1\/sites\/s1\/images\/[a-f0-9-]+\.webp$/);
    expect(result.url).toBe(`https://storage.googleapis.com/mercivo-assets/${result.objectName}`);
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({ contentType: 'image/webp' }));
  });

  it('returns a friendly error when storage is not configured', async () => {
    const service = new CloudStorageService({ get: jest.fn() } as never);
    await expect(service.upload({} as Express.Multer.File, 'images')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('uses the configured public base URL for uploaded objects', async () => {
    const config = { get: jest.fn((key: string) => ({ GCS_BUCKET: 'mercivo-assets', GCS_PUBLIC_BASE_URL: 'https://storage.googleapis.com/mercivo-assets/', GCS_OBJECT_PREFIX: 'production' } as Record<string, string>)[key]) };
    const service = new CloudStorageService(config as never);
    const result = await service.upload({ originalname: 'product.png', mimetype: 'image/png', buffer: Buffer.from('image') } as Express.Multer.File, 'tenants/t1/sites/s1/images');
    expect(result.url).toBe(`https://storage.googleapis.com/mercivo-assets/${result.objectName}`);
  });

  it('deletes uploaded objects from the configured image bucket', async () => {
    const config = { get: jest.fn((key: string) => ({ GCS_BUCKET: 'mercivo-assets' } as Record<string, string>)[key]) };
    const service = new CloudStorageService(config as never);
    await service.delete('products/image.webp');
    expect(bucket).toHaveBeenCalledWith('mercivo-assets');
    expect(remove).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  const config = {
    get: jest.fn((key: string) => ({
      GCS_BUCKET: 'mercivo-test-images',
      GCS_PUBLIC_BASE_URL: '',
      GCS_OBJECT_PREFIX: 'local',
      GCS_PROJECT_ID: 'test-project',
      GOOGLE_APPLICATION_CREDENTIALS: '',
    } as Record<string, string>)[key]),
  };

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['PNG', 'png' as const, (image: sharp.Sharp) => image.png()],
    ['JPEG', 'jpeg' as const, (image: sharp.Sharp) => image.jpeg()],
  ])('preserves the original %s bytes and dimensions', async (_, extension, encode) => {
    const input = await encode(sharp({ create: { width: 83, height: 27, channels: 4, background: '#0088ff' } })).toBuffer();
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-length': String(input.length) }),
      arrayBuffer: async () => input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength),
    } as Response);
    const service = new CloudStorageService(config as never);
    const result = await service.readImageForExport('https://storage.googleapis.com/mercivo-test-images/local/product-image');
    expect(result).toMatchObject({ extension, width: 83, height: 27 });
    expect(result!.buffer.equals(input)).toBe(true);
  });

  it.each([
    ['WebP landscape', 400, 20, (image: sharp.Sharp) => image.webp()],
    ['GIF portrait', 20, 400, (image: sharp.Sharp) => image.gif()],
  ])('converts %s to same-size PNG without resizing', async (_, width, height, encode) => {
    const input = await encode(sharp({ create: { width, height, channels: 4, background: '#22aa44' } })).toBuffer();
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-length': String(input.length) }),
      arrayBuffer: async () => input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength),
    } as Response);
    const service = new CloudStorageService(config as never);
    const result = await service.readImageForExport('https://storage.googleapis.com/mercivo-test-images/local/extreme.png');
    expect(result).toMatchObject({ extension: 'png', width, height });
    expect(await sharp(result!.buffer).metadata()).toMatchObject({ format: 'png', width, height });
  });

  it('rejects untrusted image hosts without making a request', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const service = new CloudStorageService(config as never);
    await expect(service.readImageForExport('https://127.0.0.1/private.png')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

});
