# Unlimited Lovable Extension - Setup Guide

## Version: 7.0 (Latest)
**Updated: July 30, 2026**

---

## What's Included

The **Unlimited Lovable** extension enables unlimited prompts on lovable.dev with duration-based licenses (1 day, 7 days, 30 days, 365 days). The extension validates licenses online and automatically locks out when the license expires.

### Key Features

✅ **Online License Validation** - Real-time validation against the Unlimited Lovable website  
✅ **Duration-Based Plans** - 1, 7, 30, or 365-day licenses (no credit system)  
✅ **Device Binding** - Each license is bound to a hardware fingerprint for security  
✅ **Automatic Expiry** - Access revokes immediately when the license expires  
✅ **Premium Member Status** - Shows "Premium Member" for all paid plans  
✅ **Multi-Seat Support** - Track concurrent device usage  
✅ **Anti-Tamper Protection** - Cryptographic token verification prevents cracking  

---

## Installation Steps

### Step 1: Download the Extension

Extract the `extension-fixed-v7-latest.tar.gz` file to get the `extension-fixed/` folder.

### Step 2: Enable Developer Mode in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Toggle **"Developer mode"** ON (top right)

### Step 3: Load the Extension

1. Click **"Load unpacked"**
2. Select the `extension-fixed/` folder
3. The extension will load and appear in your Extensions list

### Step 4: Pin the Extension

1. Click the **puzzle icon** in the Chrome toolbar (top right)
2. Find "Unlimited Lovable" in the list
3. Click the **pin icon** to add it to your toolbar

---

## How to Use

### First Time Setup

1. Click the **Unlimited Lovable** icon in your toolbar
2. A popup appears asking for your license key
3. Go to https://v0-unlimited-lovable.vercel.app/shop
4. Select a plan (Daily, Weekly, Monthly, or Yearly)
5. Complete the payment
6. You'll get a license key immediately
7. Paste the license key into the extension popup
8. Click **"Activate"**
9. ✅ Extension unlocked! You now have unlimited prompts on lovable.dev

### Using the Extension

Once activated:
- Go to **lovable.dev**
- Open the **Unlimited Lovable** side panel (right side of the editor)
- Your license status shows as "Premium Member"
- Prompts are now **unlimited** until your license expires
- Days remaining countdown shows exactly how long your access lasts

### Renewing Your License

When your license is about to expire:
1. Go to https://v0-unlimited-lovable.vercel.app/dashboard
2. Click **"Buy now"** to extend your license
3. The new license duration extends from today
4. The extension updates automatically within 5 minutes

---

## Technical Details

### License Validation API

The extension calls the backend API:

```
POST https://v0-unlimited-lovable.vercel.app/api/licenses/validate
Body: {
  "licenseKey": "LI-XXXX-XXXX-XXXX-XXXX",
  "hardwareFingerprint": "HWID-ABC123..."
}

Response: {
  "valid": true,
  "license": {
    "licenseKey": "...",
    "tier": {
      "displayName": "Premium Member",
      "maxSeats": 1
    },
    "expiresAt": "2026-08-30T00:00:00Z",
    "seatsUsed": 1,
    "status": "active"
  }
}
```

### Hardware Fingerprint

The extension generates a unique fingerprint based on:
- User Agent
- Browser language
- OS platform
- CPU cores
- RAM
- Timezone
- Screen resolution

This fingerprint binds the license to YOUR device. If you reinstall Windows or use a different computer, the fingerprint changes and you'll need to reactivate.

### Storage Security

All data is stored in `chrome.storage.local`:
- `li_license_key` - Your license key
- `li_validation_cache` - Last validation result
- `li_hw_fingerprint` - Your device's hardware ID
- `li_signed_token` - Cryptographic proof of validity
- `ql_*` - UI state keys (plan name, expiry, etc.)

The signed token is cryptographically verified to prevent tampering.

---

## Troubleshooting

### "License validation failed"
- ❌ License key is incorrect or expired
- ✅ Check your email for the correct license key
- ✅ Go to the dashboard to view your active licenses

### "Could not reach license server"
- ❌ Your internet connection is down or the server is unreachable
- ✅ Check your WiFi/network connection
- ✅ Try again in a few minutes if the server is temporarily down

### Extension says "Expired" but I just bought it
- ❌ The license validation hasn't refreshed yet
- ✅ Wait 1-2 minutes and refresh
- ✅ Click the extension icon to manually revalidate
- ✅ Clear `chrome://extensions/` cache by toggling Developer Mode off then on

### Multiple devices / Can't use 2 computers
- License keys are bound to ONE device (hardware fingerprint)
- ❌ You cannot use the same key on different computers
- ✅ Buy a separate license for each device
- ✅ Contact support if you need a multi-device plan

### "Premium Member Member" shows (doubled)
- This is a display bug if you see it in the account panel
- The actual unlocking works correctly
- Update to the latest extension version to fix

---

## Support

**Website**: https://v0-unlimited-lovable.vercel.app  
**Contact**: Go to the website and use the Chat feature to contact support  
**License Management**: https://v0-unlimited-lovable.vercel.app/dashboard  

---

## What's New in v7

- ✅ Fixed Server Component errors preventing payment flow
- ✅ Premium Member display now shows correctly for all paid tiers
- ✅ Auto-license issuance on payment confirmation
- ✅ Improved error messages and status displays
- ✅ Better validation retry logic
- ✅ Updated API endpoint handling

---

## License & Ownership

**Copyright © 2026 Sunil Kumar. All Rights Reserved.**

This extension is proprietary software. Licensed to authorized users only. Unauthorized copying, modification, or redistribution is prohibited.

---

Enjoy unlimited prompts on lovable.dev! 🚀
