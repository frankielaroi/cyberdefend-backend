# Phishing Campaign Test Examples

This directory contains comprehensive test examples and scenarios for the DefendX Plus phishing campaign system.

## 📁 Files Overview

### Campaign Examples

1. **complete-phishing-campaign.json**
   - Full-featured campaign example with all bells and whistles
   - 10 targets across 9 different departments
   - Email tracking, analytics, and personalization
   - Complete email template with HTML and text versions
   - API usage examples for all operations

2. **multi-phase-campaign.json**
   - Progressive difficulty phishing training (3 phases)
   - Phase 1: Easy (obvious phishing)
   - Phase 2: Medium (moderate sophistication)
   - Phase 3: Hard (advanced spear-phishing)
   - Tracks improvement over time
   - Scheduled 1 week apart

3. **bulk-phishing-campaign.json**
   - Bulk email sending to multiple recipients
   - Custom sender configuration
   - Corporate training scenario

4. **scheduled-phishing-phases.json**
   - Multi-phase campaign with scheduling
   - Different templates per phase
   - Department-specific targeting

5. **sms-phishing-example.json**
   - SMS-based phishing simulation
   - Multi-channel attack scenarios

### Testing & Monitoring Examples

6. **circuit-breaker-test.json**
   - Circuit breaker pattern test scenarios
   - Error recovery testing
   - Automatic failover and retry logic
   - Health check integration
   - Manual testing commands

7. **health-check-test.json**
   - System health monitoring scenarios
   - All possible health states (HEALTHY, DEGRADED, UNHEALTHY)
   - Service-specific health checks
   - Performance metrics
   - Monitoring integration examples

## 🚀 Quick Start

### 1. Create a Complete Campaign

```bash
curl -X POST http://localhost:3000/api/v1/defendx-plus/campaigns \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-examples/complete-phishing-campaign.json
```

### 2. Check System Health

```bash
# Full health check
curl -X GET http://localhost:3000/api/v1/defendx-plus/campaigns/system/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Quick health check (for load balancers)
curl -X GET http://localhost:3000/api/v1/defendx-plus/campaigns/system/health/quick \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Launch Campaign

```bash
curl -X POST http://localhost:3000/api/v1/defendx-plus/campaigns/:campaignId/launch \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scheduledAt": "2025-10-20T09:00:00Z"}'
```

## 📊 Campaign Operations

### Create Campaign
```bash
POST /api/v1/defendx-plus/campaigns
```

### Launch Campaign
```bash
POST /api/v1/defendx-plus/campaigns/:campaignId/launch
```

### Pause Campaign
```bash
POST /api/v1/defendx-plus/campaigns/:campaignId/pause
```

### Resume Campaign
```bash
POST /api/v1/defendx-plus/campaigns/:campaignId/resume
```

### Complete Campaign
```bash
POST /api/v1/defendx-plus/campaigns/:campaignId/complete
```

### Get Campaign Analytics
```bash
GET /api/v1/defendx-plus/campaigns/:campaignId/analytics
```

### Get Live Statistics
```bash
GET /api/v1/defendx-plus/campaigns/:campaignId/live-stats
```

### Add Targets
```bash
POST /api/v1/defendx-plus/campaigns/:campaignId/targets
```

### Remove Target
```bash
DELETE /api/v1/defendx-plus/campaigns/:campaignId/targets/:targetId
```

## 🔧 Testing Scenarios

### Test Circuit Breaker

1. **Normal Operation**
   ```bash
   # Campaign launches successfully
   # Circuit state: CLOSED
   ```

2. **Simulate Email Service Failure**
   ```bash
   # Disconnect SMTP server
   # Launch campaign
   # Circuit opens after 5 failures
   ```

3. **Service Recovery**
   ```bash
   # Reconnect SMTP server
   # Wait 60 seconds
   # Circuit moves to HALF-OPEN
   # After 2 successes, circuit closes
   ```

4. **Check Circuit Status**
   ```bash
   GET /api/v1/defendx-plus/campaigns/system/health
   ```

### Test Multi-Phase Campaign

1. **Phase 1: Baseline (Easy)**
   - Schedule: Oct 20, 9:00 AM
   - Expected click rate: 60-80%
   - Expected report rate: 10-20%

2. **Phase 2: Intermediate (Medium)**
   - Schedule: Oct 27, 9:00 AM (1 week later)
   - Expected click rate: 40-60%
   - Expected report rate: 20-35%

3. **Phase 3: Advanced (Hard)**
   - Schedule: Nov 3, 9:00 AM (2 weeks later)
   - Expected click rate: 30-50%
   - Expected report rate: 35-50%

## 📈 Analytics & Reporting

### Campaign Overview
- Total targets
- Emails sent/delivered/opened
- Links clicked
- Credentials entered
- Users who reported phishing

### Department Analytics
- Click rate by department
- Report rate by department
- Risk score by department

### Timeline Data
- Events over time (hourly aggregation)
- Email sent/delivered/opened/clicked timeline

### Performance Metrics
- Average email send time
- Email success rate
- Campaign completion rate

## 🏥 Health Monitoring

### Health Check Response Structure

```json
{
  "status": "HEALTHY|DEGRADED|UNHEALTHY",
  "timestamp": "2025-10-15T10:00:00Z",
  "uptime": 3600000,
  "version": "1.0.0",
  "services": {
    "database": { "status": "...", "message": "..." },
    "emailService": { "status": "...", "message": "..." },
    "queueService": { "status": "...", "message": "..." },
    "circuitBreaker": { "status": "...", "message": "..." }
  },
  "campaigns": { "total": 25, "running": 3, ... },
  "emailJobs": { "pending": 10, "processing": 5, ... },
  "performance": { "avgEmailSendTime": 250, ... }
}
```

### Health States

- **HEALTHY**: All systems operational
- **DEGRADED**: Some non-critical issues (e.g., queue unavailable, using sync processing)
- **UNHEALTHY**: Critical failures (e.g., database down, circuit breaker open)

## 🔄 Circuit Breaker Configuration

```typescript
{
  failureThreshold: 5,      // Open after 5 consecutive failures
  successThreshold: 2,      // Close after 2 successes in half-open
  timeout: 60000,          // Try half-open after 1 minute
  monitoringPeriod: 120000 // Track failures over 2 minutes
}
```

### Circuit States

1. **CLOSED**: Normal operation, all requests pass through
2. **OPEN**: Too many failures, requests rejected (fallback used)
3. **HALF-OPEN**: Testing recovery, limited requests allowed

## 🎯 Use Cases

### Security Awareness Training
Use `multi-phase-campaign.json` to run progressive phishing simulations and track employee improvement over time.

### Department Risk Assessment
Use `complete-phishing-campaign.json` to assess different departments and identify high-risk areas.

### Bulk Testing
Use `bulk-phishing-campaign.json` to quickly test large groups of employees.

### System Reliability Testing
Use `circuit-breaker-test.json` to validate system resilience and error recovery.

## 📝 Notes

- Replace template IDs with actual template UUIDs from your database
- Adjust scheduled times to future dates
- Update target email addresses to your test accounts
- Monitor health endpoint during campaigns
- Check circuit breaker metrics for failures

## 🔐 Authentication

All endpoints require JWT authentication:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

Get token from login endpoint:
```bash
POST /api/v1/auth/login
```

## 🐛 Troubleshooting

### Campaign Not Launching
- Check health endpoint for service status
- Verify circuit breaker state
- Check email service configuration
- Review failed job logs

### High Failure Rate
- Check SMTP configuration
- Verify email templates
- Review circuit breaker metrics
- Check email service health

### Slow Email Sending
- Check queue service status
- Review email job processing rate
- Monitor database performance
- Check circuit breaker for degradation

## 📚 Additional Resources

- [Phishing Campaign API Documentation](../docs/PHISHING_QUICK_START.md)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Bull Queue Documentation](https://docs.bullmq.io/)
- [Health Check Best Practices](https://microservices.io/patterns/observability/health-check-api.html)

---

**Last Updated**: October 15, 2025
**Version**: 1.0.0
