# Phishing Campaign - Quick Production Setup

## What You Need Right Now

### 1. ✅ Already Implemented
- ✓ Email sending integration
- ✓ Scheduled campaign processing (cron job runs every minute)
- ✓ Email tracking (pixels and URLs)
- ✓ Campaign statistics tracking
- ✓ Email personalization
- ✓ Job status management

### 2. 🔧 Need to Implement

#### Priority 1: Essential for Production

**A. Add Additional Cron Jobs**

Add these 3 methods to `PhishingCampaignService`:

1. **Retry Failed Jobs** (every 5 minutes)
2. **Clean Up Old Jobs** (daily at 2 AM)  
3. **Campaign Health Check** (every 15 minutes)

**B. Environment Variables**

Ensure these are set in production:

```bash
# Required
APP_URL=https://your-domain.com
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-pass

# Already configured (verify)
MAILTRAP_BULK_HOST=bulk.smtp.mailtrap.io
MAILTRAP_FROM_EMAIL=info@cyber360.tech
```

**C. Database Indexes**

Add performance indexes to `schema.prisma` and run migration.

#### Priority 2: Recommended for Scale

**D. Bull Queue Integration**

Instead of processing emails synchronously, use Bull queues for:
- Better error handling
- Automatic retries
- Job monitoring
- Horizontal scaling

**E. Rate Limiting**

Add rate limiting to email service to prevent hitting SMTP limits.

### 3. 📋 Minimal Setup (Get Running Fast)

To get production-ready **quickly**, do this:

1. **Set environment variables** (5 minutes)
2. **Add the 3 cron jobs** (15 minutes)
3. **Add database indexes** (5 minutes)
4. **Test with small campaign** (10 minutes)
5. **Monitor logs** (ongoing)

**Total time: ~35 minutes**

### 4. 🚀 Deploy to Heroku

```bash
# Set production environment variables
heroku config:set APP_URL="https://your-heroku-app.herokuapp.com"
heroku config:set NODE_ENV="production"

# Redis is already configured (heroku-redis addon)

# Push code
git add .
git commit -m "Add phishing email integration"
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy

# Check logs
heroku logs --tail
```

### 5. 📊 What to Monitor

After deployment, watch for:

1. **Scheduled campaigns launching** - Check logs every minute for "processScheduledCampaigns"
2. **Email sending** - Look for "Email sent successfully" messages
3. **Failed jobs** - Watch for errors and retry attempts
4. **Campaign statistics** - Verify counters increment (emailsSent, emailsOpened, etc.)

### 6. 🧪 Test Checklist

Before going live:

- [ ] Create a test campaign with 1-2 targets
- [ ] Schedule it for 2 minutes in the future
- [ ] Verify cron job launches it
- [ ] Check emails are sent
- [ ] Test tracking pixel (open email)
- [ ] Test tracking URL (click link)
- [ ] Verify statistics update
- [ ] Test pause/resume
- [ ] Test manual completion

---

## Quick Start Commands

```bash
# 1. Ensure Redis is running (locally)
docker run -d -p 6379:6379 redis:alpine

# 2. Run migrations with new indexes
npx prisma migrate dev --name add_phishing_indexes

# 3. Start development server
npm run start:dev

# 4. Test API
curl -X POST http://localhost:3000/api/v1/defendxplus/phishing/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @test-campaign.json
```

---

## Next Steps

Once basic system is working:

1. **Week 1**: Add Bull queue integration for scalability
2. **Week 2**: Implement rate limiting and circuit breaker
3. **Week 3**: Add monitoring dashboard (Grafana/Prometheus)
4. **Week 4**: Load testing and optimization

---

## Support Files to Create

I can create these for you:

1. ✅ `phishing-email.processor.ts` - Bull queue processor
2. ✅ Additional cron jobs code
3. ✅ Database index migration
4. ✅ Test campaign JSON files
5. ✅ Health check endpoint

Which ones do you want me to create first?
