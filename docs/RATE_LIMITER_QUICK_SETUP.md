# Rate Limiter Quick Setup

## Add to .env

Add these lines to your `.env` file:

```env
# Email Rate Limiting
EMAIL_RATE_LIMIT_PER_SECOND=10
EMAIL_RATE_LIMIT_PER_MINUTE=100
EMAIL_RATE_LIMIT_PER_HOUR=1000
```

## Deploy to Heroku

Run this command to set the environment variables on Heroku:

```bash
heroku config:set \
  EMAIL_RATE_LIMIT_PER_SECOND=10 \
  EMAIL_RATE_LIMIT_PER_MINUTE=100 \
  EMAIL_RATE_LIMIT_PER_HOUR=1000
```

## Verify Configuration

After starting the app, you should see this log message:

```
[EmailService] Rate limiter initialized - 10/sec, 100/min, 1000/hour
```

## Watch for Rate Limiting

Monitor logs for rate limit events:

```bash
heroku logs --tail | grep "Rate limit"
```

You'll see messages like:
```
[EmailService] Rate limit exceeded. Waiting 1500ms before sending email.
```

## Default Limits Explained

The default limits (10/sec, 100/min, 1000/hour) are based on Mailtrap's SMTP limits:
- **10 per second** = ~600 emails per minute burst
- **100 per minute** = Average throughput limit
- **1000 per hour** = Total hourly quota

These limits ensure you never hit Mailtrap's rate limits and get emails blocked.

## Adjust for Your Provider

If using a different SMTP provider, adjust accordingly:

**SendGrid:**
```env
EMAIL_RATE_LIMIT_PER_SECOND=20
EMAIL_RATE_LIMIT_PER_MINUTE=600
EMAIL_RATE_LIMIT_PER_HOUR=3000
```

**AWS SES:**
```env
EMAIL_RATE_LIMIT_PER_SECOND=14
EMAIL_RATE_LIMIT_PER_MINUTE=840
EMAIL_RATE_LIMIT_PER_HOUR=50400
```

## Testing

Send a rapid burst of emails to test rate limiting:

```bash
# This will trigger rate limiting after 10 emails
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/v1/notification/send \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{"to":"test@example.com","subject":"Test '$i'","textContent":"Test"}' &
done
```

Check logs - you should see rate limit messages after the 10th email.

## Complete Documentation

See `docs/RATE_LIMITER.md` for full documentation including:
- Architecture details
- Advanced usage
- Monitoring and troubleshooting
- Best practices
- API reference
