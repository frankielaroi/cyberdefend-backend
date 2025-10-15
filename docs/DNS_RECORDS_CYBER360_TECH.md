# DNS Records Template for cyber360.tech

## 📋 Copy these records to your DNS provider

**Domain:** cyber360.tech

---

## 1️⃣ SPF Record (Sender Policy Framework)

**Purpose:** Authorizes Mailtrap to send emails on behalf of cyber360.tech

```
Type: TXT
Host/Name: @
Value: v=spf1 include:_spf.mailtrap.io ~all
TTL: 3600 (or Auto)
Priority: N/A
```

**Copy this value:**
```
v=spf1 include:_spf.mailtrap.io ~all
```

---

## 2️⃣ DKIM Record (DomainKeys Identified Mail)

**Purpose:** Cryptographic authentication for your emails

```
Type: TXT
Host/Name: mailtrap._domainkey
Value: [GET THIS FROM MAILTRAP DASHBOARD - It's unique to your account]
TTL: 3600 (or Auto)
Priority: N/A
```

**⚠️ IMPORTANT:** 
- You MUST get the DKIM value from your Mailtrap dashboard
- It's a long string starting with `k=rsa; p=MIGfMA0GCSq...`
- Each Mailtrap account has a unique DKIM value
- Do NOT use example values - they won't work!

**Where to find it:**
1. Mailtrap Dashboard → Sending → Domains
2. Add cyber360.tech domain
3. Copy the DKIM record value shown

---

## 3️⃣ DMARC Record (Domain-based Message Auth, Reporting & Conformance)

**Purpose:** Email authentication, policy, and reporting

```
Type: TXT
Host/Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech
TTL: 3600 (or Auto)
Priority: N/A
```

**Copy this value:**
```
v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech
```

**⚠️ Optional but Recommended**

**DMARC Policy Levels:**
- `p=none` - Monitor only (recommended for testing)
- `p=quarantine` - Send suspicious emails to spam
- `p=reject` - Reject unauthorized emails (strictest)

---

## 📋 Quick Reference Table

| Record Type | Host/Name | Value | TTL |
|------------|-----------|-------|-----|
| TXT (SPF) | @ | v=spf1 include:_spf.mailtrap.io ~all | 3600 |
| TXT (DKIM) | mailtrap._domainkey | [FROM MAILTRAP] | 3600 |
| TXT (DMARC) | _dmarc | v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech | 3600 |

---

## 🎯 Provider-Specific Instructions

### Cloudflare

1. Log in → Select cyber360.tech → DNS
2. Click "Add record" for each:

**SPF:**
```
Type: TXT
Name: @
Content: v=spf1 include:_spf.mailtrap.io ~all
TTL: Auto
Proxy status: DNS only (gray cloud)
```

**DKIM:**
```
Type: TXT
Name: mailtrap._domainkey
Content: [paste from Mailtrap]
TTL: Auto
Proxy status: DNS only (gray cloud)
```

**DMARC:**
```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech
TTL: Auto
Proxy status: DNS only (gray cloud)
```

---

### GoDaddy

1. Log in → My Products → cyber360.tech → DNS → Add

**SPF:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.mailtrap.io ~all
TTL: 1 Hour
```

**DKIM:**
```
Type: TXT
Name: mailtrap._domainkey
Value: [paste from Mailtrap]
TTL: 1 Hour
```

**DMARC:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech
TTL: 1 Hour
```

---

### Namecheap

1. Log in → Domain List → Manage → Advanced DNS → Add New Record

**SPF:**
```
Type: TXT Record
Host: @
Value: v=spf1 include:_spf.mailtrap.io ~all
TTL: Automatic
```

**DKIM:**
```
Type: TXT Record
Host: mailtrap._domainkey
Value: [paste from Mailtrap]
TTL: Automatic
```

**DMARC:**
```
Type: TXT Record
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech
TTL: Automatic
```

---

### AWS Route 53

1. AWS Console → Route 53 → Hosted Zones → cyber360.tech → Create record

**SPF:**
```
Record name: [leave blank for @]
Record type: TXT
Value: "v=spf1 include:_spf.mailtrap.io ~all"
TTL: 300
```

**DKIM:**
```
Record name: mailtrap._domainkey
Record type: TXT
Value: "[paste from Mailtrap]"
TTL: 300
```

**DMARC:**
```
Record name: _dmarc
Record type: TXT
Value: "v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech"
TTL: 300
```

---

## ✅ Verification Commands

**Check if records are added (Windows PowerShell):**

```powershell
# Check SPF record
nslookup -type=TXT cyber360.tech

# Check DKIM record
nslookup -type=TXT mailtrap._domainkey.cyber360.tech

# Check DMARC record
nslookup -type=TXT _dmarc.cyber360.tech
```

**Expected Results:**

**SPF:**
```
cyber360.tech text = "v=spf1 include:_spf.mailtrap.io ~all"
```

**DKIM:**
```
mailtrap._domainkey.cyber360.tech text = "k=rsa; p=MIGfMA0GCSq..."
```

**DMARC:**
```
_dmarc.cyber360.tech text = "v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech"
```

---

## 🌐 Online Verification Tools

Test DNS propagation worldwide:

1. **MXToolbox** - https://mxtoolbox.com/SuperTool.aspx
   - Enter: `cyber360.tech`
   - Check: TXT records

2. **DNS Checker** - https://dnschecker.org/
   - Enter: `cyber360.tech`
   - Type: TXT
   - Check global propagation

3. **WhatsmyDNS** - https://www.whatsmydns.net/
   - Enter: `cyber360.tech`
   - Type: TXT
   - View worldwide results

---

## ⚠️ Common Mistakes to Avoid

1. **Wrong Record Type**
   - ❌ Using A, CNAME, or MX
   - ✅ Must use TXT

2. **Wrong Host/Name**
   - ❌ Using cyber360.tech instead of @
   - ✅ Use exactly: @, mailtrap._domainkey, _dmarc

3. **Copy-Paste Errors**
   - ❌ Extra spaces, missing characters
   - ✅ Copy entire value, verify

4. **Not Getting DKIM from Mailtrap**
   - ❌ Using example DKIM value
   - ✅ Get YOUR unique DKIM from Mailtrap

5. **Not Saving Records**
   - ❌ Adding but not clicking Save
   - ✅ Always Save after adding

6. **Wrong Domain**
   - ❌ Adding to wrong domain
   - ✅ Verify you're editing cyber360.tech

---

## 📊 Verification Status

**After adding records, verify in Mailtrap:**

1. Mailtrap → Domains → cyber360.tech
2. Click "Verify" or "Check DNS"
3. Wait for checkmarks:
   - ✅ SPF verified
   - ✅ DKIM verified
   - ✅ DMARC verified (optional)

**Status Meanings:**
- 🔴 **Red X** - Not found (wait or check records)
- 🟡 **Yellow** - Pending (DNS propagating)
- 🟢 **Green checkmark** - Verified! ✅

---

## 🕐 Timeline Expectations

| Time | Status |
|------|--------|
| 0 min | Records added to DNS provider |
| 15-30 min | May appear in some locations |
| 2-4 hours | Usually propagated regionally |
| 24 hours | Fully propagated worldwide |
| 48 hours | Maximum propagation time |

**Tip:** DNS propagation varies by provider. Be patient!

---

## 📧 Contact Information

**Need Help?**
- Mailtrap Support: support@mailtrap.io
- Mailtrap Docs: https://help.mailtrap.io/

**DNS Issues?**
- Contact your DNS provider's support
- Provide them this document

---

## 🎯 Final Checklist

- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS (unique value from Mailtrap)
- [ ] DMARC record added to DNS (optional)
- [ ] Records saved in DNS provider
- [ ] Waited for DNS propagation (2-48 hours)
- [ ] Verified with nslookup commands
- [ ] Checked with online tools
- [ ] Verified in Mailtrap dashboard
- [ ] All records show green checkmarks ✅
- [ ] Ready to send emails!

---

**Good luck! 🚀**

*This domain will be verified and ready to send production emails from cyber360.tech*
