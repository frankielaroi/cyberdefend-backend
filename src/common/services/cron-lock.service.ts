import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createClient, RedisClientType } from 'redis';

// Deletes the lock only if this process still owns it
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

// How long to wait for Redis before skipping a run; the client otherwise retries connecting forever
const ACQUIRE_TIMEOUT_MS = 3000;

/**
 * Redis lock so a @Cron job runs on one dyno only when the app is scaled out.
 * If Redis is unreachable the job is skipped rather than risking duplicate runs
 * (Bull queues need Redis too, so the app is already degraded in that case).
 */
@Injectable()
export class CronLockService implements OnModuleDestroy {
  private readonly logger = new Logger(CronLockService.name);
  private readonly client: RedisClientType;
  private connecting: Promise<unknown> | null = null;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL') || this.urlFromParts(config);
    this.client = createClient({
      url,
      // Heroku Redis serves TLS with a self-signed certificate
      socket: url.startsWith('rediss://') ? { tls: true, rejectUnauthorized: false } : undefined,
    });
    this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
  }

  /**
   * Runs fn only if no other instance holds the lock. ttlMs should exceed the job's worst-case runtime.
   * Returns undefined when the lock was not acquired.
   */
  async runExclusive<T>(name: string, ttlMs: number, fn: () => Promise<T>): Promise<T | undefined> {
    const key = `cron-lock:${name}`;
    const token = randomUUID();

    try {
      const acquired = await this.withTimeout(
        this.ensureConnected().then(() => this.client.set(key, token, { NX: true, PX: ttlMs })),
        ACQUIRE_TIMEOUT_MS,
      );
      if (acquired !== 'OK') {
        this.logger.debug(`Skipping ${name}: running on another instance`);
        return undefined;
      }
    } catch (error) {
      this.logger.warn(`Skipping ${name}: lock unavailable (${error.message})`);
      return undefined;
    }

    try {
      return await fn();
    } finally {
      try {
        await this.client.eval(RELEASE_SCRIPT, { keys: [key], arguments: [token] });
      } catch (error) {
        this.logger.warn(`Failed to release lock ${name}; it expires after ${ttlMs}ms (${error.message})`);
      }
    }
  }

  async onModuleDestroy() {
    if (this.client.isReady) {
      await this.client.quit();
    } else if (this.client.isOpen) {
      // Still trying to (re)connect: stop retrying instead of waiting on a graceful QUIT
      await this.client.disconnect();
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`no Redis response within ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  private async ensureConnected() {
    if (this.client.isReady) return;
    if (!this.connecting) {
      this.connecting = this.client.connect().finally(() => (this.connecting = null));
    }
    await this.connecting;
  }

  private urlFromParts(config: ConfigService): string {
    const host = config.get<string>('REDIS_HOST', 'localhost');
    const port = config.get<number>('REDIS_PORT', 6379);
    const password = config.get<string>('REDIS_PASSWORD');
    return password ? `redis://:${encodeURIComponent(password)}@${host}:${port}` : `redis://${host}:${port}`;
  }
}
