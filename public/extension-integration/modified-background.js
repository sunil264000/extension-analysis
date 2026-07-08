/**
 * MODIFIED background.js for License Validator Integration
 * 
 * Service Worker that handles:
 * 1. License validation on extension startup
 * 2. Periodic license sync with the validator API
 * 3. UI state management based on license status
 * 4. Message passing to content scripts
 */

const VALIDATOR_CONFIG = {
  API_BASE: 'https://your-domain.vercel.app', // CHANGE TO YOUR DEPLOYMENT URL
  VALIDATE_ENDPOINT: '/api/licenses/validate',
  TRACK_USAGE_ENDPOINT: '/api/licenses/track-usage',
  CHECK_INTERVAL: 3600000, // Check every hour
  INITIAL_CHECK_DELAY: 5000, // Check 5 seconds after extension loads
};

let validationCheckTimer = null;

// Helper: Generate device fingerprint
async function getDeviceFingerprint() {
  try {
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.hardwareConcurrency,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
    ].join('|');

    let hash = 0;
    for (let i = 0; i < components.length; i++) {
      const char = components.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
    }

    return 'fp_' + Math.abs(hash).toString(16);
  } catch (e) {
    return 'fp_unknown';
  }
}

// Helper: Make API call
async function callValidatorAPI(endpoint, payload) {
  try {
    const response = await fetch(VALIDATOR_CONFIG.API_BASE + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[Background] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Background] API call failed:', error.message);
    return null;
  }
}

// Validate license with the API
async function validateLicenseWithAPI(licenseKey) {
  if (!licenseKey) {
    console.log('[Background] No license key to validate');
    return null;
  }

  const fingerprint = await getDeviceFingerprint();

  const result = await callValidatorAPI(VALIDATOR_CONFIG.VALIDATE_ENDPOINT, {
    licenseKey,
    hardwareFingerprint: fingerprint,
    timestamp: Date.now(),
  });

  return result;
}

// Track usage on the server
async function trackUsageWithAPI(licenseKey) {
  if (!licenseKey) return null;

  const fingerprint = await getDeviceFingerprint();

  const result = await callValidatorAPI(VALIDATOR_CONFIG.TRACK_USAGE_ENDPOINT, {
    licenseKey,
    hardwareFingerprint: fingerprint,
    timestamp: Date.now(),
  });

  return result;
}

// Update UI badge based on license status
function updateUIBadge(licenseData) {
  if (!licenseData) {
    chrome.action.setBadge({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF6B9D' });
    return;
  }

  if (licenseData.valid === true) {
    if (licenseData.status === 'active') {
      chrome.action.setBadge({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else if (licenseData.status === 'expiring_soon') {
      chrome.action.setBadge({ text: '⚠' });
      chrome.action.setBadgeBackgroundColor({ color: '#FFC107' });
    } else {
      chrome.action.setBadge({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF6B9D' });
    }
  } else {
    chrome.action.setBadge({ text: '✗' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
  }
}

// Main validation check
async function performLicenseValidation() {
  try {
    console.log('[Background] Performing license validation check');

    chrome.storage.local.get(['ql_license_key'], async (result) => {
      const licenseKey = result.ql_license_key;

      if (!licenseKey) {
        console.log('[Background] No license key found, clearing validation state');
        chrome.storage.local.set({
          'ql_license_valid': false,
          'ql_license_status': 'no_license',
        });
        updateUIBadge(null);
        return;
      }

      // Validate license
      const validationResult = await validateLicenseWithAPI(licenseKey);

      if (!validationResult) {
        console.warn('[Background] License validation returned no data');
        chrome.storage.local.set({
          'ql_license_valid': false,
          'ql_license_status': 'validation_error',
        });
        updateUIBadge(null);
        return;
      }

      // Update storage with validation result
      const storageData = {
        'ql_license_valid': validationResult.valid === true,
        'ql_license_status': validationResult.status || 'unknown',
        'ql_license_data': validationResult,
        'ql_last_validated_at': new Date().toISOString(),
      };

      // Add optional fields
      if (validationResult.plan_name) storageData['ql_plan_name'] = validationResult.plan_name;
      if (validationResult.plan_type) storageData['ql_plan_type'] = validationResult.plan_type;
      if (validationResult.expires_at) storageData['ql_expires_at'] = validationResult.expires_at;
      if (validationResult.usage_limit) storageData['ql_usage_limit'] = validationResult.usage_limit;
      if (validationResult.max_seats) storageData['ql_max_seats'] = validationResult.max_seats;

      chrome.storage.local.set(storageData);

      // Update UI
      updateUIBadge(validationResult);

      // If license is valid and active, track usage
      if (validationResult.valid === true && validationResult.status === 'active') {
        await trackUsageWithAPI(licenseKey);
      }

      console.log('[Background] License validation complete:', {
        valid: validationResult.valid,
        status: validationResult.status,
      });
    });
  } catch (error) {
    console.error('[Background] Validation check failed:', error);
  }
}

// Start periodic validation
function startValidationLoop() {
  if (validationCheckTimer) clearInterval(validationCheckTimer);

  // Initial check after delay
  setTimeout(performLicenseValidation, VALIDATOR_CONFIG.INITIAL_CHECK_DELAY);

  // Periodic checks
  validationCheckTimer = setInterval(performLicenseValidation, VALIDATOR_CONFIG.CHECK_INTERVAL);

  console.log('[Background] Validation loop started');
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'validate_license') {
    performLicenseValidation();
    sendResponse({ acknowledged: true });
  } else if (request.action === 'get_license_status') {
    chrome.storage.local.get(['ql_license_valid', 'ql_license_data'], (result) => {
      sendResponse({
        valid: result.ql_license_valid || false,
        data: result.ql_license_data || null,
      });
    });
    return true; // Will respond asynchronously
  } else if (request.action === 'track_usage') {
    chrome.storage.local.get(['ql_license_key'], async (result) => {
      await trackUsageWithAPI(result.ql_license_key);
      sendResponse({ done: true });
    });
    return true;
  }
});

// Start validation on extension load
startValidationLoop();

// Re-validate when extension restarts
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Extension restarted');
  performLicenseValidation();
});

// Re-validate when storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes['ql_license_key']) {
    console.log('[Background] License key changed, re-validating');
    performLicenseValidation();
  }
});
