# 🚀 QUICK FIX - Mailtrap Sandbox Configuration

## You're using Mailtrap SANDBOX - Perfect for testing! ✅

### The Problem
You were configured for **production** Mailtrap, but you have **sandbox** credentials.
- Production requires domain verification
- Sandbox does NOT require domain verification ✅

---

## ⚡ 3-Step Fix (2 minutes)

### Step 1: Update Your .env File

Open `c:\Users\frank\cyberdefend-backend\.env` and find these lines:

```bash
MAILTRAP_LIVE_HOST=
MAILTRAP_SMTP_PORT=
MAILTRAP_SMTP_USER=
MAILTRAP_SMTP_PASS=
```

**Replace with:**

```bash
MAILTRAP_LIVE_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_BULK_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=c737a505c70ad3
MAILTRAP_SMTP_PASS=YOUR_FULL_PASSWORD_HERE
MAILTRAP_FROM_EMAIL=noreply@cyber360.tech
MAILTRAP_FROM_NAME=CyberDefend 360
```

**⚠️ Important:** Replace `YOUR_FULL_PASSWORD_HERE` with your actual password (shown as ****4c39 in Mailtrap)

---

### Step 2: Restart Your App

```powershell
# Press Ctrl+C to stop the app
# Then run:
npm run start:dev
```

---

### Step 3: Test It!

```powershell
# Test email verification
npx ts-node test-email-verification.ts
```

**Expected Result:**
```
✅ User registered successfully
✅ Verification email sent successfully to test@example.com
```

---

## 📧 Where to Find Test Emails

1. Go to: **https://mailtrap.io**
2. Login
3. Click: **Email Testing** → **Inboxes**
4. Open your inbox
5. See your test emails! 📬

**Note:** In sandbox mode, emails DON'T go to real recipients - they're caught by Mailtrap for testing.

---

## ✅ Why This Fixes Your Error

**Before (Production config):**
```
Host: live.smtp.mailtrap.io
Error: Domain cyber360.tech not verified ❌
```

**After (Sandbox config):**
```
Host: sandbox.smtp.mailtrap.io
No domain verification needed ✅
```

---

## 🔍 Verify It's Working

After restarting, you should see in logs:

```
[EmailService] Nodemailer transports initialized - Default sender: noreply@cyber360.tech
[AuthService] Verification email sent successfully to user@example.com
```

**No more "domain not allowed" errors!** ✅

---

## 📊 Configuration Comparison

| Setting | Before (Production) | After (Sandbox) |
|---------|-------------------|-----------------|
| Host | live.smtp.mailtrap.io | sandbox.smtp.mailtrap.io |
| Port | 587 | 2525 |
| User | api | c737a505c70ad3 |
| Pass | api-token | Your password |
| Domain Verification | Required ❌ | Not needed ✅ |

---

## 🎯 Summary

**What You Have:** Mailtrap Sandbox credentials  
**What You Need:** Update .env to use sandbox host  
**Time to Fix:** 2 minutes  
**Domain Verification:** Not needed! ✅  

---

## 📝 Your Exact Configuration

Copy this into your `.env` file:

```bash
# Mailtrap Sandbox (Development/Testing)
MAILTRAP_LIVE_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_BULK_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=c737a505c70ad3
MAILTRAP_SMTP_PASS=YOUR_PASSWORD_HERE
MAILTRAP_FROM_EMAIL=noreply@cyber360.tech
MAILTRAP_FROM_NAME=CyberDefend 360
```

**Don't forget:** Replace `YOUR_PASSWORD_HERE` with your actual Mailtrap password!

---

## ✅ Quick Checklist

- [ ] Open `.env` file
- [ ] Update `MAILTRAP_LIVE_HOST` to `sandbox.smtp.mailtrap.io`
- [ ] Update `MAILTRAP_SMTP_PORT` to `2525`
- [ ] Update `MAILTRAP_SMTP_USER` to `c737a505c70ad3`
- [ ] Update `MAILTRAP_SMTP_PASS` to your password
- [ ] Save `.env` file
- [ ] Restart app (`npm run start:dev`)
- [ ] Test with `npx ts-node test-email-verification.ts`
- [ ] Check Mailtrap inbox for email
- [ ] ✅ Working!

---

**That's it! No domain verification needed for sandbox! 🎉**

For detailed info: See `docs/MAILTRAP_SANDBOX_SETUP.md`
