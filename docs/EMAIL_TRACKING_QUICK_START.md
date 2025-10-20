# Email Tracking Quick Start Guide

## Overview
The email tracking system is now fully implemented and automatically tracks when recipients open emails sent through the CyberDefend platform.

## ✅ What's Implemented

1. **Database Schema** - `EmailTracking` model in Prisma schema
2. **Tracking Service** - `EmailTrackingService` for managing tracking records
3. **Email Integration** - Automatic pixel injection in `EmailService`
4. **Tracking Controller** - Endpoints to handle opens and retrieve stats
5. **Module Setup** - `TrackingModule` integrated into the app

## 🚀 Quick Start

### 1. Set Environment Variables

Add to your `.env` file:

```env
# Enable email tracking (default: true)
EMAIL_TRACKING_ENABLED=true

# Your application base URL
APP_URL=http://localhost:3000
```

### 2. Database Migration Already Applied

The migration `20251015183810_add_email_tracking` has been created and applied. Your database now has the `email_tracking` table.

### 3. Tracking is Automatic!

All emails with HTML content now automatically include tracking pixels. No code changes needed to start tracking!

```typescript
// Just send emails as usual
await notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Test Email',
  htmlContent: '<h1>Hello!</h1><p>This email will be tracked!</p>'
});

// Tracking pixel is automatically injected ✨
```

## 📊 API Endpoints

### Track Email Open (Tracking Pixel)
```
GET /api/track/open/:trackingId
```
Returns a 1x1 transparent GIF. Called automatically when email is opened.

### Get Tracking Statistics
```
GET /api/track/stats/:recipientEmail
```
Returns open rates and statistics for a recipient.

**Example Response:**
```json
{
  "recipientEmail": "user@example.com",
  "totalSent": 15,
  "totalOpened": 12,
  "totalOpens": 23,
  "openRate": 80.00,
  "recentEmails": [...]
}
```

### Get Tracking Details
```
GET /api/track/details/:trackingId
```
Returns detailed information about a specific tracking record.

## 🧪 Testing

### Test Tracking Manually

1. **Send a test email:**
```bash
curl -X POST http://localhost:3000/api/notifications/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email Tracking",
    "htmlContent": "<html><body><h1>Test</h1></body></html>"
  }'
```

2. **Check the response for `trackingId`**

3. **Simulate email open:**
```bash
curl http://localhost:3000/api/track/open/TRACKING_ID_HERE
```

4. **View tracking stats:**
```bash
curl http://localhost:3000/api/track/stats/test@example.com
```

### Check Database Records

```sql
-- View all tracking records
SELECT * FROM email_tracking ORDER BY sent_at DESC LIMIT 10;

-- Check open rate
SELECT 
  COUNT(*) as total_sent,
  COUNT(CASE WHEN open_count > 0 THEN 1 END) as total_opened,
  ROUND(COUNT(CASE WHEN open_count > 0 THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as open_rate
FROM email_tracking;
```

## 📁 Files Created/Modified

### New Files
- `src/common/services/email-tracking.service.ts` - Core tracking service
- `src/common/controllers/tracking.controller.ts` - API endpoints
- `src/common/tracking.module.ts` - Module configuration
- `docs/EMAIL_TRACKING_SYSTEM.md` - Full documentation
- `test/email-tracking.service.spec.ts` - Unit tests

### Modified Files
- `prisma/schema.prisma` - Added EmailTracking model
- `src/notification/services/email.service.ts` - Added pixel injection
- `src/notification/interfaces/notification.interface.ts` - Added trackingId field
- `src/notification/notification.module.ts` - Import TrackingModule
- `src/app.module.ts` - Import TrackingModule

## 🔍 How It Works

1. **Email Sent** → Tracking record created with unique ID
2. **Pixel Injected** → `<img src="/api/track/open/ID" />` added to HTML
3. **Email Opened** → Email client loads the tracking pixel
4. **Backend Called** → `/api/track/open/ID` endpoint receives request
5. **Data Recorded** → IP, user agent, timestamp saved to database
6. **Stats Updated** → Open count and campaign stats incremented

## 🎯 Tracking Pixel Example

When an email is sent, this gets injected automatically:

```html
<img src="https://yourdomain.com/api/track/open/abc123-def456-ghi789" 
     width="1" 
     height="1" 
     style="display:none;opacity:0;position:absolute;" 
     alt="" />
```

## 🔐 Privacy Features

- **Configurable** - Can be disabled via `EMAIL_TRACKING_ENABLED=false`
- **Data Cleanup** - Old tracking data can be purged
- **Transparent** - Recipients can be informed about tracking
- **Secure** - No personal data in tracking URLs

## 📈 Integration with Phishing Campaigns

Tracking automatically integrates with phishing campaigns:

```typescript
// When sending phishing emails, tracking is linked to the campaign
// Campaign statistics are automatically updated when emails are opened

phishingCampaign.emailsOpened  // Auto-incremented on first open
```

## 🛠️ Troubleshooting

### Tracking Not Working?

1. **Check environment variables:**
   ```bash
   echo $EMAIL_TRACKING_ENABLED
   echo $APP_URL
   ```

2. **Verify database table exists:**
   ```sql
   \d email_tracking
   ```

3. **Check application logs:**
   ```
   Look for: "Injected tracking pixel for email to..."
   Look for: "Email open tracked: ..."
   ```

4. **Test endpoint directly:**
   ```bash
   curl -v http://localhost:3000/api/track/open/test-id
   # Should return a GIF image
   ```

### Common Issues

**Issue**: Tracking pixels not injected
- **Solution**: Ensure emails have HTML content (not just text)

**Issue**: Opens not recorded
- **Solution**: Check that `APP_URL` is accessible from email clients

**Issue**: Database errors
- **Solution**: Run `npx prisma migrate dev` to ensure schema is up to date

## 📚 Additional Resources

- Full documentation: `docs/EMAIL_TRACKING_SYSTEM.md`
- Service code: `src/common/services/email-tracking.service.ts`
- Controller code: `src/common/controllers/tracking.controller.ts`
- Test suite: `test/email-tracking.service.spec.ts`

## 🎉 You're Ready!

Email tracking is now active! All HTML emails sent through your platform will automatically include tracking pixels and record open events.

Monitor your email engagement, analyze campaign performance, and improve your email strategies with real-time open tracking data.
