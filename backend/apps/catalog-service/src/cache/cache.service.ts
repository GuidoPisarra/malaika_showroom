import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

export const CACHE_KEYS = ['products', 'presets', 'zones'] as const;
export const cacheKey = (tenantId: string, key: (typeof CACHE_KEYS)[number]) => `catalog:${tenantId}:${key}`;
export const CACHE_TTL_SECONDS = 300;

/** Caché de lectura del catálogo en Redis. Si Redis no responde, se lee directo de la base. */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  async getOrSet<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch (err) {
      this.logger.warn(`Redis no disponible al leer ${key}: ${(err as Error).message}`);
      return load();
    }
    const value = await load();
    this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds).catch(() => undefined);
    return value;
  }

  async invalidateTenant(tenantId: string): Promise<void> {
    try {
      await this.redis.del(...CACHE_KEYS.map((k) => cacheKey(tenantId, k)));
    } catch (err) {
      this.logger.warn(`No se pudo invalidar la caché: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.redis.disconnect();
  }
}
