import { IDENTITY, TenantContext } from '@malaika/common';
import { Injectable, Logger } from '@nestjs/common';
import { Broker } from '../core/broker.service.js';
import { RedisService } from '../core/redis.service.js';

const TTL_SECONDS = 60;

/** Resuelve el comercio de cada request por su dominio, con caché en Redis. */
@Injectable()
export class TenantResolver {
  private readonly logger = new Logger(TenantResolver.name);

  constructor(
    private readonly broker: Broker,
    private readonly redis: RedisService,
  ) {}

  byHost(host: string): Promise<TenantContext | null> {
    return this.cached(`tenant:host:${host}`, { host });
  }

  bySlug(slug: string): Promise<TenantContext | null> {
    return this.cached(`tenant:slug:${slug}`, { slug });
  }

  /** Se llama cuando un admin cambia datos del comercio. */
  async invalidate(): Promise<void> {
    try {
      const keys = await this.redis.client.keys('tenant:*');
      if (keys.length) await this.redis.client.del(...keys);
    } catch (err) {
      this.logger.warn(`No se pudo invalidar la caché de comercios: ${(err as Error).message}`);
    }
  }

  private async cached(key: string, query: { host?: string; slug?: string }): Promise<TenantContext | null> {
    try {
      const hit = await this.redis.client.get(key);
      if (hit) return hit === 'null' ? null : (JSON.parse(hit) as TenantContext);
    } catch {
      // Sin Redis seguimos resolviendo contra identity-service.
    }
    let tenant: TenantContext | null = null;
    try {
      tenant = await this.broker.send<TenantContext>(IDENTITY.resolveTenant, query);
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode !== 404) throw err;
    }
    this.redis.client.set(key, JSON.stringify(tenant), 'EX', TTL_SECONDS).catch(() => undefined);
    return tenant;
  }
}
