# Notification Module

A streamlined notification system for CyberDefend 360 that supports bulk emails via Mailtrap and SMS via Arkesel, with Redis-backed job queues, retry mechanisms, and monitoring.

## Features

- **Multi-channel Notifications**: Email and SMS support
- **Bulk Email Operations**: Efficient bulk email sending with Mailtrap
- **Scheduling**: Time-based and cron-based scheduling
- **Queue Management**: Redis-backed Bull queues for background processing
- **Retry Logic**: Exponential backoff and configurable retry attempts
- **Monitoring**: Comprehensive logging and status tracking
- **Database Tracking**: Complete notification history and preferences

## Installation

The notification module is already integrated into the CyberDefend backend. Ensure you have the required environment variables configured:

### Environment Variables

```env
# Mailtrap Configuration (SMTP Method - Recommended)
MAILTRAP_SMTP_USER=api
MAILTRAP_SMTP_PASS=your_mailtrap_api_token
MAILTRAP_BULK_HOST=bulk.smtp.mailtrap.io  # Used for bulk/phishing emails
MAILTRAP_LIVE_HOST=live.smtp.mailtrap.io  # Used for single emails
MAILTRAP_SMTP_PORT=587

# Legacy Mailtrap Configuration (API Token Method)
MAILTRAP_API_TOKEN=your_mailtrap_api_token
MAILTRAP_FROM_EMAIL=noreply@cyberdefend.com
MAILTRAP_FROM_NAME=CyberDefend

# Arkesel SMS Configuration
ARKESEL_API_KEY=your_arkesel_api_key
ARKESEL_SENDER_ID=CyberDefend
ARKESEL_BASE_URL=https://sms.arkesel.com/api/v2

# Redis Configuration (already configured)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

**Email Transport Configuration:**
- **Bulk Transport** (`bulk.smtp.mailtrap.io`): Used for bulk emails, phishing campaigns, and mass notifications
- **Live Transport** (`live.smtp.mailtrap.io`): Used for single emails, transactional emails, and individual notifications
- The system automatically routes emails to the appropriate transport based on the method called

## Database Migration

Run the following commands to set up the notification tables:

```bash
npm run db:migrate
npm run db:generate
```

## API Endpoints

### Immediate Notifications

#### Send Email
```http
POST /notifications/email/send
Content-Type: application/json
Authorization: Bearer {token}

{
  "to": ["user@example.com"],
  "subject": "Test Email",
  "htmlContent": "<h1>Hello World</h1><p>This is a test email.</p>",
  "textContent": "Hello World\n\nThis is a test email.",
  "category": "Test Email"
}
```

#### Send Bulk Email
```http
POST /notifications/email/bulk-send
Content-Type: application/json
Authorization: Bearer {token}

{
  "recipients": ["user1@example.com", "user2@example.com", "user3@example.com"],
  "subject": "Important Update",
  "content": "This is an important update for all users.",
  "isHtml": false,
  "category": "Bulk Notification"
}
```

#### Send SMS
```http
POST /notifications/sms/send
Content-Type: application/json
Authorization: Bearer {token}

{
  "to": ["+233123456789"],
  "message": "Your verification code is 123456"
}
```

### Scheduled Notifications

#### Schedule Email
```http
POST /notifications/email/schedule
Content-Type: application/json
Authorization: Bearer {token}

{
  "to": ["user@example.com"],
  "subject": "Scheduled Email",
  "htmlContent": "<h1>Hello World</h1>",
  "textContent": "Hello World",
  "schedule": {
    "delay": 3600000,
    "cron": "0 9 * * MON-FRI"
  },
  "retryOptions": {
    "attempts": 3,
    "delay": 5000,
    "exponentialBackoff": true
  },
  "priority": "high"
}
```

#### Schedule SMS
```http
POST /notifications/sms/schedule
Content-Type: application/json
Authorization: Bearer {token}

{
  "to": ["+233123456789"],
  "message": "Scheduled reminder",
  "schedule": {
    "cron": "0 8 * * *"
  }
}
```

### Bulk Operations

#### Bulk Email
```http
POST /notifications/email/bulk
Content-Type: application/json
Authorization: Bearer {token}

[
  {
    "to": ["user1@example.com"],
    "subject": "Bulk Email 1",
    "template": "newsletter"
  },
  {
    "to": ["user2@example.com"],
    "subject": "Bulk Email 2",
    "template": "newsletter"
  }
]
```

### Management

#### Cancel Notification
```http
DELETE /notifications/cancel/email/{jobId}
Authorization: Bearer {token}
```

#### Get Notification Status
```http
GET /notifications/status/{notificationId}
Authorization: Bearer {token}
```

#### Test Services
```http
GET /notifications/test-services
Authorization: Bearer {token}
```

## Email Templates

The template system has been removed in favor of direct content specification. You can now pass HTML and text content directly:

```typescript
// Send email with HTML content
await this.notificationService.sendEmail({
  to: ['user@example.com'],
  subject: 'Welcome to CyberDefend',
  htmlContent: '<h1>Welcome!</h1><p>Thank you for joining us.</p>',
  textContent: 'Welcome! Thank you for joining us.',
  category: 'Welcome Email'
});

// Send bulk email
await this.emailService.sendBulkEmail(
  'Important Update',
  'This is an important system update.',
  ['user1@example.com', 'user2@example.com'],
  false, // isHtml
  'System Update'
);
```

## Usage Examples

### Basic Email Service

```typescript
import { NotificationService } from './notification/services/notification.service';
import { EmailService } from './notification/services/email.service';

@Injectable()
export class UserService {
  constructor(
    private notificationService: NotificationService,
    private emailService: EmailService
  ) {}

  async sendWelcomeEmail(user: User) {
    await this.notificationService.sendEmail({
      to: [user.email],
      subject: 'Welcome to CyberDefend 360',
      htmlContent: `
        <h1>Welcome ${user.firstName}!</h1>
        <p>Thank you for joining CyberDefend 360.</p>
        <p>Your organization: ${user.organization?.name}</p>
      `,
      textContent: `Welcome ${user.firstName}! Thank you for joining CyberDefend 360.`,
      category: 'Welcome Email'
    });
  }

  async sendBulkNotification(users: User[], subject: string, content: string) {
    const recipients = users.map(user => user.email);
    
    await this.emailService.sendBulkEmail(
      subject,
      content,
      recipients,
      false, // isHtml
      'Bulk Notification'
    );
  }
}
```

### Scheduled Notifications

```typescript
async schedulePasswordResetReminder(user: User) {
  await this.notificationService.scheduleEmail({
    to: [user.email],
    subject: 'Password Reset Reminder',
    htmlContent: `<h2>Password Reset Reminder</h2><p>Hello ${user.firstName}, don't forget to reset your password.</p>`,
    textContent: `Password Reset Reminder\n\nHello ${user.firstName}, don't forget to reset your password.`,
    schedule: {
      delay: 24 * 60 * 60 * 1000 // 24 hours
    },
    retryOptions: {
      attempts: 2,
      exponentialBackoff: true
    }
  });
}
```

### Cron-based Notifications

```typescript
async scheduleDailyDigest() {
  await this.notificationService.scheduleEmail({
    to: ['admin@cyberdefend.com'],
    subject: 'Daily Security Digest',
    htmlContent: '<h1>Daily Security Digest</h1><p>Your daily security summary...</p>',
    textContent: 'Daily Security Digest\n\nYour daily security summary...',
    schedule: {
      cron: '0 8 * * *' // Daily at 8 AM
    }
  });
}
```

## Queue Management

The notification system uses Bull queues with Redis:

- **email-queue**: Handles all email processing
- **sms-queue**: Handles all SMS processing

### Queue Configuration

```typescript
// Default job options
{
  removeOnComplete: 50,
  removeOnFail: 50,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
}
```

### Priority Levels

- `critical`: 15
- `high`: 10  
- `normal`: 5 (default)
- `low`: 1

## Error Handling

The system includes comprehensive error handling:

1. **Service-level errors**: Connection failures, API errors
2. **Queue-level errors**: Job failures, retry logic
3. **Database errors**: Logging and status updates
4. **Template errors**: Fallback to plain content

### Retry Strategy

- **Default attempts**: 3
- **Backoff**: Exponential (5s, 25s, 125s)
- **Configurable per notification**
- **Final status tracking**: success/failed/retry

## Monitoring and Logging

### Database Tracking

All notifications are tracked in the `notification_history` table:

- Delivery status
- Attempt counts
- Error messages
- Timestamps
- Metadata

### Logging

Structured logging includes:

- Request/response details
- Performance metrics
- Error tracking
- Service health

## Development

### Adding New Templates

1. Create HTML and text versions in `src/notification/templates/`
2. Use `{{variableName}}` for dynamic content
3. Test with template data

### Extending Services

The module is designed for extensibility:

```typescript
@Injectable()
export class CustomNotificationService {
  constructor(private notificationService: NotificationService) {}

  async sendCustomAlert(data: any) {
    // Custom logic
    return this.notificationService.scheduleEmail({
      // notification config
    });
  }
}
```

## Production Considerations

1. **Rate Limiting**: SMS provider limits (Arkesel)
2. **Queue Monitoring**: Use Bull Dashboard
3. **Redis Scaling**: Consider Redis Cluster for high volume
4. **Content Management**: Store frequently used content in database
5. **Analytics**: Implement delivery rate tracking
6. **Mailtrap Limits**: Monitor API usage and limits

## Troubleshooting

### Common Issues

1. **Mailtrap Connection**: Verify API token and permissions
2. **Arkesel SMS**: Check API key and phone number format
3. **Redis Connection**: Ensure Redis is running and accessible
4. **Content Formatting**: Check HTML/text content formatting

### Debug Commands

```bash
# Check Redis connection
redis-cli ping

# View queue status
npm run queue:status

# Test email service
curl -X GET /notifications/test-services
```

## Security

- All API endpoints require JWT authentication
- Sensitive data is not logged
- Rate limiting on notification endpoints
- Input validation and sanitization
- Content injection protection