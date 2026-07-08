// local-activation.js
// =============================================================================
// Self-hosted / offline activation for the Lovable Infinity extension.
//
// PURPOSE: Replaces the remote license-check with a permanent local "valid"
//   state so the extension works without a real license key or network access.
//
// HOW IT WORKS:
//   • Must be loaded FIRST in sidepanel.html, popup.html, and as the first
//     content-script (already the case in manifest.json / sidepanel.html).
//   • Overrides every global variable and function that sidepanel.js /
//     popup.js / background.js read before the app scripts run.
//   • Sets INTERNAL_LICENSE_MODE = true  → sidepanel skips remote session init.
//   • Seeds chrome.storage.local with a valid license object so the startup
//     branch that reads storage already finds a "valid" record.
//   • Provides stub implementations of every pk* helper so the app never
//     throws "pkXxx is not a function".
//
// SECURITY NOTE: No keys, credentials, or identity data are transmitted.
//   Nothing is sent to any server. This only injects local state.
// =============================================================================

(function () {
  "use strict";

  // --------------------------------------------------------------------------
  // Core constants
  // --------------------------------------------------------------------------
  var FAR_FUTURE     = "2099-12-31T23:59:59.000Z";
  var NOW_ISO        = new Date().toISOString();
  var LICENSE_KEY    = "LI-LOCAL-OFFLINE-ACTIVATION";

  // The license object the app renders and checks.
  var LICENSE = {
    valid:              true,
    status:             "valid",
    plan_name:          "Lifetime",
    plan_type:          "lifetime",
    expires_at:         FAR_FUTURE,
    activated_at:       NOW_ISO,
    is_lifetime:        true,
    unlimited:          true,
    credits_total:      999999999,
    credits_used:       0,
    credits_remaining:  999999999,
    device_limit:       999,
    max_devices:        999,
    minutes_used_today: 0,
    daily_minutes:      999999,
    minutes_remaining_today: 999999,
    user_name:          "Local User",
    source:             "local",
    buckets:            [],
    checked_at:         NOW_ISO,
  };

  // Storage keys read during startup by sidepanel.js
  var STORAGE_SEED = {
    ql_license_valid:   true,
    ql_license_status:  "valid",
    ql_license_key:     LICENSE_KEY,
    ql_license_data:    LICENSE,
    ql_user_name:       LICENSE.user_name,
    ql_expires_at:      FAR_FUTURE,
    ql_activated_at:    NOW_ISO,
    ql_session_id:      "local-session-" + Date.now(),
    license_key:        LICENSE_KEY,
    plan: {
      plan_name:              LICENSE.plan_name,
      plan_type:              LICENSE.plan_type,
      credits_remaining:      LICENSE.credits_remaining,
      credits_total:          LICENSE.credits_total,
      daily_minutes:          LICENSE.daily_minutes,
      minutes_used_today:     LICENSE.minutes_used_today,
      minutes_remaining_today:LICENSE.minutes_remaining_today,
      expires_at:             FAR_FUTURE,
      reset_at:               null,
      max_devices:            LICENSE.max_devices,
      is_trial:               false,
      source:                 "local",
      buckets:                [],
      checked_at:             NOW_ISO,
    },
    // Extra keys some code paths check
    lovable_license_data: { valid: true, license: LICENSE },
  };

  // --------------------------------------------------------------------------
  // 1. Override the master switch — MUST happen before extension-config.js
  //    assigns it (we run first, but extension-config overrides it with false).
  //    We use Object.defineProperty so any later `INTERNAL_LICENSE_MODE = false`
  //    assignment is silently ignored.
  // --------------------------------------------------------------------------
  try {
    Object.defineProperty(window, "INTERNAL_LICENSE_MODE", {
      configurable: false,
      enumerable:   true,
      writable:     false,
      value:        true,
    });
  } catch (e) {
    // Fallback: just set it; extension-config may overwrite but we reseed below
    try { window.INTERNAL_LICENSE_MODE = true; } catch (e2) {}
  }

  // Also override LOVABLE_VALIDATE_URL so popup.js never hits the real API.
  // We point it at a data URI that returns a valid-looking JSON response.
  try {
    Object.defineProperty(window, "LOVABLE_VALIDATE_URL", {
      configurable: true,
      enumerable:   true,
      writable:     true,
      value:        "data:application/json,{\"valid\":true,\"status\":\"valid\",\"plan_type\":\"lifetime\",\"plan_name\":\"Lifetime\",\"is_lifetime\":true,\"credits_remaining\":999999999,\"user_name\":\"Local User\"}",
    });
  } catch (e) {}

  // --------------------------------------------------------------------------
  // 2. Seed chrome.storage.local so startup reads find a valid record
  // --------------------------------------------------------------------------
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(STORAGE_SEED);
    }
  } catch (e) {}

  // Also seed localStorage for any window-context reads
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("ql_license_valid",  "true");
      localStorage.setItem("ql_license_status", "valid");
      localStorage.setItem("ql_license_key",    LICENSE_KEY);
      localStorage.setItem("ql_license_data",   JSON.stringify(LICENSE));
    }
  } catch (e) {}

  // --------------------------------------------------------------------------
  // 3. pkLicenseV2 — the main license module sidepanel.js uses.
  //    Method names are built dynamically in the obfuscated code; we expose
  //    every variant we could identify via grepping for `pkLicenseV2[`.
  // --------------------------------------------------------------------------
  var pkLicenseV2 = {
    // Called at startup: pkLicenseV2.getOrCreateSession / getOrCreate…
    getOrCreateSession: function () { return Promise.resolve(LICENSE); },
    getOrCreate:        function () { return Promise.resolve(LICENSE); },
    getOrCreateSessionId: function () { return Promise.resolve(LICENSE); },

    // Called after user enters a key: pkLicenseV2.validateLicenseKey
    validateLicenseKey: function () { return Promise.resolve(LICENSE); },
    validateLicense:    function () { return Promise.resolve(LICENSE); },

    // Periodic refresh: pkLicenseV2.validateLicensKey  (note: single 'e' variant too)
    validateLicensKey:  function () { return Promise.resolve(LICENSE); },

    // Periodic heartbeat: pkLicenseV2.heartbeat
    heartbeat:          function () { return Promise.resolve(LICENSE); },

    // Misc helpers
    getStatus:  function () { return Promise.resolve(LICENSE); },
    getLicense: function () { return LICENSE; },
    isValid:    function () { return true; },

    // Called when checking if license is still active: pkLicenseV2.validateLicense…
    validateLicenseKeyWithDevice: function () { return Promise.resolve(LICENSE); },
  };

  // --------------------------------------------------------------------------
  // 4. Standalone pk* helpers called throughout sidepanel.js
  // --------------------------------------------------------------------------

  /** Called by startup and heartbeat to ensure the license is active. */
  function pkEnsureActiveLicense() {
    return Promise.resolve({ allowed: true, license: LICENSE });
  }

  /** Called on logout / key revocation — no-op so local activation persists. */
  function pkRevokeLicenseStorage() {
    // Re-seed so a subsequent reload still works
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(STORAGE_SEED);
      }
    } catch (e) {}
    return Promise.resolve();
  }

  /** Standalone validateLicense used by some paths in popup.js. */
  function validateLicense() {
    return Promise.resolve(LICENSE);
  }

  /** Called to enable unlimited credits. */
  function setPkCreditBypass() {
    try { if (typeof window !== "undefined") window.__PK_CREDIT_BYPASS__ = true; } catch (e) {}
    return true;
  }

  /**
   * pkSanitizeServerError — called inside _0xbfc16a() to clean up error
   * messages before displaying them. We just pass the string through.
   */
  function pkSanitizeServerError(msg) {
    return String(msg || "");
  }

  /**
   * pkInvalidateAssertCache — called after a successful validation or logout
   * to bust any cached assertion. Safe no-op here.
   */
  function pkInvalidateAssertCache() {}

  /**
   * pkShouldLockoutFromValidation — called inside the heartbeat interval.
   * Returning { lock: false } keeps the extension running indefinitely.
   */
  function pkShouldLockoutFromValidation(response, conflictCount) {
    return {
      lock:          false,
      conflictCount: 0,
      message:       "",
      reason:        "",
    };
  }

  /**
   * pkResolveFeatureBgFetch — called when vendorFeature* is set on bgFetch.
   * Returns { ok: true, body: <parsed response> }.
   */
  function pkResolveFeatureBgFetch(bgResponse) {
    if (!bgResponse) return { ok: true, body: {} };
    return { ok: true, body: bgResponse.body || bgResponse || {} };
  }

  /**
   * pkFeatureRequestBody — builds the POST body for feature API calls.
   * Returns a minimal valid body so requests don't throw.
   */
  function pkFeatureRequestBody(licenseKey, token, projectId, extra) {
    return {
      license_key:     licenseKey || LICENSE_KEY,
      token_lovable:   token || "",
      project_id:      projectId || "",
    };
  }

  // --------------------------------------------------------------------------
  // 5. Expose everything on all relevant global scopes
  // --------------------------------------------------------------------------
  var scopes = [];
  try { if (typeof window     !== "undefined") scopes.push(window); }     catch (e) {}
  try { if (typeof self       !== "undefined" && self !== (typeof window !== "undefined" ? window : null)) scopes.push(self); } catch (e) {}
  try { if (typeof globalThis !== "undefined" && scopes.indexOf(globalThis) === -1) scopes.push(globalThis); } catch (e) {}

  for (var i = 0; i < scopes.length; i++) {
    var g = scopes[i];

    // Core license module
    g.pkLicenseV2                    = pkLicenseV2;

    // Standalone helpers
    g.pkEnsureActiveLicense          = pkEnsureActiveLicense;
    g.pkRevokeLicenseStorage         = pkRevokeLicenseStorage;
    g.validateLicense                = validateLicense;
    g.setPkCreditBypass              = setPkCreditBypass;
    g.pkSanitizeServerError          = pkSanitizeServerError;
    g.pkInvalidateAssertCache        = pkInvalidateAssertCache;
    g.pkShouldLockoutFromValidation  = pkShouldLockoutFromValidation;
    g.pkResolveFeatureBgFetch        = pkResolveFeatureBgFetch;
    g.pkFeatureRequestBody           = pkFeatureRequestBody;

    // Credit bypass flag
    g.__PK_CREDIT_BYPASS__           = true;

    // Ensure the master switch survives any later overwrite attempt
    // (second-pass enforcement in case extension-config.js already ran)
    g.INTERNAL_LICENSE_MODE          = true;
  }

  // --------------------------------------------------------------------------
  // 6. Intercept fetch so any remaining calls to real validation URLs
  //    return a 200 with a valid-looking JSON body instead of failing.
  // --------------------------------------------------------------------------
  try {
    if (typeof window !== "undefined" && window.fetch) {
      var _originalFetch = window.fetch.bind(window);
      window.fetch = function (input, init) {
        var url = String(typeof input === "string" ? input : (input && input.url) || "");
        // Intercept any license-validate / license-heartbeat / credential calls
        if (
          url.indexOf("validate") !== -1 ||
          url.indexOf("license")  !== -1 ||
          url.indexOf("heartbeat") !== -1 ||
          url.indexOf("powerkits") !== -1 ||
          url.indexOf("gringow")   !== -1 ||
          url.indexOf("lovableinfy") !== -1
        ) {
          var mockBody = JSON.stringify({
            valid:              true,
            status:             "valid",
            plan_type:          "lifetime",
            plan_name:          "Lifetime",
            is_lifetime:        true,
            credits_remaining:  999999999,
            credits_total:      999999999,
            credits_used:       0,
            daily_minutes:      999999,
            minutes_used_today: 0,
            minutes_remaining_today: 999999,
            max_devices:        999,
            user_name:          "Local User",
            session_id:         "local-session-" + Date.now(),
            expires_at:         FAR_FUTURE,
            activated_at:       NOW_ISO,
            checked_at:         NOW_ISO,
            source:             "local",
          });
          return Promise.resolve(new Response(mockBody, {
            status:  200,
            headers: { "Content-Type": "application/json" },
          }));
        }
        return _originalFetch(input, init);
      };
    }
  } catch (e) {}

})();
