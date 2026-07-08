# Complete Guide: Updating Your Lovable Infinity Extension for License Validation

## Overview

Your extension currently validates licenses against the old system. We've built a complete new License Validator backend that your extension will now use instead.

This guide will help you update the extension to work with the new system.

---

## What Changed

| Aspect | Old System | New System |
|--------|-----------|-----------|
| **API Endpoint** | Old Lovable API | Your custom `/api/licenses/validate` |
| **License Format** | `LI-XXXX-XXXX-XXXX-XXXX` | Same (compatible) |
| **Device Binding** | Hardware fingerprinting | Enhanced fingerprinting (included) |
| **Validation** | Server-side only | Server-side + usage tracking |
| **Expiry Handling** | Server response | Server response + status checks |
| **Usage Quota** | Not tracked | Fully tracked with daily limits |

---

## Quick Update Steps

### Step 1: Download Modified Files

The modified files are ready in your v0 project:

```
/public/extension-integration/
├── modified-lovable-auth.js     → Replace your lovable-auth.js
└── modified-background.js       → Replace your background.js
```

You can download them from the **Preview** → **Files** section in v0.

### Step 2: Update API Configuration

Both files have this line near the top:

```javascript
API_BASE: 'https://your-domain.vercel.app', // CHANGE THIS
```

Replace `https://your-domain.vercel.app` with your actual deployment URL.

**When you deploy to Vercel:**
- Your API will be at: `https://your-vercel-app-name.vercel.app`
- Update both files with this URL

### Step 3: Replace Files in Your Extension

1. **Open your extension folder** (the one with `manifest.json`)
2. **Backup original files:**
   - `lovable-auth.js` → `lovable-auth.js.backup`
   - `background.js` → `background.js.backup`
3. **Replace with new files:**
   - Copy `modified-lovable-auth.js` → rename to `lovable-auth.js`
   - Copy `modified-background.js` → rename to `background.js`

### Step 4: Update manifest.json (if needed)

The new files are compatible with the existing manifest.json, but verify these permissions exist:

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "tabs",
    "sidePanel",
    "cookies"
  ],
  "host_permissions": [
    "https://*.lovable.dev/*",
    "https://lovable.dev/*"
  ]
}
```

### Step 5: Reload Extension in Chrome

1. Open `chrome://extensions/`
2. Find your Lovable Infinity extension
3. Click the ↻ **Reload** button
4. Check for errors in the extension's background logs

---

## How License Activation Works Now

### When User Enters License Key

1. **Extension stores** license key in `chrome.storage.local`
2. **Background script triggers** validation check
3. **API call is made** to `/api/licenses/validate` with:
   - License key
   - Device hardware fingerprint
   - Timestamp

### Validation Response

The API returns:

```javascript
{
  valid: true,                    // Is license valid?
  status: "active",               // "active", "expiring_soon", "expired", etc
  plan_name: "Pro",               // License tier
  plan_type: "pro_monthly",       // Internal tier ID
  expires_at: "2024-12-31T...",   // Expiry date
  usage_limit: 1000,              // Daily API calls allowed
  usage_count: 245,               // Used today
  max_seats: 5,                   // Max devices
  seats_used: 1,                  // Devices currently using it
  hardware_bindings: ["fp_123..."] // Bound devices
}
```

### Extension UI Updates

- ✓ **Green badge**: License is valid and active
- ⚠ **Yellow badge**: License expiring soon
- ✗ **Red badge**: License invalid/expired
- ! **Pink badge**: Error during validation

---

## License Validation Flow

```
User Installs Extension
        ↓
    Load Extension
        ↓
    Background Script Starts
        ↓
    Check for stored license key
        ↓ (if found)
    Generate device fingerprint
        ↓
    Call POST /api/licenses/validate
        ↓ (with license key + fingerprint)
    Server validates and returns status
        ↓
    Store result in chrome.storage.local
        ↓
    Update UI badge (✓, ⚠, or ✗)
        ↓
    Check every 1 hour (auto-refresh)
```

---

## API Endpoints Called by Extension

### 1. Validate License

**POST** `/api/licenses/validate`

```javascript
Request Body:
{
  licenseKey: "LI-ABCD-1234-EFGH-5678",
  hardwareFingerprint: "fp_abc123def456",
  timestamp: 1720000000000
}

Response:
{
  valid: true,
  status: "active",
  plan_name: "Pro",
  expires_at: "2024-12-31T23:59:59Z",
  usage_limit: 1000,
  usage_count: 245,
  max_seats: 5,
  seats_used: 1
}
```

### 2. Track Usage

**POST** `/api/licenses/track-usage`

Called every 1 hour to report extension usage.

```javascript
Request Body:
{
  licenseKey: "LI-ABCD-1234-EFGH-5678",
  hardwareFingerprint: "fp_abc123def456",
  timestamp: 1720000000000
}

Response:
{
  success: true,
  usage_count: 246,
  usage_limit: 1000,
  remaining: 754
}
```

---

## Device Fingerprinting

The new system binds licenses to devices using a fingerprint based on:

- Browser user agent
- Screen resolution
- Browser language
- Hardware cores available
- Timezone offset
- Browser plugin count

**Why?** This prevents users from sharing a single license across multiple machines.

**Reset device binding:**
- User can clear browser cache
- Or contact admin to remove device binding
- Then re-activate on new device

---

## Testing the Integration

### Test Locally Before Deploying

1. **Update files** with your localhost test URL:
   ```javascript
   API_BASE: 'http://localhost:3000'
   ```

2. **Run your backend locally:**
   ```bash
   pnpm dev
   ```

3. **Load extension** in developer mode (chrome://extensions)

4. **Activate a test license** through the extension UI

5. **Check console logs** (chrome://extensions → details → background logs)

### Expected Logs

```
[Background] Extension restarted
[Background] Performing license validation check
[Background] License validation complete: {
  valid: true,
  status: "active"
}
```

### Production Deployment

Once you deploy to Vercel:

1. **Update URLs** in both files:
   ```javascript
   API_BASE: 'https://your-app-name.vercel.app'
   ```

2. **Reload extension** in Chrome

3. **Test with real license key** created in your admin dashboard

---

## Troubleshooting

### Issue: "License validation failed"

**Cause:** API endpoint is not reachable

**Fix:**
- Check API_BASE URL is correct
- Verify Vercel deployment is live
- Check browser console for CORS errors
- Verify `/api/licenses/validate` exists

### Issue: "Device fingerprint mismatch"

**Cause:** User activated on different device

**Fix:**
- Hardware fingerprint changed (hardware upgrade, different PC, etc)
- User needs to either:
  - Use the same device
  - Contact admin to reset device binding
  - Deactivate and reactivate on new device

### Issue: "License expired"

**Cause:** License expiry date has passed

**Fix:**
- User must purchase renewal in your shop
- Admin can extend license manually via admin dashboard

### Issue: "Usage quota exceeded"

**Cause:** User has used all daily/monthly API calls

**Fix:**
- User must upgrade to higher tier
- Or wait for quota reset (if daily limit)

---

## File Structure After Update

```
Lovable Infinity Extension/
├── manifest.json                 (unchanged)
├── popup.html                    (unchanged)
├── popup.js                      (unchanged)
├── sidepanel.html                (unchanged)
├── sidepanel.js                  (unchanged)
├── pageHook.js                   (unchanged)
├── content.js                    (unchanged)
│
├── lovable-auth.js               ← REPLACED (new version)
├── background.js                 ← REPLACED (new version)
│
├── lovable-feature-api.js        (unchanged)
├── hwFingerprint.js              (unchanged)
├── local-activation.js           (optional - can remove if needed)
│
├── assets/                       (unchanged)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
│
└── sounds/                       (unchanged)
    ├── error-payment.mp3
    ├── error-ratelimit.mp3
    └── error-token.mp3
```

---

## License Key Format

The extension accepts licenses in this format:

```
LI-XXXXXXXX-XXXX-XXXX-XXXX
```

Example:
```
LI-A1B2C3D4-E5F6-G7H8-I9J0-K1L2M3N4O5P6
```

Your admin dashboard generates these automatically after payment.

---

## Next Steps

1. **Download** modified files from v0 project
2. **Update** API_BASE URL in both files
3. **Replace** files in your extension
4. **Reload** extension in Chrome
5. **Test** with a test license key
6. **Deploy** your backend to Vercel
7. **Update** API_BASE to production URL
8. **Reload** extension again
9. **Publish** extension to users

---

## Support

If you encounter issues:

1. Check browser console logs (F12 → Console tab)
2. Check extension logs (chrome://extensions → details → background logs)
3. Verify API endpoint is deployed and working
4. Test API directly with curl:
   ```bash
   curl -X POST https://your-domain/api/licenses/validate \
     -H "Content-Type: application/json" \
     -d '{"licenseKey":"LI-TEST","hardwareFingerprint":"fp_test"}'
   ```

---

## Files Included

- `modified-lovable-auth.js` - License validation logic
- `modified-background.js` - Extension service worker
- This guide - Complete integration instructions
