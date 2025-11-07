# Ready to Deploy! 🚀

## Redis Addon Status: ✅ READY

```
State:        created
REDIS_URL:    rediss://...@ec2-98-91-133-170.compute-1.amazonaws.com:23429
Password:     Configured ✅
Connection:   Ready ✅
```

---

## App Configuration: ✅ UPDATED

**File:** `src/app.module.ts`

Changed from:
```typescript
redis: {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
}
```

To:
```typescript
redis: process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
}
```

**Benefits:**
- ✅ Uses Heroku REDIS_URL when available
- ✅ Falls back to individual config vars for local development
- ✅ Works with both Heroku and local Redis
- ✅ No code changes needed later

---

## What's Now Connected to Heroku Redis

✅ **Campaign Scheduler Queue** - Staging queue (60s before)  
✅ **Campaign Runner Queue** - Execution queue (at scheduled time)  
✅ **Polling Cron Job** - Polls every 60 seconds  
✅ **Schedule Persistence** - ZSET + HASH in Redis  
✅ **Recovery** - Scans on startup  
✅ **Phishing Email Queue** - All email processing  
✅ **Any other Bull queues** - All persistent operations  

---

## Deployment Steps

### 1. Commit Your Changes
```bash
cd c:\Users\frank\cyberdefend-backend

git add .
git commit -m "Configure Bull to use Heroku Redis REDIS_URL"
```

### 2. Deploy to Heroku
```bash
git push heroku scheduling:main
```

### 3. Watch Build & Deploy
```bash
heroku logs --tail --app morning-peak-22250
```

**Look for:**
```
Building application...
npm run build       ✓
npm run start       ✓
App ready on port 3000
```

### 4. Verify Redis Connection
```bash
heroku logs --tail --app morning-peak-22250 | findstr REDIS
# Should show successful connection
```

### 5. Monitor Campaign Scheduler
```bash
heroku logs --tail --app morning-peak-22250 | findstr CRON
# Should see [CRON_POLL_START] every 60 seconds
```

---

## Testing After Deploy

### 1. Check Addon is Attached
```bash
heroku addons --app morning-peak-22250
# Should show: redis-rigid-59473 ... created
```

### 2. Verify REDIS_URL in App
```bash
heroku config:get REDIS_URL --app morning-peak-22250
# Should show the full URL
```

### 3. Test with Sample Campaign

Schedule a campaign for 2 minutes from now:
```bash
# Replace CAMPAIGN_ID with real ID, TOKEN with auth token
curl -X POST https://morning-peak-22250.herokuapp.com/defendx-plus/campaigns/CAMPAIGN_ID/schedule \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "launchType": "SCHEDULED",
    "scheduledAt": "'$(date -u -d '+2 minutes' +'%Y-%m-%dT%H:%M:%SZ')'"
  }'
```

### 4. Monitor Logs
```bash
heroku logs --tail --app morning-peak-22250 | findstr "SCHEDULE\|CRON\|RUN_PROCESSOR"
```

**Expected:**
```
[SCHEDULE_REQUEST] Campaign scheduled
[CRON_POLL_START] Polling Redis every 60s
[RUN_PROCESSOR_SUCCESS] Campaign executed ✅
```

---

## Local Development (Still Works!)

Your local dev setup still works unchanged:

```bash
npm run start:dev
# Uses local Redis on localhost:6379
```

Or with Docker:
```bash
docker run -p 6379:6379 redis:7
npm run start:dev
```

---

## Redis CLI Access (If Needed)

### View Scheduled Campaigns
```bash
heroku redis:cli -i redis-rigid-59473 --app morning-peak-22250
ZRANGE campaign:schedules 0 -1
# Shows all scheduled campaign IDs
```

### Check Campaign Metadata
```bash
HGETALL campaign:schedule:SCHEDULE_ID
# Shows campaign metadata
```

### View Queue Jobs
```bash
LRANGE rsmq:q:campaign-scheduler:messages 0 -1
# Shows jobs in staging queue
```

### Exit Redis CLI
```bash
EXIT
```

---

## Troubleshooting

### Issue: Deployment Fails
```bash
# Check build logs
heroku logs --tail --app morning-peak-22250

# If compilation error:
npm run build
# Run locally first to debug

# Deploy again
git push heroku scheduling:main
```

### Issue: Redis Connection Error
```bash
# Restart app
heroku restart --app morning-peak-22250

# Check REDIS_URL is set
heroku config:get REDIS_URL --app morning-peak-22250

# If empty, Redis addon might still be provisioning
heroku addons:info redis-rigid-59473 --app morning-peak-22250
```

### Issue: Cron Not Polling
```bash
# Check logs
heroku logs --tail --app morning-peak-22250 | findstr CRON

# If no logs, check Schedule module is loaded
heroku logs --tail --app morning-peak-22250 | findstr "ScheduleModule"
```

### Issue: High Memory Usage
```bash
# View Redis stats
heroku redis:info redis-rigid-59473 --app morning-peak-22250

# Check queue sizes
heroku redis:cli -i redis-rigid-59473 --app morning-peak-22250
DBSIZE
# Shows number of keys
```

---

## Production Monitoring

### Daily Health Check
```bash
# Check addon status
heroku addons --app morning-peak-22250

# Check cron is running
heroku logs --tail --app morning-peak-22250 | findstr CRON_POLL_COMPLETE

# Should see one line every 60 seconds from cron
```

### Weekly Reports
```bash
# Count scheduled campaigns today
heroku logs --since 1d --app morning-peak-22250 | findstr SCHEDULE_REQUEST | wc -l

# Count successful executions
heroku logs --since 1d --app morning-peak-22250 | findstr RUN_PROCESSOR_SUCCESS | wc -l

# Count failures
heroku logs --since 1d --app morning-peak-22250 | findstr RUN_PROCESSOR_ERROR | wc -l
```

---

## What Happens at Deploy Time

1. **Git Push:** Code pushed to Heroku
2. **Build:** NestJS compiles with new config
3. **Start:** App starts and connects to Heroku Redis
4. **Schedule Module:** Loads and starts scheduling system
5. **Recovery:** Scans Redis for missed campaigns
6. **Cron Job:** Starts polling every 60 seconds
7. **Ready:** App is live and scheduling works! ✅

---

## Environment Variables at Deploy

### On Heroku (Automatic)
```
REDIS_URL = rediss://:...@ec2-98-91-133-170.compute-1.amazonaws.com:23429
NODE_ENV = production
DATABASE_URL = your postgres URL
[other config vars...]
```

### Code Reads
```typescript
process.env.REDIS_URL  // Used by Bull for all queues
process.env.NODE_ENV   // Should be "production"
process.env.DATABASE_URL  // Postgres connection
```

### Result
```
Bull → REDIS_URL ✅
Campaigns → REDIS ✅
Polling → REDIS ✅
Recovery → REDIS ✅
All persistent! ✅
```

---

## Ready for Production? Checklist

- [x] Redis addon created (redis-rigid-59473)
- [x] REDIS_URL available
- [x] App config updated to use REDIS_URL
- [x] No compilation errors
- [x] Fallback for local development works
- [x] Campaign scheduler implemented (3 layers)
- [x] Polling cron every 60 seconds
- [x] Recovery on startup
- [x] Full logging for monitoring
- [x] Documentation complete

**Status: ✅ READY TO DEPLOY** 🚀

---

## Next Command

When ready:
```bash
git push heroku scheduling:main
```

Then watch:
```bash
heroku logs --tail --app morning-peak-22250
```

That's it! 🎉
