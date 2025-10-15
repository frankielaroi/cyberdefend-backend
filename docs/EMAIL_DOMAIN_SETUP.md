# Email Domain Setup Guide

## Problem: Domain Not Authorized Error

If you're seeing this error:
```
550 5.7.1 Sending from domain cyber360.tech is not allowed
```

This means Mailtrap doesn't recognize your sending domain. Here's how to fix it:

## Solution 1: Verify Your Domain in Mailtrap (Production Solution)

### Step 1: Log into Mailtrap
1. Go to [https://mailtrap.io](https://mailtrap.io)
2. Navigate to **Sending Domains** section

### Step 2: Add Your Domain
1. Click **"Add Domain"**
2. Enter your domain: `cyber360.tech`
3. Click **"Add Domain"**

### Step 3: Verify Domain with DNS Records
Mailtrap will provide DNS records that you need to add to your domain:

#### SPF Record
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.mailtrap.io ~all
```

#### DKIM Record
```
Type: TXT
Name: mailtrap._domainkey
Value: [Mailtrap will provide this]
```

#### DMARC Record (Optional but Recommended)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech
```

### Step 4: Wait for Verification
- DNS propagation can take 24-48 hours
- Check verification status in Mailtrap dashboard
- Once verified, emails will send successfully

### Step 5: Update Environment Variables
```bash
MAILTRAP_FROM_EMAIL="noreply@cyber360.tech"
MAILTRAP_FROM_NAME="CyberDefend 360"
```

---

## Solution 2: Use Mailtrap Sandbox Email (Development/Testing)

For development and testing, use a pre-verified email address from Mailtrap.

### Step 1: Get Your Mailtrap Inbox Email
1. Go to Mailtrap dashboard
2. Navigate to **Email Testing** → **Inboxes**
3. Click on your inbox
4. Copy the inbox email address (e.g., `abc123@inbox.mailtrap.io`)

### Step 2: Update Your .env File
```bash
# Use Mailtrap inbox email for testing
MAILTRAP_FROM_EMAIL="your-inbox@inbox.mailtrap.io"
MAILTRAP_FROM_NAME="CyberDefend 360 [DEV]"
```

### Step 3: Restart Your Application
```bash
# Stop the application
# Update .env
# Restart
npm run start:dev
```

---

## Solution 3: Use a Temporary Generic Domain

Until your domain is verified, use a generic email:

```bash
# In your .env file
MAILTRAP_FROM_EMAIL="noreply@example.com"
MAILTRAP_FROM_NAME="CyberDefend 360"
```

**Note:** This is only for testing. For production, you should verify your actual domain.

---

## Checking Current Configuration

### Check What Email is Being Used
Look at your application logs when it starts:
```
[Nest] INFO [EmailService] Nodemailer transports initialized (bulk + live) - Default sender: noreply@cyber360.tech
```

This shows which email address is being used as the sender.

### Check Environment Variables
```bash
# Windows PowerShell
echo $env:MAILTRAP_FROM_EMAIL

# Linux/Mac
echo $MAILTRAP_FROM_EMAIL
```

### Test Email Sending
Use the test script:
```bash
npx ts-node test-email-verification.ts
```

---

## Current Status of Your Setup

Based on the error message, here's what we know:

1. ✅ Mailtrap is configured and connected
2. ✅ SMTP credentials are working
3. ❌ Domain `cyber360.tech` is NOT verified in Mailtrap
4. ✅ Email service code is working correctly

---

## Recommended Action Plan

### For Development (Immediate Fix)
1. Get a verified email from Mailtrap inbox
2. Update `MAILTRAP_FROM_EMAIL` in `.env`
3. Restart application
4. Test registration

### For Production (Long-term Fix)
1. Add `cyber360.tech` domain to Mailtrap
2. Add DNS records to domain provider
3. Wait for verification (24-48 hours)
4. Update production environment variables
5. Deploy and test

---

## Verifying the Fix

After making changes, test with:

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+233501234567",
    "organization": {
      "name": "Test Org",
      "size": "SMALL",
      "sector": "TECHNOLOGY",
      "phone": "+233501234567"
    }
  }'
```

**Look for in logs:**
- ✅ `Verification email sent successfully to test@example.com`
- ❌ NO error messages about domain not allowed

---

## Alternative Email Providers

If Mailtrap domain verification is taking too long, consider:

### SendGrid (Free Tier Available)
- Easier domain verification
- 100 emails/day free
- Better for production

### AWS SES
- Very reliable
- Pay per email (cheap)
- Requires domain verification

### Mailgun
- Good API
- Free tier available
- Easy domain setup

---

## Troubleshooting

### Issue: Still getting domain error after updating .env
**Solution:** Restart the application completely. Environment variables are loaded on startup.

### Issue: Don't have access to DNS records
**Solution:** Contact your domain administrator or use Solution 2 (Mailtrap inbox email).

### Issue: Email sends but arrives in spam
**Solution:** Add proper DNS records (SPF, DKIM, DMARC) and verify domain.

### Issue: Need to test immediately
**Solution:** Use Mailtrap inbox email (Solution 2) - works instantly.

---

## Quick Reference

### Check Current Sender Email
```typescript
// In email.service.ts initializeTransports()
this.logger.log(`Default sender: ${this.defaultSender.email}`);
```

### Environment Variable Priority
1. `MAILTRAP_FROM_EMAIL` (environment variable)
2. `noreply@cyber360.tech` (fallback in code)

### Test Email Service
```bash
npx ts-node test-email-verification.ts
```

---

## Need Help?

1. Check Mailtrap documentation: https://help.mailtrap.io/
2. Verify your .env file has correct values
3. Check application startup logs
4. Test with curl commands above
5. Contact Mailtrap support if domain verification issues persist
