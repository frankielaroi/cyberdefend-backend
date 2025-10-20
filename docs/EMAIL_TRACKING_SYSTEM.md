# Email Open Tracking System

## Overview

The email tracking system allows you to track when recipients open emails sent through the CyberDefend platform. It uses invisible tracking pixels (1x1 transparent GIF images) embedded in email HTML content to detect email opens.

## Features

- **Automatic Tracking Pixel Injection**: Automatically injects tracking pixels into all HTML emails
- **Open Detection**: Records when emails are opened (first open and subsequent opens)
- **Metadata Collection**: Captures IP address, user agent, device type, and timestamps
- **Campaign Integration**: Integrates with phishing campaigns to track email engagement
- **Privacy Compliant**: Can be disabled via configuration
- **Statistics API**: Provides endpoints to retrieve tracking statistics

## How It Works

### 1. Email Sending Flow

When an email is sent through the platform:

1. **Create Tracking Record**: A unique tracking ID is generated and stored in the `email_tracking` table
2. **Inject Pixel**: A 1x1 transparent GIF image tag is injected into the HTML content with a unique URL
3. **Send Email**: The email is sent with the tracking pixel embedded

Example tracking pixel:
```html
<img src="https://yourdomain.com/api/track/open/abc123-def456-ghi789" 
     width="1" height="1" 
     style="display:none;opacity:0;position:absolute;" 
     alt="" />
```

### 2. Open Detection

When a recipient opens the email:

1. **Email Client Loads Images**: The email client loads the tracking pixel image
2. **Backend Records Open**: The `/api/track/open/:trackingId` endpoint is called
3. **Metadata Captured**: IP address, user agent, device type, and timestamp are recorded
4. **Statistics Updated**: Open count and campaign statistics are updated

### 3. Data Collected

For each email open, the system records:

- **Tracking ID**: Unique identifier for the email
- **Recipient Email**: Email address of the recipient
- **Email Subject**: Subject line of the sent email
- **Email Type**: Type of email (notification, phishing, assessment, etc.)
- **Sent At**: When the email was sent
- **Opened At**: When the email was first opened
- **Last Opened At**: Most recent open time
- **Open Count**: Number of times the email was opened
- **IP Address**: IP address from which the email was opened
- **User Agent**: Browser/email client information
- **Device Type**: Desktop, mobile, or tablet

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Email Tracking Configuration
EMAIL_TRACKING_ENABLED=true
APP_URL=https://yourdomain.com

# Optional: Base URL for tracking pixels (defaults to APP_URL)
TRACKING_BASE_URL=https://yourdomain.com
```

### Disable Tracking

To disable email tracking globally:

```env
EMAIL_TRACKING_ENABLED=false
```

## Database Schema

### EmailTracking Model

```prisma
model EmailTracking {
  id                String    @id @default(uuid())
  trackingId        String    @unique
  recipientEmail    String
  emailSubject      String?
  emailType         String?
  sentAt            DateTime  @default(now())
  openedAt          DateTime?
  openCount         Int       @default(0)
  lastOpenedAt      DateTime?
  
  ipAddress         String?
  userAgent         String?
  location          String?
  deviceType        String?
  
  userId            String?
  user              User?     @relation(fields: [userId], references: [id])
  
  notificationHistoryId String?
  notificationHistory   NotificationHistory? @relation(fields: [notificationHistoryId], references: [id])
  
  phishingCampaignId String?
  phishingCampaign   PhishingCampaign? @relation(fields: [phishingCampaignId], references: [id])
  
  metadata          String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([trackingId])
  @@index([recipientEmail])
  @@index([sentAt])
  @@map("email_tracking")
}
```

## API Endpoints

### 1. Track Email Open (Pixel Endpoint)

**Endpoint**: `GET /api/track/open/:trackingId`

**Description**: Records email open event when tracking pixel is loaded

**Parameters**:
- `trackingId` (path): Unique tracking identifier

**Response**: Returns a 1x1 transparent GIF image

**Example**:
```
GET https://yourdomain.com/api/track/open/abc123-def456-ghi789
```

### 2. Get Tracking Statistics

**Endpoint**: `GET /api/track/stats/:recipientEmail`

**Description**: Retrieve tracking statistics for a specific recipient

**Parameters**:
- `recipientEmail` (path): Email address of the recipient

**Response**:
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

### 3. Get Tracking Details

**Endpoint**: `GET /api/track/details/:trackingId`

**Description**: Retrieve detailed tracking information for a specific tracking ID

**Parameters**:
- `trackingId` (path): Unique tracking identifier

**Response**:
```json
{
  "id": "uuid",
  "trackingId": "abc123-def456-ghi789",
  "recipientEmail": "user@example.com",
  "emailSubject": "Security Assessment Reminder",
  "emailType": "notification",
  "sentAt": "2025-10-15T10:30:00Z",
  "openedAt": "2025-10-15T11:45:00Z",
  "lastOpenedAt": "2025-10-15T14:20:00Z",
  "openCount": 3,
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "deviceType": "mobile",
  "user": {...},
  "phishingCampaign": {...}
}
```

## Usage Examples

### 1. Sending an Email with Tracking

The tracking is automatically enabled for all emails with HTML content:

```typescript
// In your service
await this.notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Important Security Update',
  htmlContent: '<html><body><h1>Hello!</h1><p>Content here</p></body></html>',
  category: 'security-alert'
});

// Tracking pixel is automatically injected
// Result includes trackingId for reference
```

### 2. Manual Tracking Creation

For custom implementations:

```typescript
import { EmailTrackingService } from './common/services/email-tracking.service';

// Inject the service
constructor(private emailTracking: EmailTrackingService) {}

// Create tracking record
const trackingId = await this.emailTracking.createTracking({
  recipientEmail: 'user@example.com',
  emailSubject: 'Test Email',
  emailType: 'custom',
  userId: 'user-id',
  metadata: { customField: 'value' }
});

// Get tracking pixel HTML
const pixelHtml = this.emailTracking.generateTrackingPixelHtml(trackingId);

// Or inject into existing HTML
const trackedHtml = this.emailTracking.injectTrackingPixel(
  originalHtml,
  trackingId
);
```

### 3. Retrieving Tracking Stats

```typescript
// Get stats for a recipient
const stats = await this.emailTracking.getTrackingStats('user@example.com');

console.log(`Open Rate: ${stats.openRate}%`);
console.log(`Total Opens: ${stats.totalOpens}`);
```

### 4. Manual Open Recording

```typescript
// Record an open event manually
await this.emailTracking.recordOpen(trackingId, {
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  deviceType: 'desktop'
});
```

## Integration with Phishing Campaigns

When sending phishing campaign emails, the tracking system automatically:

1. Creates a tracking record linked to the campaign
2. Updates campaign statistics when emails are opened
3. Tracks unique opens vs. total opens
4. Provides campaign-level analytics

```typescript
// Campaign statistics are automatically updated
phishingCampaign.emailsOpened++;  // Incremented on first open
```

## Privacy and Compliance

### GDPR Compliance

- **Data Retention**: Tracking data can be automatically cleaned up after a specified period
- **User Rights**: Recipients can request deletion of their tracking data
- **Transparency**: Inform users that emails may contain tracking pixels

### Cleanup Old Tracking Data

```typescript
// Remove tracking data older than 90 days
await this.emailTracking.cleanupOldTrackings(90);
```

### Opt-Out

Users can be excluded from tracking by:

1. Sending plain text emails instead of HTML
2. Disabling tracking for specific email types
3. Implementing an opt-out preference in user settings

## Limitations

1. **Image Blocking**: Some email clients block images by default
2. **Privacy Tools**: Browser extensions and email privacy tools may block tracking pixels
3. **Proxy/VPN**: IP addresses may not reflect actual user location
4. **Multiple Opens**: Email clients may pre-load images, causing false opens
5. **Forwarded Emails**: Opens from forwarded emails are counted for the original recipient

## Best Practices

1. **Use for Analytics Only**: Don't rely on tracking for critical business logic
2. **Respect Privacy**: Be transparent about tracking practices
3. **Clean Up Data**: Regularly purge old tracking data
4. **Monitor Performance**: Track false positives and adjust as needed
5. **Test Thoroughly**: Verify tracking works across different email clients

## Troubleshooting

### Tracking Not Working

1. Check `EMAIL_TRACKING_ENABLED` is set to `true`
2. Verify `APP_URL` is correctly configured
3. Ensure HTML content exists (tracking requires HTML)
4. Check database connectivity
5. Review logs for errors

### Low Open Rates

1. Recipients may have image blocking enabled
2. Emails might be landing in spam folders
3. Plain text email clients don't load images
4. Corporate email filters may strip tracking pixels

### Multiple Opens for Single View

This is normal and can occur due to:
- Email client pre-loading images
- Security scanners checking links
- User opening email multiple times
- Email forwarding

Use `openedAt` (first open) for unique opens and `openCount` for total opens.

## Future Enhancements

Potential improvements:

1. **Link Click Tracking**: Track when users click links in emails
2. **Geolocation**: Add IP-based geolocation services
3. **Time-based Analytics**: Track open times and patterns
4. **A/B Testing**: Compare open rates for different email variants
5. **Webhook Notifications**: Real-time notifications for email opens
6. **Advanced Device Detection**: More detailed device and browser information
7. **Heatmaps**: Visual representation of email engagement

## Support

For issues or questions:
- Check application logs: `src/common/services/email-tracking.service.ts`
- Review tracking records in database: `email_tracking` table
- Contact development team for assistance
