import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

  async get<T>(key: string): Promise<T | null> {
    try {
      return (await this.cacheManager.get<T>(key)) || null;
    } catch (error) {
      this.logger.warn(`Cache get error for key "${key}": ${error}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl || 300000); // 默认5分钟
    } catch (error) {
      this.logger.warn(`Cache set error for key "${key}": ${error}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(`Cache del error for key "${key}": ${error}`);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.cacheManager.clear();
    } catch (error) {
      this.logger.warn(`Cache reset error: ${error}`);
    }
  }
}
