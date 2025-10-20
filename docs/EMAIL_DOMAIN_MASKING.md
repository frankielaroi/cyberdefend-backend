# Email Domain Masking Guide

## Overview

Email domain masking automatically replaces unverified sender domains with a verified domain to prevent delivery failures. This is essential when sending phishing simulation emails from domains that aren't verified in your email service provider.

## Problem

When sending emails, you may encounter errors like:
```
550 5.7.1 Sending from domain company.com is not allowed
```

This happens when you try to send from a domain that isn't verified in Mailtrap (or your email service provider).

## Solution: Domain Masking

Domain masking automatically:
1. **Detects unverified domains** - Checks if the sender domain is in your allowed list
2. **Replaces the domain** - Changes `user@unverified.com` to `user@verified.com`
3. **Preserves sender name** - Keeps the original sender name for authenticity
4. **Adds Reply-To header** - Sets the original email as Reply-To for responses

## Configuration

### 1. Environment Variables

Add these to your `.env` file:

```env
# Enable domain masking (default: true)
EMAIL_DOMAIN_MASKING_ENABLED=true

# Your verified domain (the domain you want to send from)
MAILTRAP_VERIFIED_DOMAIN=cyber360.tech

# Comma-separated list of allowed/verified domains
# These domains will NOT be masked
ALLOWED_SENDER_DOMAINS=cyber360.tech,yourdomain.com,anotherdomain.com

# Mailtrap sender configuration
MAILTRAP_FROM_EMAIL=noreply@cyber360.tech
MAILTRAP_FROM_NAME=CyberDefend
```

### 2. Verify Your Domain in Mailtrap

Before using domain masking, you must verify at least one domain in Mailtrap:

1. Go to [Mailtrap Dashboard](https://mailtrap.io/)
2. Navigate to **Sending Domains**
3. Click **Add Domain**
4. Enter your domain (e.g., `cyber360.tech`)
5. Add the required DNS records (TXT, DKIM, etc.)
6. Wait for verification (usually a few minutes)

**Important**: The domain you set in `MAILTRAP_VERIFIED_DOMAIN` must be verified in Mailtrap.

## How It Works

### Example 1: Unverified Domain (Masked)

**Input:**
```typescript
await emailService.sendEmail({
  to: 'victim@example.com',
  subject: 'Important Update',
  htmlContent: '<h1>Please click here</h1>',
  fromEmail: 'ceo@company.com',  // Unverified domain
  fromName: 'CEO John Smith'
});
```

**What Happens:**
```
Original: ceo@company.com
Masked:   ceo@cyber360.tech
```

**Email Headers:**
```
From: CEO John Smith <ceo@cyber360.tech>
Reply-To: CEO John Smith <ceo@company.com>
Subject: Important Update
```

**Recipient sees:** "CEO John Smith" as sender (domain is less visible)

### Example 2: Verified Domain (Not Masked)

**Input:**
```typescript
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Newsletter',
  htmlContent: '<p>Hello!</p>',
  fromEmail: 'news@cyber360.tech',  // Verified domain
  fromName: 'CyberDefend Team'
});
```

**What Happens:**
```
No masking needed - domain is verified
```

**Email Headers:**
```
From: CyberDefend Team <news@cyber360.tech>
Subject: Newsletter
```

## Phishing Campaign Integration

Domain masking automatically works with phishing campaigns. When you create a campaign with an unverified sender email, it will be automatically masked:

### Campaign Setup

```typescript
// Create a phishing campaign
await phishingService.createCampaign({
  name: 'CEO Impersonation Test',
  subject: 'Urgent: Update Your Password',
  senderEmail: 'ceo@targetcompany.com',  // Will be masked
  senderName: 'John Doe (CEO)',
  template: '<html>...</html>',
  targets: [...]
});
```

### What Gets Sent

```
From: John Doe (CEO) <ceo@cyber360.tech>
Reply-To: John Doe (CEO) <ceo@targetcompany.com>
```

The recipient sees "John Doe (CEO)" as the sender, making the phishing simulation realistic.

## Logs and Monitoring

Domain masking logs all operations:

### Successful Masking

```
[EmailService] 🎭 Domain masked: ceo@company.com → ceo@cyber360.tech (unverified domain: company.com)
[EmailService] 📧 Reply-To set to: ceo@company.com
[EmailService] Email sent successfully to 1 recipients from ceo@cyber360.tech in 1234ms
```

### No Masking Needed

```
[EmailService] Email sent successfully to 1 recipients from news@cyber360.tech in 1234ms
```

## Advanced Configuration

### Multiple Verified Domains

If you have multiple verified domains, add them all to `ALLOWED_SENDER_DOMAINS`:

```env
ALLOWED_SENDER_DOMAINS=cyber360.tech,mydomain.com,company.net
```

Emails from any of these domains will NOT be masked.

### Disable Domain Masking

To disable domain masking temporarily:

```env
EMAIL_DOMAIN_MASKING_ENABLED=false
```

**Warning**: Disabling masking may cause email delivery failures if you send from unverified domains.

### Change Default Verified Domain

```env
MAILTRAP_VERIFIED_DOMAIN=myverifieddomain.com
```

All masked emails will use this domain.

## Best Practices

### 1. Use Realistic Sender Names

Even though the domain is masked, the sender name is preserved. Use realistic names for phishing simulations:

```typescript
// Good
fromName: 'IT Support Team'
fromName: 'John Smith - CEO'
fromName: 'HR Department'

// Less effective
fromName: 'Test Sender'
fromName: 'Admin'
```

### 2. Verify Your Primary Domain

Always verify the domain you use most frequently (set in `MAILTRAP_VERIFIED_DOMAIN`).

### 3. Test Before Campaigns

Send test emails to verify domain masking works correctly:

```bash
curl -X POST http://localhost:3000/api/notifications/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@mailinator.com",
    "subject": "Domain Masking Test",
    "htmlContent": "<h1>Test</h1>",
    "fromEmail": "ceo@unverified-domain.com",
    "fromName": "Test CEO"
  }'
```

Check the logs to confirm masking occurred.

### 4. Monitor Delivery Rates

Track email delivery rates to ensure masking improves deliverability:

```sql
SELECT 
  COUNT(*) as total_sent,
  COUNT(CASE WHEN email_delivered THEN 1 END) as delivered,
  COUNT(CASE WHEN email_bounced THEN 1 END) as bounced,
  ROUND(COUNT(CASE WHEN email_delivered THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as delivery_rate
FROM phishing_targets
WHERE sent_at > NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Still Getting Domain Errors

**Problem:** `550 5.7.1 Sending from domain cyber360.tech is not allowed`

**Solution:**
1. Verify that `cyber360.tech` (or your domain) is verified in Mailtrap
2. Check DNS records are correctly configured
3. Wait for DNS propagation (up to 48 hours)
4. Verify environment variable is set: `MAILTRAP_VERIFIED_DOMAIN=cyber360.tech`

### Domain Masking Not Working

**Check logs:**
```bash
# Should see messages like:
🎭 Domain masked: original@domain.com → user@verified.com
```

**If not seeing masking logs:**
1. Check `EMAIL_DOMAIN_MASKING_ENABLED=true`
2. Verify environment variables are loaded
3. Restart the application
4. Check if sender domain is in `ALLOWED_SENDER_DOMAINS`

### Reply-To Not Working

**Issue:** Recipients reply to masked address instead of original

**Check:**
1. Verify logs show: `📧 Reply-To set to: original@email.com`
2. Some email clients may not display Reply-To properly
3. Test with different email clients (Gmail, Outlook, etc.)

### Phishing Campaigns Failing

**Error in logs:**
```
❌ Failed to send email to user@example.com: Mail command failed: 550 5.7.1 Sending from domain company.com is not allowed
```

**Solution:**
1. Ensure domain masking is enabled
2. Check that `MAILTRAP_VERIFIED_DOMAIN` is set
3. Verify the domain in Mailtrap
4. Restart the application to load new env variables

## Security Considerations

### SPF/DKIM/DMARC

Domain masking helps with SPF/DKIM/DMARC alignment:

- **Without masking:** Email fails SPF check (sent from unverified domain)
- **With masking:** Email passes SPF check (sent from verified domain)

### Recipient Trust

Recipients will see emails from your verified domain. This can:
- ✅ Improve deliverability
- ✅ Reduce spam flags
- ⚠️ Make phishing simulations more realistic
- ⚠️ Require proper training disclosure

### Compliance

Ensure your phishing simulations comply with:
- Company policies
- Local regulations
- Employee consent requirements
- Proper disclosure after simulations

## Examples

### Example 1: CEO Impersonation Simulation

```typescript
await emailService.sendEmail({
  to: 'employee@company.com',
  subject: 'URGENT: Wire Transfer Needed',
  fromEmail: 'ceo@targetcompany.com',
  fromName: 'Jane Doe - CEO',
  htmlContent: `
    <p>Hi,</p>
    <p>I need you to process an urgent wire transfer...</p>
    <p>Best regards,<br>Jane Doe</p>
  `
});

// Result:
// From: Jane Doe - CEO <ceo@cyber360.tech>
// Reply-To: Jane Doe - CEO <ceo@targetcompany.com>
```

### Example 2: IT Support Simulation

```typescript
await emailService.sendEmail({
  to: 'user@company.com',
  subject: 'Password Reset Required',
  fromEmail: 'support@fake-it-dept.com',
  fromName: 'IT Support',
  htmlContent: `
    <p>Your password will expire soon. Click here to reset:</p>
    <a href="https://your-landing-page.com/reset">Reset Password</a>
  `
});

// Result:
// From: IT Support <support@cyber360.tech>
// Reply-To: IT Support <support@fake-it-dept.com>
```

### Example 3: Bulk Campaign

```typescript
const campaign = await phishingService.createCampaign({
  name: 'Q4 Security Awareness Test',
  senderEmail: 'hr@fakecompany.com',
  senderName: 'Human Resources',
  subject: 'Annual Review - Action Required',
  template: campaignTemplate,
  targets: employeeList
});

await phishingService.launchCampaign(campaign.id);

// All emails automatically masked:
// From: Human Resources <hr@cyber360.tech>
// Reply-To: Human Resources <hr@fakecompany.com>
```

## Summary

✅ **Domain masking is now active** - Automatically enabled for all emails  
✅ **Prevents delivery failures** - No more "domain not allowed" errors  
✅ **Preserves authenticity** - Sender name remains unchanged  
✅ **Reply-To header** - Responses go to original address  
✅ **Works with campaigns** - Phishing simulations automatically masked  
✅ **Configurable** - Easy to customize via environment variables  

**Next Steps:**
1. Verify your domain in Mailtrap
2. Set `MAILTRAP_VERIFIED_DOMAIN` in `.env`
3. Test with a sample email
4. Launch your phishing campaigns!
