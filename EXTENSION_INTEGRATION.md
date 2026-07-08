# Extension Integration Guide

This guide explains how to modify the Lovable Infinity Chrome extension to integrate with the license validator API.

## Overview

The extension needs to:
1. Validate license keys against your API
2. Track device usage
3. Send usage reports to API
4. Enforce license expiry and seat limits

---

## API Endpoints

### 1. License Validation

**Endpoint:** `POST /api/licenses/validate`

Called when extension loads or user provides license key.

**Request:**
```javascript
{
  licenseKey: "LI-XXXXXXXX-XXXX-XXXX-XXXX",
  hardwareFingerprint: "device-unique-id"
}
```

**Response (Success):**
```javascript
{
  valid: true,
  message: "License is valid",
  license: {
    licenseKey: "LI-...",
    tierId: "tier-uuid",
    tier: {
      displayName: "Pro",
      maxSeats: 3,
      maxUsageLimit: 1000,
      durationDays: 30,
      features: ["feature1", "feature2"]
    },
    expiresAt: "2025-01-15T00:00:00Z",
    seatsUsed: 1,
    usageCount: 45,
    status: "active"
  }
}
```

**Response (Failed):**
```javascript
{
  valid: false,
  message: "License has expired",
  error: "LICENSE_EXPIRED"
}
```

---

### 2. Track Usage

**Endpoint:** `POST /api/licenses/track-usage`

Called periodically (every hour or on major actions).

**Request:**
```javascript
{
  licenseKey: "LI-XXXXXXXX-XXXX-XXXX-XXXX",
  hardwareFingerprint: "device-unique-id"
}
```

**Response:**
```javascript
{
  success: true,
  message: "Usage tracked successfully",
  usage: {
    todayUsage: 45,
    totalUsage: 123,
    maxLimit: 1000,
    remaining: 955
  }
}
```

---

## Hardware Fingerprinting

The device fingerprint uniquely identifies a user's machine. Current extension already has `hwFingerprint.js` which you should use.

Replace/update with this approach:

```javascript
// lib/hardware-fingerprint.ts (to add to extension)
import crypto from 'crypto'

export async function generateHardwareFingerprint(): Promise<string> {
  try {
    // Get browser info
    const userAgent = navigator.userAgent
    
    // Get screen resolution
    const screenRes = `${screen.width}x${screen.height}`
    
    // Get timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Get language
    const language = navigator.language
    
    // Combine into fingerprint
    const combined = `${userAgent}|${screenRes}|${timezone}|${language}`
    
    // Hash it
    const encoded = new TextEncoder().encode(combined)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return hashHex
  } catch (error) {
    console.error('Failed to generate fingerprint:', error)
    // Fallback
    return crypto.randomUUID()
  }
}
```

---

## Modify lovable-auth.js

Replace/update the authentication logic to call your validator API:

```javascript
// Before: Extension validated locally
// After: Extension validates against your API

async function validateLicenseKey(licenseKey) {
  const fingerprint = await generateHardwareFingerprint()
  
  try {
    const response = await fetch('https://your-api-domain.com/api/licenses/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        licenseKey,
        hardwareFingerprint: fingerprint
      })
    })
    
    const data = await response.json()
    
    if (!data.valid) {
      throw new Error(data.message || 'License validation failed')
    }
    
    // Store validation result
    chrome.storage.local.set({
      'license-key': licenseKey,
      'license-valid': true,
      'license-expires': data.license.expiresAt,
      'license-tier': data.license.tier,
      'hardware-fingerprint': fingerprint,
      'last-validation': new Date().toISOString()
    })
    
    return data.license
  } catch (error) {
    console.error('License validation error:', error)
    throw error
  }
}
```

---

## Usage Tracking

Add periodic usage tracking to your extension:

```javascript
// In background.js or content.js

async function trackUsage() {
  const { 'license-key': licenseKey, 'hardware-fingerprint': fingerprint } = 
    await chrome.storage.local.get(['license-key', 'hardware-fingerprint'])
  
  if (!licenseKey || !fingerprint) return
  
  try {
    const response = await fetch('https://your-api-domain.com/api/licenses/track-usage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        licenseKey,
        hardwareFingerprint: fingerprint
      })
    })
    
    const data = await response.json()
    
    if (!data.success) {
      console.warn('Usage tracking failed:', data.message)
      
      // Handle errors
      if (data.error === 'USAGE_LIMIT_EXCEEDED') {
        // Show error notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/images/icon-128.png',
          title: 'Usage Limit Exceeded',
          message: `You have reached your daily limit of ${data.usage.maxLimit} API calls`
        })
        
        // Disable extension or show rate limit UI
        chrome.runtime.sendMessage({
          action: 'show-rate-limit-notification'
        })
      }
      return
    }
    
    // Update local storage with usage info
    chrome.storage.local.set({
      'usage-today': data.usage.todayUsage,
      'usage-total': data.usage.totalUsage,
      'usage-remaining': data.usage.remaining,
      'last-usage-check': new Date().toISOString()
    })
  } catch (error) {
    console.error('Usage tracking error:', error)
  }
}

// Call tracking every hour
chrome.alarms.create('track-usage', { periodInMinutes: 60 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'track-usage') {
    trackUsage()
  }
})
```

---

## License Expiry Check

Add expiry validation:

```javascript
async function checkLicenseExpiry() {
  const { 'license-expires': expiresAt } = 
    await chrome.storage.local.get(['license-expires'])
  
  if (!expiresAt) return
  
  const expiry = new Date(expiresAt)
  const now = new Date()
  
  if (now > expiry) {
    // License expired
    chrome.storage.local.set({ 'license-valid': false })
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/images/icon-128.png',
      title: 'License Expired',
      message: 'Your license has expired. Please renew your subscription.'
    })
    
    // Disable extension features
    disableExtensionFeatures()
  } else {
    // Check if expiring soon (7 days)
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry <= 7) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/images/icon-128.png',
        title: 'License Expiring Soon',
        message: `Your license expires in ${daysUntilExpiry} days`
      })
    }
  }
}

// Check daily
chrome.alarms.create('check-expiry', { periodInMinutes: 1440 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'check-expiry') {
    checkLicenseExpiry()
  }
})
```

---

## Popup Modifications

Update the popup to show:

1. **License Status**
   - Valid/Invalid
   - Days until expiry
   - Seats used
   
2. **Usage Info**
   - Today's usage
   - Total usage
   - Remaining quota
   
3. **Quick Actions**
   - Renew license link
   - View on dashboard link
   - Support contact

---

## Environment Configuration

Create a config file for the API endpoint:

```javascript
// config.js or config.ts
export const CONFIG = {
  API_BASE_URL: process.env.VITE_API_URL || 'https://your-api-domain.com',
  API_TIMEOUT: 5000,
  VALIDATION_INTERVAL: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  USAGE_TRACK_INTERVAL: 60 * 60 * 1000, // 1 hour in milliseconds
}
```

---

## CORS Considerations

Your API needs to handle CORS for the extension:

In your Next.js API routes, add:

```javascript
// middleware or in each route handler
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  // Allow extension to make requests
  const response = NextResponse.json({ ... })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  
  return response
}
```

---

## Testing

### Local Testing

1. Set `API_BASE_URL` to `http://localhost:3000`
2. Run your dev server: `npm run dev`
3. Load extension in Chrome dev mode
4. Test license validation with a valid key

### Production Testing

1. Deploy Next.js app to Vercel
2. Update `API_BASE_URL` to production domain
3. Test with real license keys

---

## File Changes Summary

### Create new files:
- `lib/hardware-fingerprint.ts` - Fingerprint generation
- `lib/api-client.ts` - API communication helper
- `lib/license-validator.ts` - License validation logic

### Modify existing files:
- `lovable-auth.js` - Replace with API-based validation
- `popup.js` - Update UI to show license status
- `background.js` - Add usage tracking and expiry checks
- `manifest.json` - Update permissions if needed

### Optional:
- `lib/config.ts` - Configuration management
- `lib/storage.ts` - Local storage helper functions
