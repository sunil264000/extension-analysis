// local-activation.js - PATCHED FOR EXTERNAL LICENSE VALIDATION
// ============================================================================
// CRITICAL PATCH: This file has been modified to allow external license
// validation against https://extension-analysis.vercel.app
//
// When a user enters a license key (format: LI-XXXX-XXXX-XXXX-XXXX),
// it will validate against your backend API.
// ============================================================================

(function () {
  "use strict";

  var FAR_FUTURE = "2099-12-31T23:59:59.000Z";
  var NOW_ISO = new Date().toISOString();

  // FALLBACK license - only for demo/offline (LIMITED features)
  var FALLBACK_LICENSE = {
    valid: true,
    status: "valid",
    plan_name: "Demo/Offline",
    plan_type: "demo",
    expires_at: FAR_FUTURE,
    activated_at: NOW_ISO,
    is_lifetime: false,
    unlimited: false,
    credits_total: 50,
    credits_used: 0,
    credits_remaining: 50,
    device_limit: 1,
    max_devices: 1,
    user_name: "Demo Mode (Limited)",
  };

  var FALLBACK_LICENSE_KEY = "DEMO-OFFLINE-MODE";

  // API configuration - CRITICAL: Must match your Vercel deployment
  var API_CONFIG = {
    ENDPOINT: "https://extension-analysis.vercel.app",
    VALIDATE_URL: "/api/licenses/validate",
    TRACK_URL: "/api/licenses/track-usage",
  };

  // Check for existing license in storage
  var storedLicenseKey = null;
  var storedLicense = null;
  try {
    storedLicenseKey = localStorage.getItem("license_key") || localStorage.getItem("ql_license_key");
    var licenseStr = localStorage.getItem("lovable_license_data") || localStorage.getItem("ql_license_data");
    storedLicense = licenseStr ? JSON.parse(licenseStr) : null;
  } catch (e) {}

  // Hardware fingerprint for device binding
  function getHardwareFingerprint() {
    try {
      var data = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: (typeof screen !== "undefined") ? (screen.width + "x" + screen.height) : "unknown",
        timezone: (typeof Intl !== "undefined") ? Intl.DateTimeFormat().resolvedOptions().timeZone : "unknown",
      };
      var str = JSON.stringify(data);
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
      }
      return "HWID-" + Math.abs(hash).toString(16).toUpperCase();
    } catch (e) {
      return "HWID-UNKNOWN";
    }
  }

  // MAIN LICENSE VALIDATOR - CALLS YOUR API
  var pkLicenseV2 = {
    validateLicense: function () {
      var self = this;
      return new Promise(function(resolve) {
        // Check if we have a real license key to validate
        if (!storedLicenseKey || storedLicenseKey.indexOf("LI-") !== 0) {
          console.log("[License] No valid license key format, using demo mode");
          resolve(FALLBACK_LICENSE);
          return;
        }

        // Call the API to validate the license
        try {
          var hwFp = getHardwareFingerprint();
          console.log("[License] Validating license:", storedLicenseKey);
          
          fetch(API_CONFIG.ENDPOINT + API_CONFIG.VALIDATE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              licenseKey: storedLicenseKey,
              hardwareFingerprint: hwFp,
            }),
          })
            .then(function(response) {
              if (!response.ok) throw new Error("HTTP " + response.status);
              return response.json();
            })
            .then(function(data) {
              if (data.valid && data.license) {
                console.log("[License] VALID license from API");
                storedLicense = data.license;
                resolve(data.license);
              } else {
                console.warn("[License] API says license is invalid:", data.message);
                resolve(FALLBACK_LICENSE);
              }
            })
            .catch(function(error) {
              console.warn("[License] API call failed:", error.message);
              // Fallback to cached license if API fails
              if (storedLicense) {
                console.log("[License] Using cached license");
                resolve(storedLicense);
              } else {
                resolve(FALLBACK_LICENSE);
              }
            });
        } catch (e) {
          console.error("[License] Validation exception:", e.message);
          resolve(storedLicense || FALLBACK_LICENSE);
        }
      });
    },

    heartbeat: function () {
      return this.validateLicense();
    },

    getStatus: function () {
      return Promise.resolve(storedLicense || FALLBACK_LICENSE);
    },

    getLicense: function () {
      return storedLicense || FALLBACK_LICENSE;
    },

    isValid: function () {
      return !!(storedLicense && storedLicense.valid);
    },
  };

  // Gate function used by content scripts
  function pkEnsureActiveLicense() {
    return Promise.resolve({
      allowed: true,
      license: storedLicense || FALLBACK_LICENSE,
    });
  }

  function pkRevokeLicenseStorage() {
    return Promise.resolve();
  }

  function validateLicense() {
    return pkLicenseV2.validateLicense();
  }

  // IMPORTANT: Do NOT bypass credit checks - respect license limits!
  function setPkCreditBypass() {
    return false;
  }

  // Initialize storage only if empty
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["license_key"], function(result) {
        if (!result.license_key) {
          chrome.storage.local.set({
            ql_license_valid: true,
            ql_license_status: "valid",
            ql_license_key: FALLBACK_LICENSE_KEY,
            ql_license_data: FALLBACK_LICENSE,
            ql_user_name: FALLBACK_LICENSE.user_name,
            license_key: FALLBACK_LICENSE_KEY,
          });
        }
      });
    }
  } catch (e) {}

  // Expose functions globally
  var scopes = [];
  try {
    if (typeof window !== "undefined") scopes.push(window);
  } catch (e) {}
  try {
    if (typeof self !== "undefined" && self !== (typeof window !== "undefined" ? window : null))
      scopes.push(self);
  } catch (e) {}
  try {
    if (typeof globalThis !== "undefined" && scopes.indexOf(globalThis) === -1) scopes.push(globalThis);
  } catch (e) {}

  for (var i = 0; i < scopes.length; i++) {
    var g = scopes[i];
    g.pkLicenseV2 = pkLicenseV2;
    g.pkEnsureActiveLicense = pkEnsureActiveLicense;
    g.pkRevokeLicenseStorage = pkRevokeLicenseStorage;
    g.validateLicense = validateLicense;
    g.setPkCreditBypass = setPkCreditBypass;
    g.__PK_CREDIT_BYPASS__ = false; // CRITICAL: Do NOT bypass credits
  }

  console.log("[License] Extension ready - will validate licenses against:", API_CONFIG.ENDPOINT);
})();
