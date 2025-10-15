# Email Rate Limiter Documentation

## Overview

The Rate Limiter Service provides comprehensive email throttling to prevent hitting SMTP provider limits and ensure reliable email delivery at scale. It implements a sliding window algorithm with support for multiple time windows (per-second, per-minute, per-hour).

## Architecture

### Components

1. **RateLimiterService** (`src/common/services/rate-limiter.service.ts`)
   - Core rate limiting logic with sliding window algorithm
   - In-memory timestamp tracking for fast performance
   - Support for multiple named buckets (email-sending, bulk-email-sending, etc.)
   - Automatic cleanup of old timestamps to prevent memory leaks

2. **EmailService Integration** (`src/notification/services/email.service.ts`)
   - Automatic rate limit checking before each email send
   - Exponential backoff with automatic retry
   - Separate buckets for single and bulk email sends
   - Comprehensive logging of rate limit hits

3. **Configuration** (`src/config/config.validation.ts`)
   - Environment-based rate limit configuration
   - Default values based on Mailtrap limits
   - Joi validation for all rate limit settings

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Email Rate Limiting (requests per time window)
EMAIL_RATE_LIMIT_PER_SECOND=10      # Max emails per second (default: 10)
EMAIL_RATE_LIMIT_PER_MINUTE=100     # Max emails per minute (default: 100)
EMAIL_RATE_LIMIT_PER_HOUR=1000      # Max emails per hour (default: 1000)
```

### Default Limits

Based on [Mailtrap SMTP limits](https://help.mailtrap.io/article/23-smtp-sending-limits):

- **Per Second**: 10 emails
- **Per Minute**: 100 emails
- **Per Hour**: 1,000 emails

### Adjusting Limits

For different SMTP providers, adjust the limits accordingly:

**SendGrid Free Tier:**
```env
EMAIL_RATE_LIMIT_PER_SECOND=20
EMAIL_RATE_LIMIT_PER_MINUTE=600
EMAIL_RATE_LIMIT_PER_HOUR=3000
```

**AWS SES (Production):**
```env
EMAIL_RATE_LIMIT_PER_SECOND=14
EMAIL_RATE_LIMIT_PER_MINUTE=840
EMAIL_RATE_LIMIT_PER_HOUR=50400
```

**Mailgun:**
```env
EMAIL_RATE_LIMIT_PER_SECOND=50
EMAIL_RATE_LIMIT_PER_MINUTE=1000
EMAIL_RATE_LIMIT_PER_HOUR=10000
```

## Usage

### Automatic Rate Limiting

Rate limiting is automatically applied to all email sends:

```typescript
// Single email - automatically rate limited
const result = await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Test Email',
  textContent: 'Hello World'
});

// Bulk email - automatically rate limited (separate bucket)
const result = await emailService.sendBulkEmail(
  'Subject',
  'Content',
  ['user1@example.com', 'user2@example.com'],
  true
);
```

### Manual Rate Limit Checks

For custom use cases, check rate limits manually:

```typescript
import { RateLimiterService } from './common/services/rate-limiter.service';

// Check if request is allowed
const result = await rateLimiter.checkRateLimit('my-custom-bucket', {
  perSecond: 10,
  perMinute: 100,
  perHour: 1000
});

if (!result.allowed) {
  console.log(`Rate limit exceeded. Wait ${result.waitTimeMs}ms`);
  console.log('Current usage:', result.currentUsage);
}
```

### Wait for Rate Limit

Automatically wait until rate limit allows request:

```typescript
// This will wait if rate limit is exceeded
await rateLimiter.waitForRateLimit('email-sending', {
  perSecond: 10,
  perMinute: 100,
  perHour: 1000
});

// Now safe to proceed
await sendEmail();
```

### Get Usage Statistics

Monitor current rate limit usage:

```typescript
const stats = rateLimiter.getUsageStats('email-sending', {
  perSecond: 10,
  perMinute: 100,
  perHour: 1000
});

console.log(stats);
// {
//   perSecond: { current: 7, limit: 10, percentage: "70.00", remaining: 3 },
//   perMinute: { current: 45, limit: 100, percentage: "45.00", remaining: 55 },
//   perHour: { current: 500, limit: 1000, percentage: "50.00", remaining: 500 }
// }
```

## How It Works

### Sliding Window Algorithm

The rate limiter uses a sliding window algorithm that:

1. **Records Timestamps**: Each request records a timestamp
2. **Counts Active Requests**: For each time window (1s, 1m, 1h), counts requests within that window
3. **Enforces Limits**: Blocks requests if any window exceeds its limit
4. **Calculates Wait Time**: Tells you how long to wait until oldest request expires

### Buckets

Different buckets allow separate rate limits for different contexts:

- `email-sending` - Single email sends
- `bulk-email-sending` - Bulk/phishing email sends
- `api-calls` - API rate limiting (future use)
- Custom buckets - Your own use cases

### Memory Management

Automatic cleanup prevents memory leaks:

- Old timestamps (>1 hour) removed every minute
- Empty buckets automatically deleted
- Efficient in-memory storage (no Redis required)

## Monitoring

### Log Messages

Rate limit hits are automatically logged:

```
[EmailService] Rate limit exceeded. Waiting 1500ms before sending email.
Current usage: {"perSecond":{"current":10,"limit":10,"percentage":"100.00"}}
```

```
[EmailService] Bulk email rate limit exceeded. Waiting 2000ms before sending.
Recipients: 50, Current usage: {"perMinute":{"current":100,"limit":100,"percentage":"100.00"}}
```

### Get All Bucket Stats

Monitor all active buckets:

```typescript
const allStats = rateLimiter.getAllBucketStats();

for (const [bucket, stats] of allStats.entries()) {
  console.log(`Bucket: ${bucket}`);
  console.log(`Total requests: ${stats.totalRequests}`);
  console.log(`Last 1 second: ${stats.last1Second}`);
  console.log(`Last 1 minute: ${stats.last1Minute}`);
  console.log(`Last 1 hour: ${stats.last1Hour}`);
}
```

### Health Check Integration

Add rate limiter to health checks:

```typescript
@Get('health')
async healthCheck() {
  const emailStats = this.rateLimiter.getUsageStats('email-sending', {
    perSecond: 10,
    perMinute: 100,
    perHour: 1000
  });

  return {
    status: 'ok',
    rateLimits: {
      email: emailStats
    }
  };
}
```

## Production Deployment

### Step 1: Set Environment Variables

On Heroku:
```bash
heroku config:set \
  EMAIL_RATE_LIMIT_PER_SECOND=10 \
  EMAIL_RATE_LIMIT_PER_MINUTE=100 \
  EMAIL_RATE_LIMIT_PER_HOUR=1000
```

On AWS:
```bash
# In your .env or parameter store
EMAIL_RATE_LIMIT_PER_SECOND=10
EMAIL_RATE_LIMIT_PER_MINUTE=100
EMAIL_RATE_LIMIT_PER_HOUR=1000
```

### Step 2: Verify Configuration

Check logs on startup:
```
[EmailService] Rate limiter initialized - 10/sec, 100/min, 1000/hour
```

### Step 3: Monitor Logs

Watch for rate limit hits:
```bash
# Heroku
heroku logs --tail | grep "Rate limit"

# Docker
docker logs -f container_name | grep "Rate limit"

# Local
tail -f logs/app.log | grep "Rate limit"
```

## Performance Considerations

### In-Memory Storage

**Pros:**
- Fast: O(n) where n = requests in largest window
- No external dependencies (no Redis required)
- Works in serverless environments

**Cons:**
- Not distributed (each instance has separate limits)
- Lost on server restart (resets counters)

### For Distributed Systems

If you need distributed rate limiting across multiple servers, consider:

1. **Redis-based Rate Limiter**
   - Store timestamps in Redis sorted sets
   - Shared rate limits across all instances
   - Persistent across restarts

2. **API Gateway Rate Limiting**
   - Use AWS API Gateway, Kong, or Nginx
   - Rate limit before requests hit your server
   - Industry-proven solutions

## Troubleshooting

### Issue: Too Many Rate Limit Hits

**Symptoms:**
```
[EmailService] Rate limit exceeded. Waiting 5000ms before sending email.
```

**Solutions:**
1. Increase rate limits in `.env`
2. Check if you're sending emails faster than configured limits
3. Review phishing campaign batch sizes
4. Consider upgrading your SMTP plan

### Issue: Emails Sending Too Slowly

**Symptoms:**
- Long delays between emails
- Phishing campaigns taking too long

**Solutions:**
1. Increase `EMAIL_RATE_LIMIT_PER_SECOND` (if your provider allows)
2. Use Bull queue for better async processing
3. Upgrade to higher-tier SMTP plan
4. Implement email job batching

### Issue: Rate Limiter Not Working

**Symptoms:**
- Getting SMTP rate limit errors from provider
- No rate limit logs in output

**Solutions:**
1. Verify `RateLimiterService` is imported in `CommonModule`
2. Check `EmailService` has rate limiter injected
3. Ensure environment variables are set
4. Check if CommonModule is imported in NotificationModule

### Issue: Memory Leak

**Symptoms:**
- Memory usage grows over time
- Application becomes slow

**Solutions:**
1. Verify cleanup timer is running (should auto-cleanup every minute)
2. Check for buckets with unusual names (typos create new buckets)
3. Review custom rate limiter usage
4. Restart application to clear memory

## Testing

### Unit Tests

Test rate limiting behavior:

```typescript
describe('RateLimiterService', () => {
  it('should allow requests under limit', async () => {
    const result = await rateLimiter.checkRateLimit('test', {
      perSecond: 10
    });
    expect(result.allowed).toBe(true);
  });

  it('should block requests over limit', async () => {
    // Send 10 requests (at limit)
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkRateLimit('test', { perSecond: 10 });
    }
    
    // 11th request should be blocked
    const result = await rateLimiter.checkRateLimit('test', {
      perSecond: 10
    });
    expect(result.allowed).toBe(false);
    expect(result.waitTimeMs).toBeGreaterThan(0);
  });
});
```

### Load Testing

Test rate limiter under load:

```bash
# Install k6 load testing tool
npm install -g k6

# Create test script
cat > rate-limit-test.js << 'EOF'
import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  vus: 20, // 20 virtual users
  duration: '60s',
};

export default function() {
  http.post('http://localhost:3000/api/v1/notification/send', {
    to: 'test@example.com',
    subject: 'Test',
    textContent: 'Test'
  });
  sleep(0.1); // 10 requests per second per user
}
EOF

# Run load test
k6 run rate-limit-test.js
```

### Manual Testing

Test rate limiting manually:

```bash
# Send 15 rapid emails (should hit 10/sec limit)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/v1/notification/send \
    -H "Content-Type: application/json" \
    -d '{"to":"test@example.com","subject":"Test","textContent":"Test"}' &
done
wait

# Check logs for rate limit messages
```

## Best Practices

1. **Set Conservative Limits**: Start with provider's documented limits minus 10% buffer
2. **Monitor Logs**: Watch for frequent rate limit hits
3. **Use Bull Queue**: For high-volume campaigns, queue emails for better rate limit handling
4. **Batch Operations**: Send emails in controlled batches rather than all at once
5. **Test Before Production**: Load test with realistic email volumes
6. **Plan for Scale**: Consider distributed rate limiting if running multiple instances
7. **Document Provider Limits**: Keep track of your SMTP provider's actual limits
8. **Set Alerts**: Monitor rate limit hits and alert if too frequent

## API Reference

### checkRateLimit()

```typescript
async checkRateLimit(
  bucketKey: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; waitTimeMs: number; currentUsage: any }>
```

Check if a request is allowed under rate limit.

**Parameters:**
- `bucketKey`: Unique identifier for this rate limit bucket
- `config`: Rate limit configuration `{ perSecond?, perMinute?, perHour? }`

**Returns:**
- `allowed`: Whether request is allowed
- `waitTimeMs`: Milliseconds to wait if not allowed
- `currentUsage`: Current usage statistics for each window

### waitForRateLimit()

```typescript
async waitForRateLimit(
  bucketKey: string,
  config: RateLimitConfig
): Promise<void>
```

Wait until rate limit allows request (automatic retry with backoff).

### getUsageStats()

```typescript
getUsageStats(
  bucketKey: string,
  config: RateLimitConfig
): any
```

Get current usage statistics for a bucket.

**Returns:**
```typescript
{
  perSecond?: { current, limit, percentage, remaining },
  perMinute?: { current, limit, percentage, remaining },
  perHour?: { current, limit, percentage, remaining }
}
```

### resetBucket()

```typescript
resetBucket(bucketKey: string): void
```

Reset a specific bucket (useful for testing or manual intervention).

### resetAll()

```typescript
resetAll(): void
```

Reset all buckets (clear all rate limit counters).

## Support

For issues or questions:
1. Check logs for rate limit messages
2. Verify environment variables are set correctly
3. Review SMTP provider documentation for actual limits
4. Test rate limiter behavior with unit tests
5. Contact your SMTP provider if hitting limits frequently

## Future Improvements

Potential enhancements:

1. **Redis Integration**: Distributed rate limiting across multiple instances
2. **Dynamic Limits**: Adjust limits based on time of day or load
3. **Metrics Dashboard**: Real-time rate limit monitoring UI
4. **Per-Campaign Limits**: Different limits for different phishing campaigns
5. **Adaptive Rate Limiting**: Automatically adjust based on SMTP errors
6. **Rate Limit API**: REST endpoints to check/reset rate limits
7. **Email Prioritization**: Priority queue with different rate limits per priority

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**Maintainer**: CyberDefend Backend Team
