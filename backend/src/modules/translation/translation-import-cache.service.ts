import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class TranslationImportCacheService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    const settings = config.get<{ host?: string; port?: number }>('redis') || {};
    this.redis = new Redis({
      host: settings.host || 'localhost',
      port: settings.port || 6379,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    await this.connect();
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) as T : null;
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    await this.connect();
    await this.redis.set(key, JSON.stringify(value), 'PX', ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.connect();
    await this.redis.del(key);
  }

  async onModuleDestroy() {
    if (this.redis.status === 'ready') await this.redis.quit();
    else this.redis.disconnect();
  }

  private async connect() {
    if (this.redis.status === 'wait') await this.redis.connect();
  }
}
