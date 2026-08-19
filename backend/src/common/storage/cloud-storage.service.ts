import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

export type StoredObject = { url: string; objectName: string };

@Injectable()
export class CloudStorageService {
  private readonly bucketName: string;
  private readonly privateBucketName: string;
  private readonly publicBaseUrl: string;
  private readonly storage: Storage;

  constructor(config: ConfigService) {
    this.bucketName = config.get<string>('GCS_BUCKET')?.trim() || '';
    this.privateBucketName = config.get<string>('GCS_PRIVATE_BUCKET')?.trim() || this.bucketName;
    this.publicBaseUrl = (config.get<string>('GCS_PUBLIC_BASE_URL') || '').replace(/\/$/, '');
    const projectId = config.get<string>('GCS_PROJECT_ID')?.trim();
    const keyFilename = config.get<string>('GOOGLE_APPLICATION_CREDENTIALS')?.trim();
    this.storage = new Storage({
      ...(projectId ? { projectId } : {}),
      ...(keyFilename ? { keyFilename } : {}),
    });
  }

  async upload(file: Express.Multer.File, pathPrefix: string, options: { public?: boolean } = {}): Promise<StoredObject> {
    this.ensureConfigured();
    const extension = extname(file.originalname).toLowerCase() || this.extensionFor(file.mimetype);
    const safePrefix = pathPrefix.split('/').filter(Boolean).map(this.safeSegment).join('/');
    const objectName = `${safePrefix}/${randomUUID()}${extension}`;
    const bucketName = options.public === false ? this.privateBucketName : this.bucketName;
    await this.storage.bucket(bucketName).file(objectName).save(file.buffer, {
      resumable: false,
      contentType: file.mimetype,
      metadata: {
        cacheControl: options.public === false ? 'private, no-store' : 'public, max-age=31536000, immutable',
        metadata: { originalName: encodeURIComponent(file.originalname) },
      },
      validation: 'crc32c',
    });
    return { url: options.public === false ? '' : this.publicUrl(objectName), objectName };
  }

  async delete(objectName: string, options: { public?: boolean } = {}): Promise<void> {
    const bucketName = options.public === false ? this.privateBucketName : this.bucketName;
    if (!bucketName || !objectName) return;
    await this.storage.bucket(bucketName).file(objectName).delete({ ignoreNotFound: true });
  }

  private ensureConfigured() {
    if (!this.bucketName) throw new ServiceUnavailableException('文件存储服务尚未配置');
  }

  private publicUrl(objectName: string): string {
    const encodedPath = objectName.split('/').map(encodeURIComponent).join('/');
    return this.publicBaseUrl
      ? `${this.publicBaseUrl}/${encodedPath}`
      : `https://storage.googleapis.com/${encodeURIComponent(this.bucketName)}/${encodedPath}`;
  }

  private safeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  }

  private extensionFor(mime: string): string {
    return ({
      'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
      'text/plain': '.txt', 'text/markdown': '.md', 'text/csv': '.csv', 'application/json': '.json',
    } as Record<string, string>)[mime] || '';
  }
}
