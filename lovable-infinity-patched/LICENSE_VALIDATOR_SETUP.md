# Lovable Infinity - License Validator Setup Guide

This is the **MODIFIED** Lovable Infinity extension that integrates with your new License Validator backend system.

## What's New

✅ **License Validation**: The extension now validates licenses against your backend API
✅ **Device Binding**: Licenses are tied to specific devices using hardware fingerprinting
✅ **Usage Tracking**: Automatic usage tracking for quota enforcement
✅ **Automatic Checks**: Re-validates licenses every hour

## Installation

1. Extract this folder to a location on your computer
2. Open Chrome and go to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right)
4. Click **"Load unpacked"** and select this folder
5. The extension will appear in your Chrome toolbar

## Configuration

### Step 1: Deploy Your Backend

Before the extension can work, you need to deploy your License Validator backend:

```bash
cd /path/to/your/backend
vercel deploy
```

Note the deployment URL (e.g., `https://your-app.vercel.app`)

### Step 2: Update Extension Configuration

Edit the file: `lovable-license-validator.js`

Find this line (around line 9):
```javascript
API_ENDPOINT: 'https://your-app.vercel.app', // REPLACE THIS WITH YOUR VERCEL DEPLOYMENT URL
```

Replace `https://your-app.vercel.app` with your actual deployment URL:
```javascript
API_ENDPOINT: 'https://my-license-validator.vercel.app',
```

### Step 3: Reload Extension

In Chrome:
1. Go to `chrome://extensions/`
2. Find "Lovable Infinity"
3. Click the refresh icon

## How It Works

### License Activation Flow

```
User enters license key in extension
        ↓
Extension generates hardware fingerprint
        ↓
Sends POST to: /api/licenses/validate
        ↓
Backend validates license
        ↓
Extension caches license for 24 hours
        ↓
Shows ✓ Valid or ✗ Invalid status
```

### Automatic Validation

- Extensions re-validates every 1 hour
- Caches license for offline use (24 hours)
- Automatically tracks usage hourly
- Shows warning if license expires in < 7 days

## API Integration

### Validation Endpoint

```javascript
const response = await fetch(
  'https://your-app.vercel.app/api/licenses/validate',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      licenseKey: 'LI-XXXX-XXXX-XXXX-XXXX',
      hardwareFingerprint: 'HWID-ABC123...',
    }),
  }
);

const data = await response.json();
// Response: { valid: true, license: {...} }
```

### Usage Tracking Endpoint

```javascript
const response = await fetch(
  'https://your-app.vercel.app/api/licenses/track-usage',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      licenseKey: 'LI-XXXX-XXXX-XXXX-XXXX',
      hardwareFingerprint: 'HWID-ABC123...',
    }),
  }
);
```

## Files Modified

- **manifest.json** - Added `lovable-license-validator.js` to content scripts
- **lovable-license-validator.js** - NEW: Core license validation logic
- **All other files** - Unchanged from original

## Global API Reference

After the extension loads, you can access the license validator from any content script:

```javascript
// Get hardware fingerprint
const fingerprint = await window.licenseValidator.getHardwareFingerprint();

// Validate a license
try {
  const result = await window.licenseValidator.validateLicense('LI-XXXX-XXXX-XXXX-XXXX');
  console.log('License valid:', result.valid);
  console.log('License data:', result.license);
} catch (error) {
  console.error('Validation failed:', error);
}

// Get cached license info
const info = window.licenseValidator.getLicenseInfo();
console.log('Days until expiry:', info.daysUntilExpiry);
console.log('Seats used:', info.seatsUsed);
console.log('Usage today:', info.usageToday);

// Track usage
await window.licenseValidator.trackUsage('LI-XXXX-XXXX-XXXX-XXXX');

// Clear license data
await window.licenseValidator.clearLicenseData();
```

## Storage

License data is stored in Chrome's local storage under the key: `lovable_license_data`

Each stored entry contains:
- License details
- Validation timestamp
- License key

Expires automatically after 24 hours.

## Troubleshooting

### "API endpoint not configured"

**Problem**: Error says API endpoint is not configured

**Solution**: Update `lovable-license-validator.js` line 9 with your actual backend URL

### "CORS Error"

**Problem**: Browser console shows CORS error

**Solution**: Make sure your backend's `/api/licenses/validate` endpoint accepts POST requests with CORS headers

### License validation fails

**Solution**: 
1. Check if your backend is deployed and running
2. Verify the license key is correct (format: `LI-XXXX-XXXX-XXXX-XXXX`)
3. Check browser console for detailed error messages

### Hardware fingerprint changes

**Problem**: License stops working after system update

**Solution**: This can happen if hardware changes significantly. User needs to re-activate license with new fingerprint.

## Security Notes

- Hardware fingerprints are generated locally in the extension
- License keys are validated server-side
- Cached licenses expire after 24 hours
- Offline functionality available for 24 hours after last validation

## Support

For issues with the license validator system, check:

1. **Backend**: `/SETUP_GUIDE.md` in your main project
2. **API Integration**: `/PAYMENT_INTEGRATION_GUIDE.md`
3. **Extension Guide**: `/EXTENSION_INTEGRATION.md`

## Version

**Extension Version**: 6.4.5 (Modified)
**License Validator**: v1.0
**Last Updated**: July 2024
