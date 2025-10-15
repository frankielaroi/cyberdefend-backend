# Verifying cyber360.tech Domain in Mailtrap - Step by Step Guide

## ✅ Current Status: Domain Verification Process

You've chosen to verify `cyber360.tech` in Mailtrap - the best option for production!

---

## 📋 Step-by-Step Instructions

### Step 1: Access Mailtrap Dashboard

1. Go to **[https://mailtrap.io](https://mailtrap.io)**
2. **Log in** to your account
3. Navigate to **"Sending"** in the left sidebar
4. Click on **"Domains"**

---

### Step 2: Add Your Domain

1. Click the **"Add Domain"** button (usually green/blue button)
2. Enter your domain: **`cyber360.tech`**
3. Click **"Add Domain"** or **"Verify Domain"**

---

### Step 3: Get DNS Records from Mailtrap

Mailtrap will show you DNS records to add. They typically look like this:

#### 📝 SPF Record (Sender Policy Framework)
```
Type: TXT
Name: @ (or cyber360.tech)
Value: v=spf1 include:_spf.mailtrap.io ~all
TTL: 3600 (or Auto)
```

#### 📝 DKIM Record (DomainKeys Identified Mail)
```
Type: TXT
Name: mailtrap._domainkey
Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNA... (Mailtrap will provide this)
TTL: 3600 (or Auto)
```

#### 📝 DMARC Record (Optional but Recommended)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech
TTL: 3600 (or Auto)
```

> **Important:** Copy the exact values from Mailtrap dashboard - don't use the examples above!

---

### Step 4: Add DNS Records to Your Domain Provider

#### If using **Cloudflare**:

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)**
2. Select **cyber360.tech** domain
3. Click **"DNS"** in the left menu
4. Click **"Add record"**

**For SPF Record:**
- Type: `TXT`
- Name: `@`
- Content: `v=spf1 include:_spf.mailtrap.io ~all`
- TTL: `Auto`
- Click **"Save"**

**For DKIM Record:**
- Type: `TXT`
- Name: `mailtrap._domainkey`
- Content: (paste from Mailtrap)
- TTL: `Auto`
- Click **"Save"**

**For DMARC Record:**
- Type: `TXT`
- Name: `_dmarc`
- Content: `v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech`
- TTL: `Auto`
- Click **"Save"**

---

#### If using **GoDaddy**:

1. Go to **[godaddy.com](https://www.godaddy.com)**
2. Sign in and go to **"My Products"**
3. Find **cyber360.tech** and click **"DNS"**
4. Scroll to **"Records"** section
5. Click **"Add"**

**For each record:**
- Select `TXT` as type
- Enter Name, Value as shown by Mailtrap
- Click **"Save"**

---

#### If using **Namecheap**:

1. Go to **[namecheap.com](https://www.namecheap.com)**
2. Sign in → **Domain List** → **Manage** next to cyber360.tech
3. Click **"Advanced DNS"** tab
4. Scroll to **"Host Records"**
5. Click **"Add New Record"**

**For each record:**
- Type: `TXT Record`
- Host: (from Mailtrap, e.g., `@` or `mailtrap._domainkey`)
- Value: (from Mailtrap)
- TTL: `Automatic`
- Click **"Save"**

---

#### If using **Route 53 (AWS)**:

1. Go to **[AWS Console](https://console.aws.amazon.com)**
2. Navigate to **Route 53** → **Hosted Zones**
3. Click on **cyber360.tech**
4. Click **"Create record"**

**For each record:**
- Record name: (from Mailtrap)
- Record type: `TXT`
- Value: (from Mailtrap)
- TTL: `300`
- Click **"Create records"**

---

### Step 5: Verify DNS Records Are Added (Optional Check)

You can verify the DNS records are propagating using command line:

**On Windows PowerShell:**
```powershell
# Check SPF record
nslookup -type=TXT cyber360.tech

# Check DKIM record
nslookup -type=TXT mailtrap._domainkey.cyber360.tech

# Check DMARC record
nslookup -type=TXT _dmarc.cyber360.tech
```

**Or use online tools:**
- [MXToolbox](https://mxtoolbox.com/SuperTool.aspx) - Enter: `cyber360.tech`
- [DNS Checker](https://dnschecker.org/) - Check TXT records

---

### Step 6: Wait for Verification

⏰ **DNS Propagation Time:**
- **Minimum:** 15-30 minutes
- **Average:** 2-4 hours
- **Maximum:** 24-48 hours

> DNS changes can take time to propagate worldwide. Be patient!

---

### Step 7: Verify in Mailtrap

1. Go back to **Mailtrap** → **Domains**
2. Find **cyber360.tech** in the list
3. Click **"Verify"** or **"Check DNS"** button
4. Wait for green checkmarks ✅

**Status indicators:**
- 🔴 **Red/Not Verified** - DNS records not found yet
- 🟡 **Pending** - Records found, validation in progress
- 🟢 **Verified** - All set! You can send emails

---

### Step 8: Update Your Configuration

Once verified, ensure your `.env` has:

```bash
# Use your verified domain
MAILTRAP_FROM_EMAIL="noreply@cyber360.tech"
MAILTRAP_FROM_NAME="CyberDefend 360"
```

---

### Step 9: Test Sending Emails

After verification is complete:

```bash
# Restart your application
npm run start:dev

# Test email sending
npx ts-node test-email-verification.ts
```

**Look for in logs:**
```
✅ [EmailService] Nodemailer transports initialized - Default sender: noreply@cyber360.tech
✅ Verification email sent successfully
❌ NO "domain not allowed" errors
```

---

## 📊 Verification Checklist

Use this checklist to track your progress:

- [ ] Logged into Mailtrap dashboard
- [ ] Added cyber360.tech domain in Mailtrap
- [ ] Copied DNS records from Mailtrap
- [ ] Added SPF record to DNS provider
- [ ] Added DKIM record to DNS provider
- [ ] Added DMARC record to DNS provider (optional)
- [ ] Waited for DNS propagation (2-24 hours)
- [ ] Clicked "Verify" in Mailtrap
- [ ] Domain shows as "Verified" ✅
- [ ] Updated MAILTRAP_FROM_EMAIL in .env
- [ ] Restarted application
- [ ] Tested email sending
- [ ] Emails sending successfully!

---

## 🔍 Troubleshooting

### Issue: Mailtrap can't find DNS records

**Solutions:**
1. **Wait longer** - DNS can take 24-48 hours
2. **Check DNS records** - Use nslookup or online tools
3. **Verify exact values** - Make sure you copied correctly
4. **Check DNS provider** - Some providers have delays
5. **Clear DNS cache** - `ipconfig /flushdns` on Windows

---

### Issue: DNS records added but still not verified

**Check these:**
- Record **Type** must be `TXT` (not A, CNAME, etc.)
- Record **Name/Host** must match exactly (case-sensitive)
- Record **Value** must match exactly (including spaces)
- **TTL** is set (300-3600 is fine)
- Records are **saved** and **published**

---

### Issue: Domain verified but emails still fail

**Solutions:**
1. **Restart application** - Environment variables load on startup
2. **Check .env file** - Ensure MAILTRAP_FROM_EMAIL is correct
3. **Check logs** - Look for "Default sender" message
4. **Clear email queue** - Old emails may still fail
5. **Test with new registration** - Use fresh email address

---

## 📞 Need Help?

### DNS Provider Support
If you're having trouble adding DNS records:
- **Cloudflare:** [Cloudflare Support](https://support.cloudflare.com)
- **GoDaddy:** [GoDaddy Help](https://www.godaddy.com/help)
- **Namecheap:** [Namecheap Support](https://www.namecheap.com/support/)
- **AWS Route 53:** [AWS Support](https://console.aws.amazon.com/support)

### Mailtrap Support
- **Documentation:** [Mailtrap Docs](https://help.mailtrap.io/)
- **Support Email:** support@mailtrap.io
- **Chat:** Available in Mailtrap dashboard

### DNS Verification Tools
- [MXToolbox](https://mxtoolbox.com)
- [DNS Checker](https://dnschecker.org)
- [WhatsmyDNS](https://www.whatsmydns.net)

---

## ⚡ Temporary Solution While Waiting

While waiting for DNS propagation, you can temporarily use:

```bash
# In .env file:
MAILTRAP_FROM_EMAIL="noreply@cyber360.tech"
```

This allows your app to continue working while domain verification is pending.

---

## 🎯 Final Verification Test

Once domain is verified, run this complete test:

```bash
# 1. Restart app
npm run start:dev

# 2. Check startup logs
# Should see: "Default sender: noreply@cyber360.tech"

# 3. Test registration
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

# 4. Check logs
# Should see: "Verification email sent successfully"
# Should NOT see: "domain not allowed"

# 5. Check recipient's email
# Email should arrive with "from: noreply@cyber360.tech"
```

---

## 📈 Best Practices After Verification

1. **Monitor Email Delivery**
   - Check Mailtrap dashboard for delivery stats
   - Monitor bounce rates
   - Review spam complaints

2. **Keep DNS Records Updated**
   - Don't delete DNS records
   - Update if Mailtrap changes them
   - Maintain DMARC policy

3. **Use Proper "From" Names**
   ```bash
   MAILTRAP_FROM_NAME="CyberDefend 360"
   MAILTRAP_FROM_EMAIL="noreply@cyber360.tech"
   ```

4. **Set Reply-To Header** (optional)
   - Add support email for replies
   - E.g., `support@cyber360.tech`

---

## ✅ Success Indicators

You'll know verification is complete when:

1. ✅ Mailtrap dashboard shows green checkmark
2. ✅ Domain status = "Verified"
3. ✅ Test email sends without errors
4. ✅ Recipient receives email
5. ✅ Email shows proper sender domain
6. ✅ Email doesn't land in spam

---

## 📚 Additional Resources

- **Main Documentation:** `docs/EMAIL_DOMAIN_SETUP.md`
- **Quick Reference:** `QUICK_FIX_EMAIL_DOMAIN.md`
- **Email Verification Guide:** `docs/EMAIL_VERIFICATION_IMPLEMENTATION.md`
- **Test Script:** `test-email-verification.ts`

---

**Good luck with the domain verification! 🚀**

*Estimated completion time: 2-48 hours (depending on DNS propagation)*
