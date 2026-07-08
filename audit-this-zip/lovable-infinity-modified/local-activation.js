// local-activation.js
// -----------------------------------------------------------------------------
// Self-hosted / offline activation for personal use.
//
// This extension's UI is gated behind a license check that normally contacts a
// remote license server. This file removes that dependency by providing a
// permanent, local "valid license" state. There is NO network activity here:
// nothing is sent anywhere, no keys are proxied, no device identity is spoofed.
// It simply supplies the same in-memory objects and stored values the app
// expects to see when a license is active.
//
// Loaded FIRST (before the app scripts) in sidepanel.html, popup.html and as
// the first content script, so the functions/values exist before anything
// reads them.
// -----------------------------------------------------------------------------

(function () {
  "use strict";

  var FAR_FUTURE = "2099-12-31T23:59:59.000Z";
  var NOW_ISO = new Date().toISOString();

  // The license object the app renders and checks (`license.valid === true`).
  var LICENSE = {
    valid: true,
    status: "valid",
    plan_name: "Lifetime",
    plan_type: "lifetime",
    expires_at: FAR_FUTURE,
    activated_at: NOW_ISO,
    is_lifetime: true,
    unlimited: true,
    credits_total: 999999999,
    credits_used: 0,
    credits_remaining: 999999999,
    device_limit: 999,
    max_devices: 999,
    user_name: "Local User",
  };

  var LICENSE_KEY = "LI-LOCAL-OFFLINE-ACTIVATION";

  // The exact keys sidepanel.js / popup.js read from chrome.storage.local.
  var STORAGE_SEED = {
    ql_license_valid: true,
    ql_license_status: "valid",
    ql_license_key: LICENSE_KEY,
    ql_license_data: LICENSE,
    ql_user_name: LICENSE.user_name,
    ql_expires_at: FAR_FUTURE,
    ql_activated_at: NOW_ISO,
    license_key: LICENSE_KEY,
    plan: { plan_name: LICENSE.plan_name, plan_type: LICENSE.plan_type },
  };

  // --- Seed persistent storage so the gate is skipped on every load ----------
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(STORAGE_SEED);
    }
  } catch (e) {}

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("ql_license_valid", "true");
      localStorage.setItem("ql_license_status", "valid");
      localStorage.setItem("ql_license_key", LICENSE_KEY);
      localStorage.setItem("ql_license_data", JSON.stringify(LICENSE));
    }
  } catch (e) {}

  // --- Provide the functions the app calls -----------------------------------
  // pkLicenseV2: module used for validation + periodic heartbeat.
  var pkLicenseV2 = {
    validateLicense: function () {
      return Promise.resolve(LICENSE);
    },
    heartbeat: function () {
      return Promise.resolve(LICENSE);
    },
    getStatus: function () {
      return Promise.resolve(LICENSE);
    },
    getLicense: function () {
      return LICENSE;
    },
    isValid: function () {
      return true;
    },
  };

  // pkEnsureActiveLicense: gate used by content scripts / sidepanel.
  function pkEnsureActiveLicense() {
    return Promise.resolve({ allowed: true, license: LICENSE });
  }

  // pkRevokeLicenseStorage: no-op so the local activation is never cleared.
  function pkRevokeLicenseStorage() {
    return Promise.resolve();
  }

  // validateLicense: standalone helper some code paths call directly.
  function validateLicense() {
    return Promise.resolve(LICENSE);
  }

  // setPkCreditBypass: enable unlimited credits regardless of argument.
  function setPkCreditBypass() {
    try {
      if (typeof window !== "undefined") window.__PK_CREDIT_BYPASS__ = true;
    } catch (e) {}
    return true;
  }

  // Expose on every relevant global scope (window + service worker/self).
  var scopes = [];
  try { if (typeof window !== "undefined") scopes.push(window); } catch (e) {}
  try { if (typeof self !== "undefined" && self !== (typeof window !== "undefined" ? window : null)) scopes.push(self); } catch (e) {}
  try { if (typeof globalThis !== "undefined" && scopes.indexOf(globalThis) === -1) scopes.push(globalThis); } catch (e) {}

  for (var i = 0; i < scopes.length; i++) {
    var g = scopes[i];
    g.pkLicenseV2 = pkLicenseV2;
    g.pkEnsureActiveLicense = pkEnsureActiveLicense;
    g.pkRevokeLicenseStorage = pkRevokeLicenseStorage;
    g.validateLicense = validateLicense;
    g.setPkCreditBypass = setPkCreditBypass;
    g.__PK_CREDIT_BYPASS__ = true;
  }
})();
