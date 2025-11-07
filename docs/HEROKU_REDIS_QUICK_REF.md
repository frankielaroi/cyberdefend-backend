# Redis Addon Quick Reference

## Status Check

### Check Addon is Provisioning
```bash
heroku addons:info redis-rigid-59473 --app morning-peak-22250
```

**Expected Output (While Creating):**
```
State:        creating
```

**Expected Output (When Ready):**
```
State:        available
```

---

## When Provisioning Completes ✅

### Get Redis Connection String
```bash
heroku config:get REDIS_URL --app morning-peak-22250
# Returns: redis://:password@hostname:port
```

### View All Redis Config
```bash
heroku config --app morning-peak-22250 | findstr REDIS
```

### Get Redis Info
```bash
heroku redis:info redis-rigid-59473 --app morning-peak-22250
```

### Connect to Redis CLI
```bash
heroku redis:cli -i redis-rigid-59473 --app morning-peak-22250
```

**In Redis CLI, try:**
```
PING
# Returns: PONG

ZRANGE campaign:schedules 0 -1
# View scheduled campaigns (after you schedule some)

FLUSHDB
# Clear database (be careful!)

EXIT
# Exit CLI
```

---

## Integration With Your App

### Your Code Uses It Automatically

**File:** `src/defendxplus/defendxplus.module.ts`
```typescript
BullModule.forRoot({
  redis: process.env.REDIS_URL || 'redis://localhost:6379'
})
```

When deployed:
1. `REDIS_URL` env var is set by Heroku
2. Bull queues read it automatically
3. Campaign scheduler uses it
4. Polling cron uses it
5. Recovery uses it

**No code changes needed!** ✅

---

## Deployment

### Push Your Code
```bash
git add .
git commit -m "Add Redis scheduling system"
git push heroku scheduling:main
```

### Monitor Logs
```bash
heroku logs --tail --app morning-peak-22250
```

**Look for:**
```
[SCHEDULE_REQUEST] Campaign scheduled
[CRON_POLL_START] Polling every 60s
[RUN_PROCESSOR_SUCCESS] Campaign executed
```

---

## Verify Working

### 1. Check Addon Status
```bash
heroku addons --app morning-peak-22250
# Should show: redis-rigid-59473 ... provisioned
```

### 2. Check Redis Config
```bash
heroku config:get REDIS_URL --app morning-peak-22250
# Should return a redis:// URL (not empty)
```

### 3. Test Connection
```bash
heroku redis:cli -i redis-rigid-59473 --app morning-peak-22250
PING
# Should return: PONG
```

### 4. Deploy App
```bash
git push heroku scheduling:main
```

### 5. Watch Logs
```bash
heroku logs --tail --app morning-peak-22250 | findstr CRON
# Should see [CRON_POLL_START] every 60 seconds
```

---

## Cost

- **Price:** $0.021/hour (~$15/month max)
- **Plan:** Premium-0
- **Region:** US-East-1
- **Memory:** 20GB

Scales down when not in use! ✅

---

## Support

### Heroku Redis Docs
```bash
heroku addons:docs heroku-redis
# Opens Heroku documentation
```

### Check for Issues
```bash
heroku addons --app morning-peak-22250
# Shows status of all addons
```

### Restart App (if needed)
```bash
heroku restart --app morning-peak-22250
```

---

## Timeline

```
Now (T+0min)          - Redis addon creation requested
T+1-5min              - Addon provisioning
T+5min+               - Addon available, REDIS_URL populated
                        Ready to deploy!
T+5min                - Deploy your code
T+5min+               - App starts using Heroku Redis
T+6min                - Cron job starts polling every 60s ✅
```

**Next Step:** Wait for provisioning, then deploy! 🚀
