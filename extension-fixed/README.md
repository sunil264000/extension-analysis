# Unlimited Lovable - Chrome Extension v7.0

**Latest Update: July 30, 2026**

An anti-piracy Chrome extension that validates duration-based licenses online and automatically unlocks unlimited prompts on lovable.dev.

---

## Quick Start

1. **Load the Extension**
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked** and select this folder

2. **Activate with a License**
   - Click the extension icon
   - Get a license at https://v0-unlimited-lovable.vercel.app/shop
   - Enter your license key in the popup
   - ✅ Unlimited prompts unlocked!

---

## File Structure

```
extension-fixed/
├── manifest.json                    # Chrome extension metadata
├── popup.html / popup.js            # License activation popup UI
├── sidepanel.html / sidepanel.js    # Lovable.dev side panel UI
├── local-activation.js              # License gate + online validation (MAIN)
├── lovable-license-validator.js     # API client for validation
├── license-core.js                  # Hardened token verification (anti-crack)
├── content.js                       # Content script injected on lovable.dev
├── background.js                    # Service worker / background script
├── automation-runtime.js            # Prompt execution runtime
├── prompt-tracker.js                # Usage tracking + heartbeat
├── lovable-auth.js                  # Auth token handling
├── lovable-feature-api.js           # Feature entitlements
├── content-bridge.js                # Page ↔ Content communication
├── hwFingerprint.js                 # Hardware fingerprint generator
├── extension-config.js              # Configuration (obfuscated)
├── pageHook.js                      # Early page hook before DOM loads
├── sounds.js                        # Audio notification handlers
├── jszip.min.js                     # Utility library
├── theme.css                        # UI theme styling
├── floating.css                     # Floating panel styles
├── assets/                          # Icons and logos
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── logo-master-lovable.png
└── sounds/                          # Audio notifications
    ├── error-payment.mp3
    ├── error-ratelimit.mp3
    └── error-token.mp3
```

---

## Core Components Explained

### `local-activation.js` (Main License Gate)
- **Purpose**: Load on extension start, validate license, unlock or lock UI
- **Flow**:
  1. Read stored license key + cache
  2. If expired/invalid → show license gate overlay
  3. If valid → seed `ql_*` storage, unlock UI
  4. User enters key → calls API → validates → persists
- **Security**: Token verification (see `license-core.js`)

### `license-core.js` (Anti-Crack Core)
- **Purpose**: Cryptographically verify signed tokens, prevent tampering
- **Methods**:
  - `verifyToken(token, fingerprint)` — validates signature
  - `attest()` — checks manifest integrity
  - `reportTamper(key, fingerprint, reason)` — reports cracks to server
- **If tampered**: Clears all storage, locks extension, reports to kill-switch

### `lovable-license-validator.js` (API Client)
- **Purpose**: Simple API wrapper for `/api/licenses/validate`
- **Used by**: Both extension popup AND content scripts
- **Endpoint**: `POST https://v0-unlimited-lovable.vercel.app/api/licenses/validate`

### `prompt-tracker.js` (Usage Tracking)
- **Purpose**: Track prompts sent, enforce rate limits, send heartbeat
- **Heartbeat**: Every 5 minutes re-validates with server
- **Expires**: If license expires, blocks prompts immediately

### `content.js` (Main Content Script)
- **Purpose**: Injected on lovable.dev, intercepts prompt API calls
- **Job**:
  1. Wait for `ql_license_valid` to be true
  2. Pass through authenticated prompts
  3. Block if license expired or invalid
  4. Track usage count

---

## API Integration Points

### License Validation
```
POST /api/licenses/validate
Body: { licenseKey, hardwareFingerprint }
Returns: { valid, license, token, message }
```

### Usage Tracking
```
POST /api/licenses/track-usage
Body: { licenseKey, hardwareFingerprint }
Returns: {}
```

### License Authorization
```
POST /api/licenses/authorize
Body: { licenseKey, feature, hardwareFingerprint }
Returns: { authorized, reason }
```

---

## Storage Keys (chrome.storage.local)

**License Data:**
- `li_license_key` — User's entered key
- `li_validation_cache` — Last API response + timestamp
- `li_hw_fingerprint` — Device ID (stable)
- `li_signed_token` — Cryptographic proof (tamper-proof)

**UI State (Lovable.dev):**
- `ql_license_valid` — Is license active?
- `ql_license_key` — Key being used
- `ql_user_name` — Display name ("Premium Member")
- `ql_expires_at` — Expiry ISO timestamp
- `plan` — Full plan object (name, days_remaining, etc.)

**Read by**: `lovable.dev` JavaScript to decide whether to allow prompts.

---

## How to Update

1. Edit any `.js` or `.html` file
2. Open `chrome://extensions/`
3. Click the **Reload** button (🔄) under "Unlimited Lovable"
4. Refresh `lovable.dev` tab

For production builds, obfuscate first:
```bash
npm install -g esbuild
esbuild extension-config.js --minify --outfile=extension-config.js
```

---

## Security Model

**Layers of Protection:**

1. **Online Validation** — License checked against server every 1 hour
2. **Hardware Binding** — Key locked to device fingerprint (CPU, screen, etc.)
3. **Signed Token** — Cryptographic proof of validity in `li_signed_token`
4. **Heartbeat** — Prompts re-check every 5 minutes
5. **Attestation** — Verifies manifest hasn't been tampered with
6. **Kill Switch** — Server can revoke keys instantly

**If Cracked:**
- Tamper reports sent to server
- Kill switch flag set on account
- All keys revoked
- User locked out permanently

---

## Troubleshooting

### "License validation failed"
- Check the license key is spelled correctly
- Ensure internet connection is working
- Try again in a few moments

### "Could not reach license server"
- Network issue or server down
- Check your WiFi / internet connection
- Try again shortly

### Extension not showing
- Reload `chrome://extensions/` and click Reload (🔄)
- Refresh the `lovable.dev` tab
- Restart Chrome

### Prompts still blocked after entering key
- Wait 1-2 minutes for storage to sync
- Close and reopen the side panel
- Reload the page

---

## Version History

**v7.0** (July 30, 2026)
- Fixed Server Component errors in payment flow
- Premium Member status now displays correctly
- Auto-license issuance working on payment confirmation
- Improved error messages and UI

**v6.0** (June 2026)
- Rewrote online validation (replaced offline bypass)
- Added cryptographic token verification
- Implemented hardware fingerprinting
- Added kill-switch / tamper reporting

---

## Support & Licensing

**Website**: https://v0-unlimited-lovable.vercel.app  
**Contact**: Use the chat on the website  
**License**: © 2026 Sunil Kumar — All Rights Reserved

This is proprietary software. Unauthorized use, modification, or distribution is prohibited.

---

## Technical Specs

- **Manifest Version**: 3 (Chromium standard)
- **Min Chrome Version**: 94+
- **Permissions Used**: storage, activeTab, scripting, tabs, sidePanel, cookies
- **API Calls**: HTTPS only to v0-unlimited-lovable.vercel.app
- **No external CDNs**: All libraries bundled locally
- **No analytics**: No usage sent except explicit heartbeat

---

Enjoy unlimited prompts! 🚀
