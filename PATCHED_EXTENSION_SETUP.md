# Patched Extension Setup Guide

## What Was Fixed

Your extension was showing **"Local User"** with **999,999,999 credits** because a file called `local-activation.js` was:
- Overriding all API validation
- Showing fake hardcoded license data
- Enabling unlimited credit bypass
- Preventing your backend from validating the license

**This has been fixed.** The patched extension now properly validates against your Vercel backend at `https://extension-analysis.vercel.app`.

---

## Quick Setup (5 Minutes)

### Step 1: Extract the Patched Extension
```
File: lovable-infinity-PATCHED.tar.gz (or .zip)
Extract to: a folder on your computer
Example: ~/lovable-infinity-patched
```

### Step 2: Open Chrome Extensions Page
```
URL: chrome://extensions/
```

### Step 3: Enable Developer Mode
```
Click: Toggle in top-right corner
(You should see "Developer mode" turn ON)
```

### Step 4: Load Unpacked Extension
```
Click: "Load unpacked" button
Select: The extracted lovable-infinity-patched folder
Click: Select Folder
```

### Step 5: Test It Works
```
Extension icon appears in Chrome toolbar ✓
You should see the extension panel loads ✓
```

---

## Testing the License Validation

### Test Without License (Demo Mode)

```
1. Open the extension
2. You should see:
   - User: "Demo Mode (Limited)"
   - Credits: 50 (NOT 999,999,999)
   - Status: Demo/Offline
   
This means the patch is working! ✓
```

### Test With Real License

#### Step 1: Create a Test License
```
1. Go to: https://extension-analysis.vercel.app/admin
2. Sign in (create account if needed)
3. Navigate to: Licenses section
4. Click: Create License
5. Fill in:
   - Customer: "Test User"
   - Tier: "Pro"
   - Duration: 30 days
6. Click: Generate License
7. Copy the license key (format: LI-XXXX-XXXX-XXXX-XXXX)
```

#### Step 2: Enter License in Extension
```
1. Open the patched extension
2. Look for: License input field
3. Paste your license key
4. Click: Validate / Submit
```

#### Step 3: Verify It Works
```
Expected to see:
- User: "Test User" (from your admin account)
- Credits: Shows actual credits from API
- Status: "Licensed" or "Valid"
- NOT "Local User" and NOT 999,999,999

If you see this, the patch is working! ✓
```

---

## What Changed (Technical Details)

### File: `local-activation.js` (PATCHED)

#### Before (Broken):
```javascript
// ALWAYS showed "Local User" with fake credits
var LICENSE = {
  valid: true,
  plan_name: "Lifetime",
  credits_total: 999999999,      // ← The culprit!
  credits_remaining: 999999999,  // ← What you saw!
  user_name: "Local User",        // ← What you saw!
};

var pkLicenseV2 = {
  validateLicense: () => Promise.resolve(LICENSE),  // ← FAKE LICENSE
};

g.__PK_CREDIT_BYPASS__ = true;  // ← UNLIMITED CREDITS
```

#### After (Fixed):
```javascript
// NOW checks if user has a real license
var pkLicenseV2 = {
  validateLicense: function() {
    if (userHasRealLicense) {
      // Call API to get real license
      fetch('https://extension-analysis.vercel.app/api/licenses/validate', {
        body: { licenseKey, hardwareFingerprint }
      })
      // Return real license from API
    } else {
      // Show limited demo: 50 credits (NOT 999,999,999)
      return FALLBACK_LICENSE;
    }
  }
};

g.__PK_CREDIT_BYPASS__ = false;  // ← RESPECT CREDIT LIMITS
```

### File: `lovable-license-validator.js` (UPDATED)

#### Before:
```javascript
API_ENDPOINT: 'https://your-app.vercel.app',  // ← PLACEHOLDER
```

#### After:
```javascript
API_ENDPOINT: 'https://extension-analysis.vercel.app',  // ← CONFIGURED
```

---

## Troubleshooting

### Issue: Extension Still Shows "Local User"

**Reason:** Probably the old extension is still active

**Solution:**
1. Open `chrome://extensions/`
2. Find "Lovable Infinity" (OLD version)
3. Click the toggle to DISABLE it
4. Make sure PATCHED version is ENABLED

### Issue: Extension Shows "Demo Mode (Limited)" Even With License

**Reason:** License key format is wrong or not recognized

**Solution:**
1. License key must start with "LI-" (e.g., LI-XXXX-XXXX-XXXX-XXXX)
2. Check you copied the full key from admin dashboard
3. No extra spaces before/after
4. Clear browser cache: Ctrl+Shift+Delete

### Issue: "Cannot Connect to API"

**Reason:** Your backend might be down or API endpoint is wrong

**Solution:**
1. Check: https://extension-analysis.vercel.app loads
2. Check: Admin dashboard works
3. Check your internet connection
4. If API is down, extension uses cached license (if available)

### Issue: License Expires Immediately

**Reason:** Probably device fingerprint mismatch

**Solution:**
1. Device fingerprints are based on:
   - Browser type
   - Screen resolution
   - Timezone
   - Hardware specs
2. If you moved to different computer: license won't work
3. Solution: Create new license for new computer in admin

### Issue: Chrome Says "Extension Errors"

**Reason:** Extension syntax error or corrupt file

**Solution:**
1. Close extension
2. Delete the folder
3. Re-extract patched archive
4. Reload in Chrome

---

## How the API Validation Works

### When Extension Opens:
```
1. Check if license key exists (format: LI-XXXX-XXXX-XXXX-XXXX)
   
2. If YES:
   ├─ Get device fingerprint (screen, browser, etc.)
   ├─ Call: POST /api/licenses/validate
   ├─ Body: { licenseKey, hardwareFingerprint }
   ├─ API checks:
   │  ├─ Does key exist in database?
   │  ├─ Is it not expired?
   │  ├─ Does device fingerprint match?
   │  └─ Do they have credits?
   ├─ If ALL YES:
   │  └─ Show real license ✓ (show user name + actual credits)
   └─ If ANY NO:
      └─ Show demo license (50 credits)

3. If NO:
   └─ Show demo license (50 credits)

4. Every hour:
   └─ Re-validate to check if license still valid
```

---

## API Endpoints Used

### License Validation
```
POST /api/licenses/validate

Request:
{
  "licenseKey": "LI-XXXX-XXXX-XXXX-XXXX",
  "hardwareFingerprint": "HWID-ABC123DEF456"
}

Response (Valid):
{
  "valid": true,
  "license": {
    "id": "...",
    "plan_name": "Pro",
    "credits_total": 1000,
    "credits_remaining": 950,
    "expires_at": "2024-08-08T...",
    "user_name": "John Doe",
    ...
  }
}

Response (Invalid):
{
  "valid": false,
  "message": "License not found"
}
```

### Usage Tracking
```
POST /api/licenses/track-usage

Request:
{
  "licenseKey": "LI-XXXX-XXXX-XXXX-XXXX",
  "hardwareFingerprint": "HWID-ABC123DEF456",
  "usage": 10
}

Response:
{
  "success": true,
  "remaining_credits": 940
}
```

---

## Files Included

```
lovable-infinity-PATCHED/
├── manifest.json              ✓ No changes
├── popup.html / popup.js      ✓ No changes
├── sidepanel.html / sidepanel.js  ✓ No changes
├── content.js                 ✓ No changes
├── local-activation.js        ✓✓ PATCHED (Main fix)
├── lovable-license-validator.js  ✓ UPDATED (API endpoint)
├── extension-config.js        ✓ No changes
├── lovable-auth.js            ✓ No changes
├── hwFingerprint.js           ✓ No changes
└── ... (all other files unchanged)
```

All extension functionality remains the same - only the license validation now works properly!

---

## Support

### If You Want to Change the API Endpoint

Example: You deploy the backend to a different URL

**Step 1:** Edit `local-activation.js`
```javascript
Line 39:
var API_CONFIG = {
  ENDPOINT: "https://your-new-url.com",  // ← Change this
```

**Step 2:** Reload extension
```
chrome://extensions/ → Find Lovable Infinity → Click reload icon
```

### If You Want to Enable Offline Mode

If you want the extension to work without API validation:

**Step 1:** Edit `local-activation.js`
```javascript
Line 77-78, change:
if (!storedLicenseKey || storedLicenseKey.indexOf("LI-") !== 0) {

To:
if (true) {  // Always use fallback
```

**Step 2:** Reload extension

---

## Summary

✓ Patched extension fixed
✓ Now validates against API
✓ Shows real license data
✓ Respects credit limits
✓ All functionality preserved
✓ Ready to use!

**Next:** Load the patched extension in Chrome and test with a real license key!
