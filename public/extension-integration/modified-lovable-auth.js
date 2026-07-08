/**
 * MODIFIED lovable-auth.js for License Validator Integration
 * 
 * This file replaces the obfuscated lovable-auth.js in your extension
 * It validates licenses against your custom License Validator API instead of the old system
 * 
 * CHANGES:
 * 1. All API calls now point to YOUR license validator backend
 * 2. Hardware fingerprinting is included for device binding
 * 3. License validation with expiry and device seat tracking
 * 4. Usage quota enforcement
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    API_BASE: 'https://your-domain.vercel.app', // CHANGE THIS TO YOUR DEPLOYMENT URL
    VALIDATE_ENDPOINT: '/api/licenses/validate',
    TRACK_USAGE_ENDPOINT: '/api/licenses/track-usage',
    HEARTBEAT_INTERVAL: 3600000, // 1 hour in milliseconds
  };

  // Generate device hardware fingerprint
  async function getDeviceFingerprint() {
    try {
      const components = [
        navigator.userAgent,
        navigator.language,
        navigator.hardwareConcurrency,
        navigator.deviceMemory,
        navigator.maxTouchPoints,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        window.navigator.plugins.length,
      ].join('|');

      // Simple hash function
      let hash = 0;
      for (let i = 0; i < components.length; i++) {
        const char = components.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      return 'fp_' + Math.abs(hash).toString(16);
    } catch (e) {
      console.error('[Lovable Auth] Error generating device fingerprint:', e);
      return 'fp_unknown';
    }
  }

  // Validate license against the new API
  async function validateLicense(licenseKey) {
    try {
      const fingerprint = await getDeviceFingerprint();

      const response = await fetch(CONFIG.API_BASE + CONFIG.VALIDATE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: licenseKey,
          hardwareFingerprint: fingerprint,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        console.error('[Lovable Auth] Validation request failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Lovable Auth] Validation error:', error);
      return null;
    }
  }

  // Track usage for the license
  async function trackUsage(licenseKey) {
    try {
      const fingerprint = await getDeviceFingerprint();

      const response = await fetch(CONFIG.API_BASE + CONFIG.TRACK_USAGE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: licenseKey,
          hardwareFingerprint: fingerprint,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        console.error('[Lovable Auth] Usage tracking failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Lovable Auth] Usage tracking error:', error);
      return null;
    }
  }

  // Main license check function
  async function checkAndValidateLicense() {
    try {
      // Get license key from chrome storage
      chrome.storage.local.get(['ql_license_key'], async (result) => {
        const licenseKey = result.ql_license_key;

        if (!licenseKey) {
          console.log('[Lovable Auth] No license key found');
          return;
        }

        // Validate the license
        const validationResult = await validateLicense(licenseKey);

        if (!validationResult) {
          console.error('[Lovable Auth] License validation failed');
          chrome.storage.local.set({
            'ql_license_valid': false,
            'ql_license_status': 'error',
          });
          return;
        }

        // Check if license is valid
        if (validationResult.valid === true) {
          // Store license data
          chrome.storage.local.set({
            'ql_license_valid': true,
            'ql_license_status': validationResult.status || 'active',
            'ql_license_data': validationResult,
            'ql_plan_name': validationResult.plan_name,
            'ql_plan_type': validationResult.plan_type,
            'ql_expires_at': validationResult.expires_at,
            'ql_usage_limit': validationResult.usage_limit,
            'ql_usage_count': validationResult.usage_count,
            'ql_seats_used': validationResult.seats_used || 1,
            'ql_max_seats': validationResult.max_seats,
            'ql_last_validated': new Date().toISOString(),
          });

          // Track usage if license is active
          if (validationResult.status === 'active') {
            await trackUsage(licenseKey);
          }
        } else {
          // License is invalid
          chrome.storage.local.set({
            'ql_license_valid': false,
            'ql_license_status': validationResult.status || 'invalid',
            'ql_license_data': validationResult,
          });

          console.warn('[Lovable Auth] License validation failed:', validationResult.reason);
        }
      });
    } catch (error) {
      console.error('[Lovable Auth] Error in checkAndValidateLicense:', error);
    }
  }

  // Expose functions globally for background script
  window.LovableAuth = {
    validateLicense,
    trackUsage,
    getDeviceFingerprint,
    checkAndValidateLicense,
    CONFIG,
  };

  // Auto-check license every hour
  setInterval(checkAndValidateLicense, CONFIG.HEARTBEAT_INTERVAL);

  // Check on startup
  checkAndValidateLicense();
})();
