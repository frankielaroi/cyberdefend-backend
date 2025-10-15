# Mailtrap Sandbox Configuration Guide

## 🎯 You Have Mailtrap SANDBOX Credentials

Your credentials are for **Mailtrap Sandbox** (testing environment), not production.

**Good news:** Sandbox doesn't require domain verification! ✅

---

## 📋 Your Credentials

```
Host: sandbox.smtp.mailtrap.io
Port: 2525 (or 25, 465, 587)
Username: c737a505c70ad3
Password: ****4c39 (you have the full password)
```

---

## ⚡ Quick Fix: Update Your .env File

Add these to your `.env` file:

```bash
# Mailtrap Sandbox Configuration
MAILTRAP_SANDBOX_MODE=true
MAILTRAP_SMTP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=c737a505c70ad3
MAILTRAP_SMTP_PASS=your-full-password-here

# Sender information (can be any email for sandbox)
MAILTRAP_FROM_EMAIL=noreply@cyber360.tech
MAILTRAP_FROM_NAME=CyberDefend 360
```

**Replace `your-full-password-here`** with your actual password (the one shown as ****4c39).

---

## 🔧 Alternative: Use Existing Variables

If you want to keep the current variable names, update these in `.env`:

```bash
# Update these existing variables:
MAILTRAP_LIVE_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=c737a505c70ad3
MAILTRAP_SMTP_PASS=your-full-password-here

# Sender (can be anything in sandbox mode)
MAILTRAP_FROM_EMAIL=noreply@cyber360.tech
MAILTRAP_FROM_NAME=CyberDefend 360
```

---

## 📧 Mailtrap Sandbox vs Production

### Sandbox (What You Have) 🧪
- **Purpose:** Testing during development
- **Host:** `sandbox.smtp.mailtrap.io`
- **Domain Verification:** NOT required ✅
- **Sender Email:** Can use ANY email address
- **Delivery:** Emails caught in Mailtrap inbox (not delivered to real recipients)
- **Use Case:** Development and testing

### Production (Email API/SMTP) 🚀
- **Purpose:** Sending real emails to customers
- **Host:** `live.smtp.mailtrap.io` or `bulk.smtp.mailtrap.io`
- **Domain Verification:** REQUIRED ❌
- **Sender Email:** Must be from verified domain
- **Delivery:** Real emails delivered to recipients
- **Use Case:** Production environment

---

## ✅ What This Means For You

**Good News:**
1. ✅ No domain verification needed for sandbox
2. ✅ Can use any sender email address
3. ✅ Can test email sending immediately
4. ✅ Emails appear in Mailtrap inbox for testing

**Note:**
- ⚠️ Emails won't reach real recipients (caught by Mailtrap)
- ⚠️ Perfect for development/testing
- ⚠️ Need to upgrade to production for real email delivery

---

## 🚀 Immediate Fix Steps

### Step 1: Update .env File

Open your `.env` file and update these lines:

```bash
# Find these lines and update them:
MAILTRAP_LIVE_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=c737a505c70ad3
MAILTRAP_SMTP_PASS=your-actual-password-here
MAILTRAP_FROM_EMAIL=noreply@cyber360.tech
```

### Step 2: Restart Application

```bash
# Stop the application (Ctrl+C)
# Then start it again
npm run start:dev
```

### Step 3: Test Email Sending

```bash
npx ts-node test-email-verification.ts
```

**Expected Result:**
```
✅ Verification email sent successfully
✅ Check Mailtrap inbox at: https://mailtrap.io/inboxes
```

---

## 📬 Where to Find Your Test Emails

1. Go to **[https://mailtrap.io](https://mailtrap.io)**
2. Login to your account
3. Click **"Email Testing"** in sidebar
4. Click on your **Inbox**
5. You'll see all test emails there!

Emails won't go to real recipients - they're caught by Mailtrap for testing.

---

## 🔍 Verify Configuration

After updating `.env` and restarting, check logs:

**Should see:**
```
[EmailService] Nodemailer transports initialized - Default sender: noreply@cyber360.tech
```

**Test registration:**
```bash
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

**Check logs for:**
```
✅ Verification email sent successfully to test@example.com
```

**Check Mailtrap inbox for the email!**

---

## 🎯 Understanding the Error You Had

Your previous error:
```
550 5.7.1 Sending from domain cyber360.tech is not allowed
```

This happened because:
1. Code was trying to use **production SMTP** (`live.smtp.mailtrap.io`)
2. Production SMTP requires domain verification
3. Your domain wasn't verified

**Solution:**
- Use **sandbox SMTP** (`sandbox.smtp.mailtrap.io`)
- Sandbox doesn't require domain verification
- Perfect for testing!

---

## 📊 Configuration Comparison

### ❌ Old Configuration (Causing Errors)
```bash
MAILTRAP_LIVE_HOST=live.smtp.mailtrap.io  # Production host
MAILTRAP_SMTP_USER=api                     # Wrong username
MAILTRAP_SMTP_PASS=some-api-token          # Wrong password
```

### ✅ New Configuration (Working)
```bash
MAILTRAP_LIVE_HOST=sandbox.smtp.mailtrap.io  # Sandbox host
MAILTRAP_SMTP_USER=c737a505c70ad3            # Your username
MAILTRAP_SMTP_PASS=your-password              # Your password
MAILTRAP_SMTP_PORT=2525                       # Sandbox port
```

---

## 🚀 When to Upgrade to Production

Upgrade to Mailtrap Email API/SMTP when:
- ✅ Ready to send real emails to customers
- ✅ App is in production
- ✅ Need email delivery to real inboxes
- ✅ Willing to verify domain

**For now:** Sandbox is perfect for development! ✅

---

## 📝 Complete .env Example

Here's what your email configuration should look like:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/cyberdefend_db"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# JWT
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

# Frontend
FRONTEND_URL="http://localhost:3001"

# Mailtrap SANDBOX Configuration
MAILTRAP_LIVE_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_BULK_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=c737a505c70ad3
MAILTRAP_SMTP_PASS=your-full-password-here
MAILTRAP_FROM_EMAIL=noreply@cyber360.tech
MAILTRAP_FROM_NAME=CyberDefend 360

# Other configs...
```

---

## ✅ Checklist

- [ ] Updated `.env` with sandbox host
- [ ] Updated `.env` with your username (c737a505c70ad3)
- [ ] Updated `.env` with your password
- [ ] Updated `.env` with port 2525
- [ ] Saved `.env` file
- [ ] Restarted application
- [ ] Tested registration
- [ ] Checked logs for success message
- [ ] Verified email in Mailtrap inbox
- [ ] ✅ Everything working!

---

## 🆘 Troubleshooting

### Still getting errors?

1. **Double-check password** - Make sure you copied the full password
2. **Check port** - Use 2525 (or try 587)
3. **Verify username** - Must be exactly: `c737a505c70ad3`
4. **Restart app** - Environment variables load on startup
5. **Check Mailtrap status** - Visit mailtrap.io to ensure service is up

### Can't find emails?

1. Go to **mailtrap.io** → **Email Testing** → **Inboxes**
2. Click on your inbox
3. Emails should appear there (not in real email inbox!)

---

## 📚 Next Steps

1. ✅ Update `.env` with sandbox credentials
2. ✅ Restart application
3. ✅ Test email sending
4. ✅ Continue development
5. ⏳ Later: Upgrade to production when ready to send real emails

---

**You're using the RIGHT setup for development! Just need to update the configuration! 🚀**
