import { Injectable, Logger } from '@nestjs/common';

/**
 * Rate Limiter Configuration
 */
export interface RateLimitConfig {
  perSecond?: number;
  perMinute?: number;
  perHour?: number;
}

/**
 * Rate Limit Bucket - Tracks request timestamps for a specific bucket
 */
interface RateLimitBucket {
  timestamps: number[];
  lastCleanup: number;
}

/**
 * Rate Limiter Service
 * 
 * Implements a sliding window rate limiter with support for multiple time windows.
 * Uses in-memory storage (can be extended to use Redis for distributed systems).
 * 
 * Features:
 * - Multiple time windows (per-second, per-minute, per-hour)
 * - Named buckets for different rate limit contexts
 * - Automatic cleanup of old timestamps
 * - Non-blocking checks with wait time calculations
 * 
 * @example
 * ```typescript
 * // Check if request is allowed
 * const result = await rateLimiter.checkRateLimit('email-sending', {
 *   perSecond: 10,
 *   perMinute: 100,
 *   perHour: 1000
 * });
 * 
 * if (!result.allowed) {
 *   console.log(`Rate limit exceeded. Wait ${result.waitTimeMs}ms`);
 * }
 * ```
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private buckets: Map<string, RateLimitBucket> = new Map();
  
  // Cleanup interval to prevent memory leaks
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Check if a request is allowed under the rate limit
   * 
   * @param bucketKey - Unique identifier for this rate limit bucket (e.g., 'email-sending', 'api-calls')
   * @param config - Rate limit configuration with perSecond, perMinute, perHour limits
   * @returns Object indicating if request is allowed and wait time if not
   */
  async checkRateLimit(
    bucketKey: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; waitTimeMs: number; currentUsage: any }> {
    const now = Date.now();
    const bucket = this.getBucket(bucketKey);
    
    // Clean up old timestamps
    this.cleanupBucket(bucket, now);
    
    // Check each time window
    const checks = [
      { window: 1000, limit: config.perSecond, name: 'per-second' },
      { window: 60000, limit: config.perMinute, name: 'per-minute' },
      { window: 3600000, limit: config.perHour, name: 'per-hour' }
    ];

    let maxWaitTime = 0;
    const usage: any = {};

    for (const check of checks) {
      if (!check.limit) continue; // Skip if limit not configured

      const windowStart = now - check.window;
      const requestsInWindow = bucket.timestamps.filter(ts => ts > windowStart).length;
      
      usage[check.name] = {
        current: requestsInWindow,
        limit: check.limit,
        percentage: ((requestsInWindow / check.limit) * 100).toFixed(2)
      };

      if (requestsInWindow >= check.limit) {
        // Calculate wait time until oldest request in window expires
        const oldestInWindow = bucket.timestamps.find(ts => ts > windowStart);
        const waitTime = oldestInWindow ? (oldestInWindow + check.window - now) : check.window;
        maxWaitTime = Math.max(maxWaitTime, waitTime);
        
        this.logger.warn(
          `Rate limit exceeded for bucket "${bucketKey}" (${check.name}): ` +
          `${requestsInWindow}/${check.limit}. Wait ${waitTime}ms`
        );
      }
    }

    if (maxWaitTime > 0) {
      return {
        allowed: false,
        waitTimeMs: maxWaitTime,
        currentUsage: usage
      };
    }

    // Record this request
    bucket.timestamps.push(now);
    
    return {
      allowed: true,
      waitTimeMs: 0,
      currentUsage: usage
    };
  }

  /**
   * Record a successful request (increments counter)
   * Use this when you want to track usage without checking limits first
   */
  recordRequest(bucketKey: string): void {
    const bucket = this.getBucket(bucketKey);
    bucket.timestamps.push(Date.now());
  }

  /**
   * Get current usage statistics for a bucket
   */
  getUsageStats(bucketKey: string, config: RateLimitConfig): any {
    const bucket = this.getBucket(bucketKey);
    const now = Date.now();
    
    this.cleanupBucket(bucket, now);

    const stats: any = {};

    if (config.perSecond) {
      const count = bucket.timestamps.filter(ts => ts > now - 1000).length;
      stats.perSecond = {
        current: count,
        limit: config.perSecond,
        percentage: ((count / config.perSecond) * 100).toFixed(2),
        remaining: Math.max(0, config.perSecond - count)
      };
    }

    if (config.perMinute) {
      const count = bucket.timestamps.filter(ts => ts > now - 60000).length;
      stats.perMinute = {
        current: count,
        limit: config.perMinute,
        percentage: ((count / config.perMinute) * 100).toFixed(2),
        remaining: Math.max(0, config.perMinute - count)
      };
    }

    if (config.perHour) {
      const count = bucket.timestamps.filter(ts => ts > now - 3600000).length;
      stats.perHour = {
        current: count,
        limit: config.perHour,
        percentage: ((count / config.perHour) * 100).toFixed(2),
        remaining: Math.max(0, config.perHour - count)
      };
    }

    return stats;
  }

  /**
   * Reset a specific bucket (useful for testing or manual intervention)
   */
  resetBucket(bucketKey: string): void {
    this.buckets.delete(bucketKey);
    this.logger.log(`Reset rate limit bucket: ${bucketKey}`);
  }

  /**
   * Reset all buckets
   */
  resetAll(): void {
    this.buckets.clear();
    this.logger.log('Reset all rate limit buckets');
  }

  /**
   * Get all bucket statistics (useful for monitoring)
   */
  getAllBucketStats(): Map<string, any> {
    const stats = new Map();
    
    for (const [key, bucket] of this.buckets.entries()) {
      const now = Date.now();
      stats.set(key, {
        totalRequests: bucket.timestamps.length,
        last1Second: bucket.timestamps.filter(ts => ts > now - 1000).length,
        last1Minute: bucket.timestamps.filter(ts => ts > now - 60000).length,
        last1Hour: bucket.timestamps.filter(ts => ts > now - 3600000).length,
        oldestTimestamp: bucket.timestamps[0] || null,
        newestTimestamp: bucket.timestamps[bucket.timestamps.length - 1] || null
      });
    }
    
    return stats;
  }

  /**
   * Wait until rate limit allows request
   * Useful for automatic retry with backoff
   */
  async waitForRateLimit(bucketKey: string, config: RateLimitConfig): Promise<void> {
    const result = await this.checkRateLimit(bucketKey, config);
    
    if (!result.allowed) {
      this.logger.log(
        `Waiting ${result.waitTimeMs}ms for rate limit on bucket "${bucketKey}"`
      );
      await this.sleep(result.waitTimeMs);
      
      // Recursive check after waiting
      return this.waitForRateLimit(bucketKey, config);
    }
  }

  /**
   * Get or create a bucket
   */
  private getBucket(bucketKey: string): RateLimitBucket {
    if (!this.buckets.has(bucketKey)) {
      this.buckets.set(bucketKey, {
        timestamps: [],
        lastCleanup: Date.now()
      });
    }
    return this.buckets.get(bucketKey)!;
  }

  /**
   * Clean up old timestamps from a bucket
   */
  private cleanupBucket(bucket: RateLimitBucket, now: number): void {
    // Only cleanup if it's been more than 1 minute since last cleanup
    if (now - bucket.lastCleanup < 60000) {
      return;
    }

    // Remove timestamps older than 1 hour (longest window we track)
    const oneHourAgo = now - 3600000;
    bucket.timestamps = bucket.timestamps.filter(ts => ts > oneHourAgo);
    bucket.lastCleanup = now;
  }

  /**
   * Start periodic cleanup of all buckets
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      
      for (const [key, bucket] of this.buckets.entries()) {
        const sizeBefore = bucket.timestamps.length;
        bucket.timestamps = bucket.timestamps.filter(ts => ts > oneHourAgo);
        bucket.lastCleanup = now;
        
        const sizeAfter = bucket.timestamps.length;
        if (sizeBefore !== sizeAfter) {
          this.logger.debug(
            `Cleaned up bucket "${key}": ${sizeBefore - sizeAfter} old timestamps removed`
          );
        }
        
        // Remove empty buckets
        if (bucket.timestamps.length === 0) {
          this.buckets.delete(key);
        }
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup timer (important for graceful shutdown)
   */
  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
