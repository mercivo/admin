import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class ProductStorageService {
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;
  private readonly storage: Storage;

  constructor(config: ConfigService) {
    this.bucketName = config.get<string>('GCS_BUCKET')?.trim() || '';
    this.publicBaseUrl = (config.get<string>('GCS_PUBLIC_BASE_URL') || '').replace(/\/$/, '');
    const projectId = config.get<string>('GCS_PROJECT_ID')?.trim();
    const keyFilename = config.get<string>('GOOGLE_APPLICATION_CREDENTIALS')?.trim();
    this.storage = new Storage({
      ...(projectId ? { projectId } : {}),
      ...(keyFilename ? { keyFilename } : {}),
    });
  }

  async uploadProductImage(file: Express.Multer.File, tenantId: string, siteId: string): Promise<{ url: string; objectName: string }> {
    if (!this.bucketName) throw new ServiceUnavailableException('商品图片存储服务尚未配置');

    const extension = extname(file.originalname).toLowerCase() || this.extensionFor(file.mimetype);
    const objectName = `tenants/${tenantId}/sites/${siteId}/products/${randomUUID()}${extension}`;
    await this.storage.bucket(this.bucketName).file(objectName).save(file.buffer, {
      resumable: false,
      contentType: file.mimetype,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
      validation: 'crc32c',
    });

    const encodedPath = objectName.split('/').map(encodeURIComponent).join('/');
    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl}/${encodedPath}`
      : `https://storage.googleapis.com/${encodeURIComponent(this.bucketName)}/${encodedPath}`;
    return { url, objectName };
  }

  private extensionFor(mime: string): string {
    return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' } as Record<string, string>)[mime] || '';
  }
}
