# Lovable Infinity - Modified Extension with License Validator

This is the **MODIFIED VERSION** of Lovable Infinity that integrates with your License Validator backend system.

## Quick Start (5 Minutes)

1. **Deploy your backend first**:
   - Go to your backend project folder
   - Run: `vercel deploy`
   - Copy the deployment URL

2. **Update extension configuration**:
   - Open `lovable-license-validator.js`
   - Find line 9: `API_ENDPOINT: 'https://your-app.vercel.app',`
   - Replace with your actual URL: `API_ENDPOINT: 'https://your-deployed-url.vercel.app',`

3. **Load into Chrome**:
   - Go to `chrome://extensions/`
   - Enable Developer Mode (top-right toggle)
   - Click "Load unpacked"
   - Select this folder
   - Done! Extension is ready

4. **Test it**:
   - Create a test license in your admin dashboard
   - Enter the license key in the extension
   - It should validate successfully

## What's Been Modified

### New Files Added
- `lovable-license-validator.js` - Main license validation logic

### Modified Files
- `manifest.json` - Added license validator to content scripts

### Unchanged Files
- All other files remain exactly as they were

## Architecture

```
┌─────────────────────────────────┐
│   Lovable Infinity Extension    │
│  ┌─────────────────────────────┐│
│  │  lovable-license-validator  ││
│  │     (NEW FILE)              ││
│  │                             ││
│  │ • Validates licenses        ││
│  │ • Tracks device fingerprint ││
│  │ • Tracks usage              ││
│  │ • Manages caching           ││
│  └─────────────────────────────┘│
└────────────┬────────────────────┘
             │ HTTP POST
             ↓
┌─────────────────────────────────┐
│  License Validator Backend      │
│  (Your Next.js App on Vercel)   │
│                                 │
│ /api/licenses/validate          │
│ /api/licenses/track-usage       │
└─────────────────────────────────┘
```

## Configuration

### API Endpoint Configuration

File: `lovable-license-validator.js` (Line 9)

```javascript
const LICENSE_CONFIG = {
  API_ENDPOINT: 'https://your-app.vercel.app',  // ← CHANGE THIS
  STORAGE_KEY: 'lovable_license_data',
  FINGERPRINT_KEY: 'lovable_hw_fingerprint',
  VALIDATION_INTERVAL: 3600000,  // 1 hour
  CACHE_DURATION: 86400000,       // 24 hours
};
```

## Core Features

### License Validation
- Validates license key format: `LI-XXXX-XXXX-XXXX-XXXX`
- Checks expiry dates
- Enforces seat limits
- Prevents device fraud via fingerprinting

### Device Binding
- Unique hardware fingerprint per device
- Based on:
  - User Agent
  - Platform
  - Screen resolution
  - Timezone
  - Device memory

### Usage Tracking
- Tracks daily API calls
- Enforces usage quotas
- Syncs with backend hourly
- Shows usage warnings

### Caching
- Caches licenses for 24 hours
- Works offline after validation
- Auto-expires invalid licenses

## Global API (window.licenseValidator)

Once loaded, access from any script:

```javascript
// Validate a license
await window.licenseValidator.validateLicense('LI-XXXX-XXXX-XXXX-XXXX');

// Get license info
window.licenseValidator.getLicenseInfo();
// Returns: { key, tier, seatsUsed, maxSeats, usageToday, maxUsagePerDay, ... }

// Track usage
await window.licenseValidator.trackUsage('LI-XXXX-XXXX-XXXX-XXXX');

// Get hardware fingerprint
await window.licenseValidator.getHardwareFingerprint();

// Get cached license status
await window.licenseValidator.getLicenseStatus('LI-XXXX-XXXX-XXXX-XXXX');

// Clear all license data
await window.licenseValidator.clearLicenseData();
```

## Backend API Endpoints

### POST /api/licenses/validate

Validates a license key and binds it to a device.

**Request:**
```json
{
  "licenseKey": "LI-XXXX-XXXX-XXXX-XXXX",
  "hardwareFingerprint": "HWID-ABC123..."
}
```

**Response (Success):**
```json
{
  "valid": true,
  "license": {
    "licenseKey": "LI-XXXX-XXXX-XXXX-XXXX",
    "status": "active",
    "expiresAt": "2025-07-08T10:49:00.000Z",
    "tier": {
      "displayName": "Pro",
      "maxSeats": 5,
      "maxUsageLimit": 1000
    },
    "seatsUsed": 1,
    "usageCount": 45
  }
}
```

**Response (Failure):**
```json
{
  "valid": false,
  "message": "License key not found or invalid"
}
```

### POST /api/licenses/track-usage

Increments usage counter for the license.

**Request:**
```json
{
  "licenseKey": "LI-XXXX-XXXX-XXXX-XXXX",
  "hardwareFingerprint": "HWID-ABC123..."
}
```

## Data Storage

License data is stored in Chrome's local storage:

```javascript
chrome.storage.local.get('lovable_license_data', (result) => {
  console.log(result);
  // {
  //   license: {...},
  //   validatedAt: "2024-07-08T10:49:00.000Z",
  //   licenseKey: "LI-XXXX-XXXX-XXXX-XXXX"
  // }
});
```

## Troubleshooting

### Configuration Error

**Error**: `API endpoint not configured. Please update LICENSE_CONFIG.API_ENDPOINT`

**Fix**: 
1. Open `lovable-license-validator.js`
2. Find line 9
3. Make sure `API_ENDPOINT` is not `'https://your-app.vercel.app'`
4. Set it to your actual deployed URL
5. Reload extension in Chrome

### CORS Error

**Error**: Browser shows CORS error in console

**Fix**: Your backend needs proper CORS headers. Check that `/api/licenses/validate` and `/api/licenses/track-usage` allow POST requests from Chrome extension origins.

### License Validation Fails

**Error**: "License validation failed" message

**Possible causes**:
- License key is invalid or doesn't exist
- License is expired
- License is bound to a different device
- Backend is down

**Fix**:
1. Check license key is correct in your admin dashboard
2. Verify license hasn't expired
3. Check if device fingerprint changed (check browser console)

## File Structure

```
lovable-infinity-modified/
├── manifest.json                 (Extension config)
├── lovable-license-validator.js  (NEW - License validation)
├── background.js                 (Service worker)
├── content.js                    (Content script)
├── popup.html / popup.js         (Popup UI)
├── sidepanel.html / sidepanel.js (Side panel UI)
├── assets/                       (Icons & images)
├── sounds/                       (Audio files)
├── LICENSE_VALIDATOR_SETUP.md    (Setup guide)
└── README_EXTENSION.md          (This file)
```

## Extension Version

- **Base Version**: 6.4.5 (Lovable Infinity)
- **License Validator**: v1.0
- **Modified**: July 2024

## Support & Documentation

- **Setup Guide**: `LICENSE_VALIDATOR_SETUP.md`
- **Backend Setup**: Check `SETUP_GUIDE.md` in your main project
- **Payment Integration**: Check `PAYMENT_INTEGRATION_GUIDE.md`
- **System Overview**: Check `COMPLETE_SYSTEM_OVERVIEW.md`

## License

This modified extension is provided as-is for use with the Lovable License Validator system.
