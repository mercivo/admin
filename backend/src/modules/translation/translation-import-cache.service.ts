import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class TranslationImportCacheService implements OnModuleDestroy {
  private readonly redis?: Redis;
  private readonly entries = new Map<string, { value: string; expiresAt: number }>();

  constructor(config: ConfigService) {
    if (!process.env.REDIS_HOST?.trim()) return;
    const settings = config.get<{ host?: string; port?: number }>('redis') || {};
    this.redis = new Redis({
      host: settings.host || process.env.REDIS_HOST,
      port: settings.port || 6379,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      const entry = this.entries.get(key);
      if (!entry || entry.expiresAt <= Date.now()) {
        this.entries.delete(key);
        return null;
      }
      return JSON.parse(entry.value) as T;
    }
    await this.connect();
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) as T : null;
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    if (!this.redis) {
      this.entries.set(key, { value: JSON.stringify(value), expiresAt: Date.now() + ttlMs });
      return;
    }
    await this.connect();
    await this.redis.set(key, JSON.stringify(value), 'PX', ttlMs);
  }

  async del(key: string): Promise<void> {
    if (!this.redis) {
      this.entries.delete(key);
      return;
    }
    await this.connect();
    await this.redis.del(key);
  }

  async onModuleDestroy() {
    this.entries.clear();
    if (!this.redis) return;
    if (this.redis.status === 'ready') await this.redis.quit();
    else this.redis.disconnect();
  }

  private async connect() {
    if (this.redis?.status === 'wait') await this.redis.connect();
  }
}
