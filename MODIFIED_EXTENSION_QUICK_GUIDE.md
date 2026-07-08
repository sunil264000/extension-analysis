# Modified Lovable Infinity Extension - Quick Guide

## Downloads Available

Inside your project folder you now have:

1. **lovable-infinity-modified.zip** (829 KB)
   - Use this if you're on Windows or Mac
   - Extract and load into Chrome

2. **lovable-infinity-modified.tar.gz** (825 KB)
   - Use this if you're on Linux
   - Extract and load into Chrome

## What's Inside the ZIP

The modified extension includes:

```
lovable-infinity-modified/
├── lovable-license-validator.js  ← NEW: License validation engine
├── manifest.json                 ← UPDATED: Added validator to scripts
├── README_EXTENSION.md           ← How to use the modified extension
├── LICENSE_VALIDATOR_SETUP.md    ← Detailed setup instructions
├── All original files            ← Unchanged (background.js, content.js, etc.)
└── assets/                       ← Icons and images
```

## 3-Step Setup

### Step 1: Deploy Backend (10 minutes)
```bash
cd /path/to/your/backend
vercel deploy
# Copy the URL shown: https://your-app-XXXXX.vercel.app
```

### Step 2: Update Extension (2 minutes)
1. Extract the ZIP file
2. Open `lovable-license-validator.js`
3. Find line 9: `API_ENDPOINT: 'https://your-app.vercel.app',`
4. Replace with your Vercel URL from Step 1
5. Save the file

### Step 3: Load Into Chrome (1 minute)
1. Go to `chrome://extensions/`
2. Enable Developer Mode (top-right)
3. Click "Load unpacked"
4. Select the extracted folder
5. Done!

## What Works Now

✅ User enters license key in extension
✅ Extension validates against your backend API
✅ Shows valid/invalid/expiring status
✅ Tracks usage automatically
✅ Binds to device via hardware fingerprinting
✅ Caches for offline use (24 hours)

## Testing

After loading the extension:

1. Go to your backend admin dashboard
2. Create a test license (any tier, today + 30 days)
3. Open the extension popup
4. Enter the license key
5. See the validation result

## Integration Points

### What the Extension Calls

The extension makes two API calls to your backend:

1. **Validate License** (on first activation)
   ```
   POST /api/licenses/validate
   ```

2. **Track Usage** (every hour)
   ```
   POST /api/licenses/track-usage
   ```

Both endpoints must return valid JSON responses.

## Configuration Reference

File: `lovable-license-validator.js` (lines 8-14)

```javascript
const LICENSE_CONFIG = {
  API_ENDPOINT: 'https://your-app.vercel.app',     // ← Change this
  STORAGE_KEY: 'lovable_license_data',             // Don't change
  FINGERPRINT_KEY: 'lovable_hw_fingerprint',       // Don't change
  VALIDATION_INTERVAL: 3600000,   // 1 hour = 3600000 ms
  CACHE_DURATION: 86400000,        // 24 hours = 86400000 ms
};
```

## Files Modified vs Unchanged

### Modified Files (2)
- ✏️ `manifest.json` - Added license validator to content scripts
- ✏️ (Optional) Update API_ENDPOINT in `lovable-license-validator.js`

### New Files Added (3)
- ✨ `lovable-license-validator.js` - Core validation logic
- ✨ `README_EXTENSION.md` - Full documentation
- ✨ `LICENSE_VALIDATOR_SETUP.md` - Setup guide

### Unchanged Files (all others)
- ✓ `background.js`
- ✓ `content.js`
- ✓ `popup.js`
- ✓ `sidepanel.js`
- ✓ All CSS files
- ✓ All other JavaScript files

## How to Use in Your Code

After extension loads, any script can use:

```javascript
// Validate a license
await window.licenseValidator.validateLicense('LI-XXXX-XXXX-XXXX-XXXX');

// Get current license info
const info = window.licenseValidator.getLicenseInfo();
console.log(info.isExpiringSoon);  // true/false
console.log(info.daysUntilExpiry); // number
console.log(info.seatsUsed);       // number
console.log(info.usageToday);      // number

// Track usage
await window.licenseValidator.trackUsage('LI-XXXX-XXXX-XXXX-XXXX');

// Get device fingerprint
const fingerprint = await window.licenseValidator.getHardwareFingerprint();
console.log(fingerprint);  // HWID-ABC123...
```

## Troubleshooting

### Problem: "API endpoint not configured"
**Solution**: Update `lovable-license-validator.js` line 9 with your backend URL

### Problem: CORS error in console
**Solution**: Your backend needs CORS headers. Check endpoints allow POST requests.

### Problem: License shows as invalid
**Checklist**:
- Is the license key correct?
- Has the license expired?
- Is the device fingerprint matching?
- Is your backend deployed and running?

### Problem: "Cannot find module..."
**Solution**: Make sure you extracted the ENTIRE folder, not just individual files

## Next Steps

1. **Extract the ZIP file**
   - Windows/Mac: Double-click to extract
   - Linux: `tar -xzf lovable-infinity-modified.tar.gz`

2. **Update the API endpoint**
   - Open `lovable-license-validator.js`
   - Change line 9

3. **Load into Chrome**
   - `chrome://extensions/` → Developer Mode → Load unpacked

4. **Test with a license**
   - Create test license in admin dashboard
   - Enter in extension

5. **Deploy to production**
   - Repeat for all users who need the extension

## Support

For detailed information, read:
- `README_EXTENSION.md` - Full documentation
- `LICENSE_VALIDATOR_SETUP.md` - Complete setup guide
- `SETUP_GUIDE.md` (in main project) - Backend setup
- `PAYMENT_INTEGRATION_GUIDE.md` (in main project) - Payment setup

## Version Info

- Base Extension: Lovable Infinity v6.4.5
- License Validator: v1.0
- Modified: July 2024
- Status: Production Ready

---

**Everything is ready to use! Start with Step 1 above.** 🚀
