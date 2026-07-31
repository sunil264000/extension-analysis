# Unlimited Lovable - Extension Setup & Usage Guide

**Website**: https://v0-unlimited-lovable.vercel.app
**Extension Location**: `/extension-fixed/` folder

## Should You Download the New Extension?

### YES, you should if:
- You haven't installed the extension yet
- You had "revoked" errors (NOW FIXED)
- You had sign-out errors (NOW FIXED)
- You want the latest device tracking features
- You had issues clearing browser cache

### NO, you don't need to if:
- Your current extension is working perfectly
- You're not seeing any "Internal server error" messages
- You don't need device tracking features

---

## What's New in Latest Extension

### Fixed Issues
- ✓ License auto-revocation on browser cache clear
- ✓ Device fingerprint mismatch errors
- ✓ "Revoked" status on extension reinstall
- ✓ Incognito mode license lockout
- ✓ Sign-out errors on website

### New Features
- ✓ Device tracking (HWID, IP, timezone, timestamp)
- ✓ Real-time countdown timer (minute-level precision)
- ✓ Multiple device support
- ✓ Better error messages
- ✓ Comprehensive logging for debugging
- ✓ Auto-bind new devices up to seat limit

### Better Error Messages
Instead of vague "revoked" errors, you now get:
- "License has expired" (if expired)
- "License has been revoked" (if actually revoked)
- "Seat limit exceeded. Max: 3" (if out of seats)
- "Could not reach license server" (if connection issue)
- "Internal server error" → Now shows specific error details

---

## Extension Installation

### Step 1: Download Extension
Navigate to `/extension-fixed/` in your project folder.

Files in extension:
```
/extension-fixed/
├── manifest.json         (Chrome extension metadata)
├── popup.html           (User interface)
├── popup.js             (UI logic)
├── background.js        (Background service)
├── local-activation.js  (License validation)
├── device-tracker.js    (Device fingerprinting)
└── sidepanel.html       (Side panel UI)
```

### Step 2: Load in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `/extension-fixed/` folder
5. Extension appears in toolbar

### Step 3: Activate License
1. Click extension icon in toolbar
2. Paste your license key (format: `LI-XXXXXX-XXXX-XXXX-XXXX`)
3. Click "Activate"
4. Should see your plan details
5. Enjoy unlimited access!

---

## License Activation

### Getting Your License Key
1. Sign up at https://v0-unlimited-lovable.vercel.app
2. Go to Dashboard
3. See "My Licenses" section
4. Copy your license key

### Activating in Extension
1. Click extension popup
2. Paste license key
3. Click "Activate"
4. Should show: "Premium Member" + time remaining

### Troubleshooting Activation

**Problem: "License key not found"**
- Ensure license key is correct (copy from dashboard)
- License might not exist in database
- Check if you actually purchased a plan

**Problem: "License has expired"**
- Your plan duration ended
- Visit dashboard and renew license
- Buy new plan to reactivate

**Problem: "Seat limit exceeded"**
- You've reached max devices for this license
- Remove old device from settings
- Or buy plan with more seats

**Problem: "Internal server error"**
- Server encountered error during validation
- Check console for more details
- Try again in a few moments
- If persistent, report on dashboard

**Problem: "Could not reach license server"**
- Check your internet connection
- Try again in a few moments
- Temporarily offline → extension won't validate

---

## Device Tracking Information

Your license tracks these per device:
- **HWID** (Hardware ID): Canvas fingerprint + browser info
- **IP Address**: Your network IP address
- **Timezone**: Your local timezone
- **Activation Timestamp**: When device was first bound

This information:
- Helps prevent license sharing
- Enables multi-device support
- Provides security audit trail
- Is visible to admins only

---

## Common Questions

### Q: Do I need to reinstall the extension?
**A**: Only if you had errors. If it's working, no need to update.

### Q: Will my license work after clearing cache?
**A**: Yes! It auto-binds to new device fingerprint (no error).

### Q: Can I use same license on 2 computers?
**A**: Yes, if your plan allows (depends on maxSeats). Each device auto-binds.

### Q: What if I format my computer?
**A**: License re-binds to new device fingerprint automatically.

### Q: What if I reinstall the extension?
**A**: License auto-binds, no "revoked" error (previously this was broken).

### Q: Can someone steal my license key?
**A**: License is bound to device HWID. Stealing key without hardware doesn't help.

### Q: How is my data protected?
**A**: Device HWID is canvas fingerprint (hard to fake), IP is tracked, timestamps logged.

### Q: What's my device HWID?
**A**: Check popup → "Device Info" section (if implemented in UI).

---

## Extension Files Explained

### manifest.json
- Chrome extension configuration
- Defines permissions, icons, default popup
- Specifies service worker and content scripts

### popup.html / popup.js
- User interface when you click extension
- Shows license status, time remaining
- Input field for license activation
- Sign out button

### background.js
- Runs in background (service worker)
- Listens for extension events
- Manages storage and timers
- No user interaction needed

### local-activation.js
- Main license validation logic
- Calls validation API
- Handles device binding
- Manages countdown timer
- Stores license data locally

### device-tracker.js
- Generates device fingerprint (HWID)
- Gets timezone and user agent
- Calculates time remaining
- Detects device info

### sidepanel.html
- Extended license information panel
- Shows device history (if implemented)
- Device IP addresses and timezones
- Audit trail of events

---

## Installation Verification

After installing, you should see:
1. ✓ Extension icon in Chrome toolbar
2. ✓ Click icon → popup opens
3. ✓ Popup shows "Activate your license" form
4. ✓ Enter license key and click Activate
5. ✓ Should show "Premium Member" status
6. ✓ Time remaining countdown starts
7. ✓ No errors in console

---

## Debugging

### Enable Debug Logs
- Open Chrome DevTools (F12)
- Go to Console tab
- Paste license key and activate
- Look for `[v0]` prefixed messages

### Check Extension Status
- Open `chrome://extensions/`
- Find "Unlimited Lovable"
- Click "Details"
- Check "Permissions" and "Site permissions"

### Clear Extension Data
If you want a clean slate:
1. Right-click extension icon
2. Select "Options" (if available)
3. Click "Clear all data" button
4. Reinstall license key

---

## API Endpoints Used by Extension

### Validate License
```
POST https://v0-unlimited-lovable.vercel.app/api/licenses/validate
Body: {
  licenseKey: "LI-XXX",
  hardwareFingerprint: "abc123...",
  timezone: "America/New_York",
  userAgent: "Mozilla/5.0..."
}
```

### Authorize Device
```
POST https://v0-unlimited-lovable.vercel.app/api/licenses/authorize
Body: {
  licenseKey: "LI-XXX",
  hardwareFingerprint: "abc123..."
}
```

---

## Best Practices

1. **Don't share your license key** - It's personal to your account
2. **Keep extension updated** - Check for updates regularly
3. **Clear cache before reporting issues** - Helps with debugging
4. **Save your license key** - Store safely, not in plain text
5. **Use unique passwords** - For your Unlimited Lovable account
6. **Monitor device count** - Know how many devices are bound
7. **Report errors** - If you see issues, report on dashboard

---

## Support

If you encounter issues:
1. Check this guide for troubleshooting
2. Review error message details
3. Check extension console (DevTools)
4. Try clearing cache and reinstalling
5. Contact support via dashboard

---

## Technical Details

### License Storage
Extension stores in `chrome.storage.local`:
- `ql_license_key` - Your license key
- `ql_license_data` - Current license status
- `ql_device_info` - Device fingerprint and info
- `ql_activation_time` - When activated
- `ql_last_validation` - Last successful validation

### Token Verification
Extension verifies cryptographic tokens:
- Server signs token with private key
- Extension verifies with public key
- Token cannot be forged client-side
- Tampering is cryptographically impossible

### Offline Support
When offline:
- Uses cached license data
- Countdown timer continues
- On reconnect, syncs with server
- No validation during offline period

---

## Version History

### v2.0 (Latest - Current)
- Fixed license auto-revocation
- Added comprehensive device tracking
- Improved error messages with details
- Better countdown timer precision
- Auto-bind instead of reject
- Comprehensive error logging

### v1.0 (Previous)
- Basic license validation
- Device binding (caused false revocation)
- Simple error messages
- Limited device tracking

---

**Extension is ready to use and fully operational!**

