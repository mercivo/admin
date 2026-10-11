import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

export type StoredObject = { url: string; objectName: string };

@Injectable()
export class CloudStorageService {
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;
  private readonly objectPrefix: string;
  private readonly storage: Storage;

  constructor(config: ConfigService) {
    this.bucketName = config.get<string>('GCS_BUCKET')?.trim() || '';
    this.publicBaseUrl = (config.get<string>('GCS_PUBLIC_BASE_URL') || '').replace(/\/$/, '');
    this.objectPrefix = (config.get<string>('GCS_OBJECT_PREFIX') || '').split('/').filter(Boolean).map(this.safeSegment).join('/');
    const projectId = config.get<string>('GCS_PROJECT_ID')?.trim();
    const keyFilename = config.get<string>('GOOGLE_APPLICATION_CREDENTIALS')?.trim();
    this.storage = new Storage({
      ...(projectId ? { projectId } : {}),
      ...(keyFilename ? { keyFilename } : {}),
    });
  }

  async upload(file: Express.Multer.File, pathPrefix: string): Promise<StoredObject> {
    this.ensureConfigured();
    const extension = extname(file.originalname).toLowerCase() || this.extensionFor(file.mimetype);
    const safePrefix = pathPrefix.split('/').filter(Boolean).map(this.safeSegment).join('/');
    const objectName = [this.objectPrefix, safePrefix, `${randomUUID()}${extension}`].filter(Boolean).join('/');
    await this.storage.bucket(this.bucketName).file(objectName).save(file.buffer, {
      resumable: false,
      contentType: file.mimetype,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: { originalName: encodeURIComponent(file.originalname) },
      },
      validation: 'crc32c',
    });
    return { url: this.publicUrl(objectName), objectName };
  }

  async delete(objectName: string): Promise<void> {
    if (!this.bucketName || !objectName) return;
    await this.storage.bucket(this.bucketName).file(objectName).delete({ ignoreNotFound: true });
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
