import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import * as sharp from 'sharp';

export type StoredObject = { url: string; objectName: string };
export type ExportImageAsset = { buffer: Buffer; extension: 'png' | 'jpeg'; width: number; height: number };

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

  async readImageForExport(rawUrl: string): Promise<ExportImageAsset | null> {
    const url = this.trustedImageUrl(rawUrl);
    if (!url) return null;
    try {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > 5 * 1024 * 1024) return null;
      const input = Buffer.from(await response.arrayBuffer());
      if (!input.length || input.length > 5 * 1024 * 1024) return null;
      const metadata = await sharp(input, { animated: false }).metadata();
      if (!metadata.width || !metadata.height) return null;
      if (metadata.format === 'png') return { buffer: input, extension: 'png', width: metadata.width, height: metadata.height };
      if (metadata.format === 'jpeg') return { buffer: input, extension: 'jpeg', width: metadata.width, height: metadata.height };
      const buffer = await sharp(input, { animated: false, page: 0 }).png().toBuffer();
      const converted = await sharp(buffer).metadata();
      if (!converted.width || !converted.height) return null;
      return { buffer, extension: 'png', width: converted.width, height: converted.height };
    } catch {
      return null;
    }
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

  private trustedImageUrl(rawUrl: string): URL | null {
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'https:') return null;
      if (this.publicBaseUrl) {
        const base = new URL(this.publicBaseUrl);
        const prefix = base.pathname.replace(/\/$/, '');
        if (url.origin === base.origin && (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) return url;
      }
      const bucketPrefix = `/${encodeURIComponent(this.bucketName)}/`;
      return this.bucketName && url.hostname === 'storage.googleapis.com' && url.pathname.startsWith(bucketPrefix) ? url : null;
    } catch {
      return null;
    }
  }

  private safeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  }

  private extensionFor(mime: string): string {
    return ({
      'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/x-icon': '.ico', 'image/vnd.microsoft.icon': '.ico',
      'text/plain': '.txt', 'text/markdown': '.md', 'text/csv': '.csv', 'application/json': '.json',
    } as Record<string, string>)[mime] || '';
  }
}
