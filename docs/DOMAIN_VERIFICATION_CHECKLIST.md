# Domain Verification Progress Tracker

## 🎯 Goal: Verify cyber360.tech in Mailtrap

**Started:** [Date: _____________]  
**Completed:** [Date: _____________]

---

## 📋 Step 1: Access Mailtrap ⏰ Est. Time: 2 min

- [ ] Opened https://mailtrap.io
- [ ] Logged into account
- [ ] Navigated to "Sending" → "Domains"
- [ ] Found "Add Domain" button

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Completed

---

## 📋 Step 2: Add Domain in Mailtrap ⏰ Est. Time: 2 min

- [ ] Clicked "Add Domain"
- [ ] Entered: `cyber360.tech`
- [ ] Clicked "Add Domain" / "Verify Domain"
- [ ] Mailtrap generated DNS records

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Completed

---

## 📋 Step 3: Copy DNS Records ⏰ Est. Time: 3 min

**SPF Record:**
- [ ] Copied SPF record from Mailtrap
  - Type: `TXT`
  - Name: `@`
  - Value: `___________________________________`

**DKIM Record:**
- [ ] Copied DKIM record from Mailtrap
  - Type: `TXT`
  - Name: `mailtrap._domainkey`
  - Value: `___________________________________`

**DMARC Record (Optional):**
- [ ] Decided to add DMARC
  - Type: `TXT`
  - Name: `_dmarc`
  - Value: `v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech`

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Completed

---

## 📋 Step 4: Access DNS Provider ⏰ Est. Time: 3 min

**DNS Provider:** [Choose one and check]
- [ ] Cloudflare
- [ ] GoDaddy
- [ ] Namecheap
- [ ] Route 53 (AWS)
- [ ] Other: _______________

**Access Steps:**
- [ ] Logged into DNS provider
- [ ] Found cyber360.tech domain
- [ ] Opened DNS management page
- [ ] Ready to add records

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Completed

---

## 📋 Step 5: Add DNS Records ⏰ Est. Time: 5 min

**SPF Record:**
- [ ] Clicked "Add Record"
- [ ] Set Type: `TXT`
- [ ] Set Name: `@`
- [ ] Pasted Value from Mailtrap
- [ ] Set TTL: `Auto` or `3600`
- [ ] Clicked "Save"
- [ ] Record appears in list ✅

**DKIM Record:**
- [ ] Clicked "Add Record"
- [ ] Set Type: `TXT`
- [ ] Set Name: `mailtrap._domainkey`
- [ ] Pasted Value from Mailtrap
- [ ] Set TTL: `Auto` or `3600`
- [ ] Clicked "Save"
- [ ] Record appears in list ✅

**DMARC Record (Optional):**
- [ ] Clicked "Add Record"
- [ ] Set Type: `TXT`
- [ ] Set Name: `_dmarc`
- [ ] Entered Value: `v=DMARC1; p=none; rua=mailto:postmaster@cyber360.tech`
- [ ] Set TTL: `Auto` or `3600`
- [ ] Clicked "Save"
- [ ] Record appears in list ✅

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Completed

---

## 📋 Step 6: Verify DNS Propagation (Optional) ⏰ Est. Time: 5 min

**Using Command Line:**
```powershell
# Check SPF
nslookup -type=TXT cyber360.tech

# Check DKIM
nslookup -type=TXT mailtrap._domainkey.cyber360.tech

# Check DMARC
nslookup -type=TXT _dmarc.cyber360.tech
```

**Results:**
- [ ] SPF record found: ⬜ Yes | ⬜ No | ⬜ Waiting
- [ ] DKIM record found: ⬜ Yes | ⬜ No | ⬜ Waiting
- [ ] DMARC record found: ⬜ Yes | ⬜ No | ⬜ Waiting

**Using Online Tools:**
- [ ] Checked on MXToolbox.com
- [ ] Checked on DNSChecker.org
- [ ] Records showing globally

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Completed | ⬜ Skipped

---

## 📋 Step 7: Wait for Propagation ⏰ Est. Time: 2-48 hours

**Timeline:**
- **Records Added:** [Date/Time: _____________]
- **First Check (2 hours):** [Date/Time: _____________] - Status: ________
- **Second Check (4 hours):** [Date/Time: _____________] - Status: ________
- **Third Check (24 hours):** [Date/Time: _____________] - Status: ________

**Propagation Status:**
- [ ] 0-2 hours: Just added, waiting...
- [ ] 2-4 hours: Partially propagated
- [ ] 4-24 hours: Mostly propagated
- [ ] 24+ hours: Fully propagated

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Completed

**Notes:** _________________________________________________

---

## 📋 Step 8: Verify in Mailtrap ⏰ Est. Time: 2 min

- [ ] Returned to Mailtrap dashboard
- [ ] Navigated to "Domains"
- [ ] Found cyber360.tech in list
- [ ] Clicked "Verify" or "Check DNS" button
- [ ] Waited for verification result

**Verification Results:**
- [ ] SPF: ⬜ Verified ✅ | ⬜ Pending 🟡 | ⬜ Failed ❌
- [ ] DKIM: ⬜ Verified ✅ | ⬜ Pending 🟡 | ⬜ Failed ❌
- [ ] DMARC: ⬜ Verified ✅ | ⬜ Pending 🟡 | ⬜ Failed ❌ | ⬜ Skipped

**Overall Status:** 
- [ ] Fully Verified ✅ (Green checkmark in Mailtrap)
- [ ] Partially Verified 🟡 (Some records verified)
- [ ] Not Verified ❌ (No records verified)

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Completed

---

## 📋 Step 9: Update Application Config ⏰ Est. Time: 2 min

- [ ] Opened `.env` file
- [ ] Confirmed line: `MAILTRAP_FROM_EMAIL="noreply@cyber360.tech"`
- [ ] Confirmed line: `MAILTRAP_FROM_NAME="CyberDefend 360"`
- [ ] Saved `.env` file

**Current Configuration:**
```
MAILTRAP_FROM_EMAIL=_______________________
MAILTRAP_FROM_NAME=________________________
```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Completed

---

## 📋 Step 10: Test Email Sending ⏰ Est. Time: 5 min

**Restart Application:**
- [ ] Stopped application (Ctrl+C)
- [ ] Started application: `npm run start:dev`
- [ ] Checked logs for: "Default sender: noreply@cyber360.tech"

**Run Test Script:**
- [ ] Ran: `npx ts-node test-email-verification.ts`
- [ ] Test script completed successfully
- [ ] No "domain not allowed" errors

**Test Registration:**
- [ ] Created test account via API
- [ ] Checked application logs
- [ ] Saw: "Verification email sent successfully"
- [ ] Received email in inbox
- [ ] Email shows from: noreply@cyber360.tech

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Completed

---

## 🎉 Final Verification

- [ ] Domain shows "Verified" in Mailtrap ✅
- [ ] Application starts without errors
- [ ] Test emails send successfully
- [ ] Emails arrive in recipient inbox
- [ ] Sender shows as noreply@cyber360.tech
- [ ] No "domain not allowed" errors
- [ ] Ready for production! 🚀

---

## 📝 Notes & Issues

**Issues Encountered:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

**Solutions Applied:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

**Additional Notes:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

## 📞 Support Contacts

**Mailtrap Support:**
- Email: support@mailtrap.io
- Docs: https://help.mailtrap.io/

**DNS Provider Support:**
- Name: _______________________
- URL: ________________________
- Phone: ______________________

**Team Contact:**
- Name: _______________________
- Email: ______________________
- Phone: ______________________

---

## 🔄 Retry Checklist (If Verification Fails)

- [ ] Double-check DNS record values (exact match)
- [ ] Verify DNS record types are TXT
- [ ] Wait longer (up to 48 hours)
- [ ] Clear DNS cache: `ipconfig /flushdns`
- [ ] Check with online DNS tools
- [ ] Contact DNS provider support
- [ ] Contact Mailtrap support
- [ ] Try removing and re-adding records

---

## ✅ Completion Certificate

**Domain Verified:** cyber360.tech ✅  
**Verified Date:** [Date: _____________]  
**Verified By:** [Name: _____________]  
**Total Time:** [Hours: _____________]

**Ready for Production:** ⬜ Yes | ⬜ No

---

**Next Steps After Completion:**
1. [ ] Update production environment variables
2. [ ] Deploy to production
3. [ ] Monitor email delivery rates
4. [ ] Set up email alerts/monitoring
5. [ ] Document for team

---

*Print this checklist and check off items as you complete them!*
