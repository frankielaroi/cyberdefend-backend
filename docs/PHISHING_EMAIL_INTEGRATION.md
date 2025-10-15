# Phishing Campaign Email Integration

## Overview

This document describes the email sending integration for phishing campaigns in the CyberDefend backend.

## Features Implemented

### 1. Email Service Integration

- **NotificationModule Import**: The `DefendxPlusModule` now imports `NotificationModule` to access email services.
- **EmailService Injection**: The `PhishingCampaignService` injects `EmailService` for sending phishing emails.

### 2. Email Processing

#### `processEmailJobs(campaignId: string)`

This method processes all pending email jobs for a campaign:

- Retrieves campaign details and pending email jobs
- For each job:
  - Fetches target information
  - Marks job as processing
  - Personalizes email content and subject
  - Generates tracking URLs
  - Inserts tracking pixels
  - Sends email via bulk SMTP transport
  - Updates job status (SENT or FAILED)
  - Tracks events and updates campaign statistics
  - Adds delay between emails to avoid rate limiting

#### Email Personalization

The following placeholders are supported in email templates:

- `{{firstName}}` - Target's first name
- `{{lastName}}` - Target's last name
- `{{fullName}}` - Target's full name
- `{{email}}` - Target's email address
- `{{department}}` - Target's department
- `{{jobTitle}}` - Target's job title
- `{{company}}` - Target's company
- `{{landingPageUrl}}` - Tracking URL (replaced with campaign landing page)
- `{{trackingUrl}}` - Tracking URL (alternative placeholder)

### 3. Tracking Integration

#### Email Open Tracking

A tracking pixel is automatically inserted into every phishing email:

```html
<img src="{APP_URL}/api/v1/defendxplus/phishing/track/open/{campaignId}/{targetId}" 
     width="1" height="1" alt="" style="display:none;" />
```

When the email is opened, the pixel loads and triggers the tracking event.

#### Link Click Tracking

Landing page URLs are personalized with campaign and target IDs:

```
{landingPageUrl}?c={campaignId}&t={targetId}
```

This allows tracking when users click links in the email.

### 4. Campaign Launch

#### Immediate Launch

When a campaign is launched immediately (`launchType: 'NOW'`):

1. Campaign status is set to `RUNNING`
2. Email jobs are created for all targets
3. `processEmailJobs()` is called asynchronously
4. Emails are sent in the background
5. Campaign event is logged

#### Scheduled Launch

When a campaign is scheduled for future launch:

1. Campaign status is set to `SCHEDULED`
2. `scheduledAt` timestamp is saved
3. A cron job checks every minute for campaigns ready to launch

### 5. Scheduled Campaign Processing

#### `processScheduledCampaigns()`

This method runs every minute (via `@Cron` decorator):

- Finds campaigns with status `SCHEDULED` and `scheduledAt <= now`
- For each campaign:
  - Updates status to `RUNNING`
  - Creates email jobs for all targets
  - Processes email jobs asynchronously
  - Logs launch event

### 6. Email Job Status Management

Email jobs track the following statuses:

- `PENDING` - Job created, waiting to be processed
- `PROCESSING` - Job is currently being processed
- `SENT` - Email successfully sent
- `FAILED` - Email sending failed
- `CANCELLED` - Job was cancelled (e.g., campaign paused)

### 7. Campaign Statistics

The following statistics are automatically updated:

- `emailsSent` - Increment on successful send
- `emailsDelivered` - Increment when delivery confirmed
- `emailsOpened` - Increment when tracking pixel loads
- `linksClicked` - Increment when landing page visited
- `credentialsEntered` - Increment when credentials submitted
- `phishingReported` - Increment when user reports phishing
- `emailsBounced` - Increment when email bounces

## Email Transport Configuration

### Bulk Transport

Phishing campaigns use the **bulk SMTP transport** for sending emails:

- Host: `MAILTRAP_BULK_HOST` (default: `bulk.smtp.mailtrap.io`)
- Port: `MAILTRAP_SMTP_PORT` (default: `587`)
- Auth: `MAILTRAP_SMTP_USER` and `MAILTRAP_SMTP_PASS`

### Configuration

Ensure these environment variables are set:

```env
MAILTRAP_BULK_HOST=bulk.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=587
MAILTRAP_SMTP_USER=smtp@mailtrap.io
MAILTRAP_SMTP_PASS=your_smtp_password
MAILTRAP_FROM_EMAIL=info@cyber360.tech
MAILTRAP_FROM_NAME=CyberDefend 360

# For tracking URLs
APP_URL=https://your-app-url.com
```

## Usage Example

### Creating and Launching a Campaign

```typescript
// 1. Create a campaign
const campaign = await phishingCampaignService.createCampaign(
  organizationId,
  userId,
  {
    name: 'Q4 Security Training',
    description: 'Test user awareness of phishing emails',
    templateId: 'template-id',
    subject: 'Important: Password Reset Required',
    senderName: 'IT Support',
    senderEmail: 'it-support@cyber360.tech',
    landingPageUrl: 'https://cyber360.tech/phishing/landing',
    targets: [
      {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        department: 'Sales',
        userId: 'user-id'
      }
    ]
  }
);

// 2. Launch immediately
await phishingCampaignService.launchCampaign(
  organizationId,
  campaign.id,
  {
    launchType: 'NOW'
  }
);

// OR schedule for later
await phishingCampaignService.launchCampaign(
  organizationId,
  campaign.id,
  {
    launchType: 'SCHEDULED',
    scheduledAt: '2025-10-20T10:00:00Z'
  }
);
```

### Monitoring Campaign Progress

```typescript
// Get live stats
const stats = await phishingCampaignService.getLiveStats(
  organizationId,
  campaignId
);

console.log(`Emails sent: ${stats.currentStats.emailsSent}`);
console.log(`Emails opened: ${stats.currentStats.emailsOpened}`);
console.log(`Links clicked: ${stats.currentStats.linksClicked}`);

// Get detailed analytics
const analytics = await phishingCampaignService.getCampaignAnalytics(
  organizationId,
  campaignId
);

console.log(`Open rate: ${analytics.riskMetrics.openRate}%`);
console.log(`Click rate: ${analytics.riskMetrics.clickRate}%`);
```

## Error Handling

### Email Job Failures

If an email fails to send:

1. Job status is updated to `FAILED`
2. Error message is stored in `errorMessage` field
3. Campaign continues processing other jobs
4. Failed jobs can be retried manually or automatically

### Domain Verification Issues

If the sender domain is not verified in Mailtrap:

- Email sending will fail with a domain verification error
- Error is logged with detailed information
- See `docs/EMAIL_DOMAIN_SETUP.md` for domain verification instructions

## Best Practices

1. **Test Templates**: Always test templates with a small group before full deployment
2. **Monitor Delivery**: Check campaign statistics regularly during launch
3. **Rate Limiting**: The system includes 100ms delays between emails to avoid rate limiting
4. **Domain Verification**: Ensure sender domains are verified before launching campaigns
5. **Tracking URLs**: Use environment-specific tracking URLs (development, staging, production)
6. **Email Content**: Use HTML templates with proper tracking pixel and link placement

## Troubleshooting

### Emails Not Sending

1. Check environment variables are configured correctly
2. Verify domain is verified in Mailtrap
3. Check email job statuses for error messages
4. Review application logs for detailed error information

### Tracking Not Working

1. Verify `APP_URL` is set correctly
2. Check tracking endpoints are accessible
3. Ensure tracking pixel is present in email HTML
4. Verify landing page URLs include campaign and target IDs

### Scheduled Campaigns Not Launching

1. Verify cron job is running (check logs for "processScheduledCampaigns" entries)
2. Check campaign status is `SCHEDULED`
3. Verify `scheduledAt` timestamp is in the past
4. Check for errors in application logs

## Related Documentation

- [Email Domain Setup](./EMAIL_DOMAIN_SETUP.md)
- [Mailtrap Configuration](./MAILTRAP_SANDBOX_SETUP.md)
- [Multi-Channel Phishing Campaigns](./MULTI_CHANNEL_PHISHING_CAMPAIGNS.md)
- [Anonymous Assessments](./ANONYMOUS_ASSESSMENTS.md)
