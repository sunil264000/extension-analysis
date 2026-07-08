// local-activation.js
// =============================================================================
//  ██  LOVABLE INFINITY — ONLINE LICENSE VALIDATOR  ██
// -----------------------------------------------------------------------------
//  BUILD TAG : v6  (2026-07-08)  "online-validation"
//  EDITED BY : v0
//  CHANGE    : Replaces the old offline "always valid" bypass with a REAL
//              online validator. The extension now ONLY unlocks after the
//              user's license key is validated against the website API. Plans
//              are DURATION-BASED (e.g. 1 / 7 / 15 / 30 days) — access is
//              automatically revoked when the license expires. No credit
//              system, no fake 999,999,999 gauge.
// -----------------------------------------------------------------------------
//  HOW IT WORKS
//    1. Runs FIRST in sidepanel.html / popup.html (see manifest.json).
//    2. On load it reads the stored license key + cached validation.
//         • valid & not expired  → seeds ql_* storage, extension runs.
//         • expired / invalid    → clears storage, shows the license gate.
//         • no key               → shows the license gate.
//    3. The gate asks the user for a license key and a "Buy a plan" link that
//       opens the website shop. Submitting calls the website API:
//            POST {LICENSE_API_BASE}/api/licenses/validate
//            body: { licenseKey, hardwareFingerprint }
//    4. On success it stores the key + validation result and unlocks the UI.
//    5. pkLicenseV2 methods perform REAL validation + heartbeat. Every
//       heartbeat re-checks expiry so a plan that runs out is locked out.
// -----------------------------------------------------------------------------
//  ⚙  CONFIG: set LICENSE_API_BASE to your deployed website URL.
// =============================================================================

(function () {
  "use strict";

  // ==========================================================================
  //  CONFIG
  // ==========================================================================
  // Your deployed website. The extension validates keys against this origin.
  var LICENSE_API_BASE = "https://extension-analysis.vercel.app";

  // Allow a runtime override without rebuilding (e.g. for testing a preview):
  //   chrome.storage.local.set({ li_api_base: "https://my-preview.vercel.app" })
  var VALIDATE_PATH = "/api/licenses/validate";
  var TRACK_PATH    = "/api/licenses/track-usage";
  var SHOP_PATH     = "/shop";

  var STORAGE_KEY_LICENSE_KEY = "li_license_key";     // the raw key the user entered
  var STORAGE_KEY_CACHE       = "li_validation_cache"; // last validation result + timestamp
  var STORAGE_KEY_FINGERPRINT = "li_hw_fingerprint";
  var STORAGE_KEY_API_BASE    = "li_api_base";

  var REVALIDATE_INTERVAL_MS  = 60 * 60 * 1000;  // re-check with server every 1h
  var HEARTBEAT_INTERVAL_MS   = 5 * 60 * 1000;   // local expiry check every 5m

  try { console.log("[Lovable Infinity] local-activation BUILD TAG v6 (2026-07-08) online-validation"); } catch (e) {}

  // The license gate UI must ONLY render inside the extension's own pages
  // (side panel / popup), never injected on top of the lovable.dev website
  // where this same file is also loaded as a content script.
  var IS_EXTENSION_PAGE = false;
  try {
    IS_EXTENSION_PAGE = typeof location !== "undefined" && location.protocol === "chrome-extension:";
  } catch (e) { IS_EXTENSION_PAGE = false; }
  var IS_PANEL = IS_EXTENSION_PAGE;

  // ==========================================================================
  //  SMALL PROMISE HELPERS AROUND chrome.storage.local
  // ==========================================================================
  function storageGet(keys) {
    return new Promise(function (resolve) {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(keys, function (res) { resolve(res || {}); });
        } else { resolve({}); }
      } catch (e) { resolve({}); }
    });
  }
  function storageSet(obj) {
    return new Promise(function (resolve) {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(obj, function () { resolve(); });
        } else { resolve(); }
      } catch (e) { resolve(); }
    });
  }
  function storageRemove(keys) {
    return new Promise(function (resolve) {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove(keys, function () { resolve(); });
        } else { resolve(); }
      } catch (e) { resolve(); }
    });
  }

  // ==========================================================================
  //  HARDWARE FINGERPRINT  (stable per device, same algorithm as the
  //  bundled lovable-license-validator.js so seats stay consistent)
  // ==========================================================================
  function computeFingerprint() {
    try {
      var data = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory || "unknown",
        timezone: (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : "unknown",
        screen: (typeof screen !== "undefined") ? (screen.width + "x" + screen.height + "x" + screen.colorDepth) : "unknown",
      };
      var str = JSON.stringify(data);
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
        var ch = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash = hash & hash;
      }
      return "HWID-" + Math.abs(hash).toString(16).toUpperCase();
    } catch (e) {
      return "HWID-FALLBACK";
    }
  }

  function getFingerprint() {
    return storageGet(STORAGE_KEY_FINGERPRINT).then(function (res) {
      var existing = res[STORAGE_KEY_FINGERPRINT];
      if (existing) return existing;
      var fp = computeFingerprint();
      return storageSet((function () { var o = {}; o[STORAGE_KEY_FINGERPRINT] = fp; return o; })()).then(function () { return fp; });
    });
  }

  function getApiBase() {
    return storageGet(STORAGE_KEY_API_BASE).then(function (res) {
      var override = (res[STORAGE_KEY_API_BASE] || "").trim();
      var base = override || LICENSE_API_BASE;
      return base.replace(/\/+$/, "");
    });
  }

  // ==========================================================================
  //  CORE: call the website to validate a key
  //  Returns { valid, license, message, error, daysRemaining, expiresAt, planName }
  // ==========================================================================
  function validateOnline(licenseKey) {
    var key = String(licenseKey || "").trim();
    if (!key) return Promise.resolve({ valid: false, message: "License key is required", error: "NO_KEY" });

    return Promise.all([getApiBase(), getFingerprint()]).then(function (arr) {
      var base = arr[0];
      var fp = arr[1];
      return fetch(base + VALIDATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: key, hardwareFingerprint: fp }),
      }).then(function (resp) {
        return resp.json().then(function (data) { return { status: resp.status, data: data }; })
          .catch(function () { return { status: resp.status, data: {} }; });
      }).then(function (r) {
        var data = r.data || {};
        if (data.valid) {
          return {
            valid: true,
            message: data.message || "License is valid",
            license: data.license || null,
            planName: data.planName || (data.license && data.license.tier && data.license.tier.displayName) || "Pro",
            expiresAt: data.expiresAt || (data.license && data.license.expiresAt) || null,
            daysRemaining: (typeof data.daysRemaining === "number") ? data.daysRemaining
                            : (data.license && typeof data.license.daysRemaining === "number" ? data.license.daysRemaining : null),
            maxSeats: data.maxSeats || (data.license && data.license.tier && data.license.tier.maxSeats) || 1,
            seatsUsed: data.seatsUsed || (data.license && data.license.seatsUsed) || 1,
          };
        }
        return {
          valid: false,
          message: data.message || "License validation failed",
          error: data.error || ("HTTP_" + r.status),
          expiresAt: data.expiresAt || null,
        };
      });
    }).catch(function (err) {
      // Network failure — do NOT unlock. Surface a clear message.
      return { valid: false, message: "Could not reach license server. Check your connection.", error: "NETWORK", networkError: true };
    });
  }

  // ==========================================================================
  //  Map a successful validation to the ql_* storage the UI reads.
  //  Duration-based: we expose expiry + days remaining, NOT credits.
  //  plan_type "unlimited" makes the native Account panel render a clean
  //  "unlimited usage for the active period" state instead of a credit gauge.
  // ==========================================================================
  function buildLicenseObject(key, result) {
    var nowIso = new Date().toISOString();
    var expiresAt = result.expiresAt || null;
    var days = (typeof result.daysRemaining === "number") ? result.daysRemaining : null;
    var planName = result.planName || "Pro";
    return {
      valid: true,
      status: "active",
      plan_name: planName,
      plan_type: "unlimited",          // duration-based, no credit gauge
      is_lifetime: false,
      unlimited: true,
      expires_at: expiresAt,
      days_remaining: days,
      activated_at: nowIso,
      checked_at: nowIso,
      user_name: planName + " Member",
      source: "online",
      // Explicitly null so no credit UI renders:
      credits_total: null,
      credits_used: null,
      credits_remaining: null,
      max_devices: result.maxSeats || 1,
      seats_used: result.seatsUsed || 1,
      buckets: [],
    };
  }

  function buildStorageSeed(key, licenseObj) {
    return {
      ql_license_valid: true,
      ql_license_status: "active",
      ql_license_key: key,
      ql_license_data: licenseObj,
      ql_user_name: licenseObj.user_name,
      ql_expires_at: licenseObj.expires_at,
      ql_activated_at: licenseObj.activated_at,
      ql_session_id: "online-" + Date.now(),
      license_key: key,
      plan: {
        plan_name: licenseObj.plan_name,
        plan_type: "unlimited",
        expires_at: licenseObj.expires_at,
        days_remaining: licenseObj.days_remaining,
        reset_at: null,
        max_devices: licenseObj.max_devices,
        is_trial: false,
        source: "online",
        buckets: [],
        checked_at: licenseObj.checked_at,
        // no credits
        credits_remaining: null,
        credits_total: null,
      },
      lovable_license_data: { valid: true, license: licenseObj },
    };
  }

  function persistValidation(key, result) {
    var licenseObj = buildLicenseObject(key, result);
    var seed = buildStorageSeed(key, licenseObj);
    var cache = {};
    cache[STORAGE_KEY_LICENSE_KEY] = key;
    cache[STORAGE_KEY_CACHE] = {
      validatedAt: new Date().toISOString(),
      expiresAt: result.expiresAt || null,
      daysRemaining: result.daysRemaining,
      planName: result.planName,
      license: result.license || null,
    };
    var merged = Object.assign({}, seed, cache);
    return storageSet(merged).then(function () { return licenseObj; });
  }

  function clearValidation() {
    return storageRemove([
      "ql_license_valid", "ql_license_status", "ql_license_key", "ql_license_data",
      "ql_user_name", "ql_expires_at", "ql_activated_at", "ql_session_id",
      "license_key", "plan", "lovable_license_data",
      STORAGE_KEY_CACHE,
    ]);
  }

  function isExpired(expiresAt) {
    if (!expiresAt) return false; // if server didn't send expiry, rely on server verdict
    var t = Date.parse(expiresAt);
    if (isNaN(t)) return false;
    return Date.now() > t;
  }

  // ==========================================================================
  //  LICENSE GATE OVERLAY  (only rendered inside the side panel / popup)
  // ==========================================================================
  var GATE_ID = "li-license-gate";

  function removeGate() {
    try {
      var el = document.getElementById(GATE_ID);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    } catch (e) {}
  }

  function showGate(opts) {
    if (!IS_PANEL) return;
    opts = opts || {};
    var doInject = function () {
      removeGate();
      getApiBase().then(function (base) {
        var shopUrl = base + SHOP_PATH;
        var wrap = document.createElement("div");
        wrap.id = GATE_ID;
        wrap.innerHTML = [
          '<div class="li-gate-backdrop">',
          '  <div class="li-gate-card">',
          '    <div class="li-gate-logo">Lovable <span>Infinity</span></div>',
          '    <h1 class="li-gate-title">Activate your license</h1>',
          '    <p class="li-gate-sub">Enter the license key from your account to unlock the extension.</p>',
          '    <input id="li-gate-input" class="li-gate-input" type="text" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX" />',
          '    <div id="li-gate-msg" class="li-gate-msg"></div>',
          '    <button id="li-gate-submit" class="li-gate-btn">Activate</button>',
          '    <a id="li-gate-buy" class="li-gate-link" href="' + shopUrl + '" target="_blank" rel="noopener">Don\'t have a key? Buy a plan &rarr;</a>',
          '    <div class="li-gate-foot">Plans are duration-based. Access unlocks instantly and expires automatically when your plan ends.</div>',
          '  </div>',
          '</div>'
        ].join("");
        injectGateStyles();
        (document.body || document.documentElement).appendChild(wrap);

        var input = document.getElementById("li-gate-input");
        var btn = document.getElementById("li-gate-submit");
        var msg = document.getElementById("li-gate-msg");

        if (opts.message) { msg.textContent = opts.message; msg.className = "li-gate-msg li-gate-msg-error"; }
        if (opts.prefill && input) input.value = opts.prefill;
        if (input) setTimeout(function () { try { input.focus(); } catch (e) {} }, 50);

        function setBusy(busy) {
          if (!btn) return;
          btn.disabled = busy;
          btn.textContent = busy ? "Validating…" : "Activate";
        }
        function submit() {
          var key = (input && input.value || "").trim();
          if (!key) { msg.textContent = "Please enter your license key."; msg.className = "li-gate-msg li-gate-msg-error"; return; }
          setBusy(true);
          msg.textContent = ""; msg.className = "li-gate-msg";
          validateOnline(key).then(function (result) {
            if (result.valid) {
              return persistValidation(key, result).then(function () {
                msg.textContent = "Activated! Loading…";
                msg.className = "li-gate-msg li-gate-msg-ok";
                setTimeout(function () { try { location.reload(); } catch (e) { removeGate(); } }, 500);
              });
            } else {
              setBusy(false);
              msg.textContent = result.message || "Invalid license key.";
              msg.className = "li-gate-msg li-gate-msg-error";
            }
          });
        }
        if (btn) btn.addEventListener("click", submit);
        if (input) input.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && !e.nativeEvent?.isComposing && e.keyCode !== 229) submit();
        });
      });
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", doInject);
    } else {
      doInject();
    }
  }

  function injectGateStyles() {
    if (document.getElementById("li-gate-styles")) return;
    var css = ""
      + "#" + GATE_ID + " .li-gate-backdrop{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;"
      + "background:radial-gradient(120% 120% at 50% 0%,#141326 0%,#0a0a12 60%,#07070c 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
      + "#" + GATE_ID + " .li-gate-card{width:100%;max-width:360px;background:rgba(23,22,38,.92);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:28px 24px;box-shadow:0 24px 60px rgba(0,0,0,.55);backdrop-filter:blur(12px);text-align:center;}"
      + "#" + GATE_ID + " .li-gate-logo{font-size:15px;font-weight:600;letter-spacing:.02em;color:#cdd0e4;margin-bottom:18px;}"
      + "#" + GATE_ID + " .li-gate-logo span{color:#8b7bfb;}"
      + "#" + GATE_ID + " .li-gate-title{font-size:20px;font-weight:700;color:#f5f6ff;margin:0 0 6px;}"
      + "#" + GATE_ID + " .li-gate-sub{font-size:13px;line-height:1.5;color:#9a9cb5;margin:0 0 18px;}"
      + "#" + GATE_ID + " .li-gate-input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(12,12,20,.85);color:#f5f6ff;font-size:14px;letter-spacing:.06em;text-align:center;outline:none;transition:border-color .15s,box-shadow .15s;}"
      + "#" + GATE_ID + " .li-gate-input:focus{border-color:#8b7bfb;box-shadow:0 0 0 3px rgba(139,123,251,.25);}"
      + "#" + GATE_ID + " .li-gate-input::placeholder{color:#5c5e77;letter-spacing:.12em;}"
      + "#" + GATE_ID + " .li-gate-msg{min-height:16px;font-size:12px;margin:10px 0 4px;}"
      + "#" + GATE_ID + " .li-gate-msg-error{color:#ff8a8a;}"
      + "#" + GATE_ID + " .li-gate-msg-ok{color:#7ee2b8;}"
      + "#" + GATE_ID + " .li-gate-btn{width:100%;padding:12px 14px;border:0;border-radius:11px;background:linear-gradient(135deg,#8b7bfb,#6d5ef0);color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:transform .12s,opacity .12s;}"
      + "#" + GATE_ID + " .li-gate-btn:hover{transform:translateY(-1px);}"
      + "#" + GATE_ID + " .li-gate-btn:disabled{opacity:.6;cursor:default;transform:none;}"
      + "#" + GATE_ID + " .li-gate-link{display:inline-block;margin-top:16px;font-size:13px;color:#9b8dfd;text-decoration:none;}"
      + "#" + GATE_ID + " .li-gate-link:hover{text-decoration:underline;}"
      + "#" + GATE_ID + " .li-gate-foot{margin-top:18px;font-size:11px;line-height:1.5;color:#6b6d85;}";
    var style = document.createElement("style");
    style.id = "li-gate-styles";
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  // ==========================================================================
  //  STARTUP DECISION
  // ==========================================================================
  function boot() {
    return storageGet([STORAGE_KEY_LICENSE_KEY, STORAGE_KEY_CACHE]).then(function (res) {
      var key = res[STORAGE_KEY_LICENSE_KEY];
      var cache = res[STORAGE_KEY_CACHE];

      if (!key) {
        // No license at all → gate.
        return clearValidation().then(function () { showGate({}); });
      }

      // If we have a fresh, non-expired cache, unlock immediately, then
      // silently revalidate in the background.
      if (cache && cache.validatedAt) {
        var age = Date.now() - Date.parse(cache.validatedAt);
        var expired = isExpired(cache.expiresAt);
        if (!expired && age < REVALIDATE_INTERVAL_MS) {
          // Reseed ql_* from cache so the UI is populated this session.
          return persistValidation(key, {
            valid: true,
            expiresAt: cache.expiresAt,
            daysRemaining: cache.daysRemaining,
            planName: cache.planName,
            license: cache.license,
          }).then(function () { backgroundRevalidate(key); });
        }
      }

      // Otherwise do a real online check now.
      return validateOnline(key).then(function (result) {
        if (result.valid) {
          return persistValidation(key, result);
        }
        if (result.networkError && cache && !isExpired(cache.expiresAt)) {
          // Offline but cache still within its paid period → allow this session.
          return persistValidation(key, {
            valid: true, expiresAt: cache.expiresAt, daysRemaining: cache.daysRemaining,
            planName: cache.planName, license: cache.license,
          });
        }
        // Invalid or expired → lock out.
        return clearValidation().then(function () {
          showGate({ prefill: key, message: result.message || "Your license is no longer valid." });
        });
      });
    });
  }

  function backgroundRevalidate(key) {
    validateOnline(key).then(function (result) {
      if (result.valid) {
        persistValidation(key, result);
      } else if (!result.networkError) {
        clearValidation().then(function () {
          showGate({ prefill: key, message: result.message || "Your license has expired." });
        });
      }
    });
  }

  // Periodic heartbeat: re-check expiry locally + revalidate with server.
  function startHeartbeat() {
    if (!IS_PANEL) return;
    setInterval(function () {
      storageGet([STORAGE_KEY_LICENSE_KEY, STORAGE_KEY_CACHE]).then(function (res) {
        var key = res[STORAGE_KEY_LICENSE_KEY];
        var cache = res[STORAGE_KEY_CACHE];
        if (!key) return;
        if (cache && isExpired(cache.expiresAt)) {
          clearValidation().then(function () {
            showGate({ prefill: key, message: "Your plan has expired. Renew to continue." });
          });
        }
      });
    }, HEARTBEAT_INTERVAL_MS);

    setInterval(function () {
      storageGet(STORAGE_KEY_LICENSE_KEY).then(function (res) {
        if (res[STORAGE_KEY_LICENSE_KEY]) backgroundRevalidate(res[STORAGE_KEY_LICENSE_KEY]);
      });
    }, REVALIDATE_INTERVAL_MS);
  }

  // ==========================================================================
  //  pkLicenseV2 — real implementations the obfuscated UI calls.
  //  These now hit the website instead of returning a fake lifetime license.
  // ==========================================================================
  function currentLicensePromise() {
    return storageGet([STORAGE_KEY_LICENSE_KEY, STORAGE_KEY_CACHE, "ql_license_data"]).then(function (res) {
      var key = res[STORAGE_KEY_LICENSE_KEY];
      if (!key) return null;
      if (res[STORAGE_KEY_CACHE] && isExpired(res[STORAGE_KEY_CACHE].expiresAt)) return null;
      return res.ql_license_data || null;
    });
  }

  var pkLicenseV2 = {
    getOrCreateSession: function () { return currentLicensePromise(); },
    getOrCreate: function () { return currentLicensePromise(); },
    getOrCreateSessionId: function () { return currentLicensePromise(); },

    validateLicenseKey: function (key) {
      return validateOnline(key).then(function (result) {
        if (result.valid) return persistValidation(key, result);
        return Promise.reject(new Error(result.message || "Invalid license"));
      });
    },
    validateLicense: function (key) {
      return validateOnline(key).then(function (result) {
        if (result.valid) return persistValidation(key, result);
        return Promise.reject(new Error(result.message || "Invalid license"));
      });
    },
    validateLicensKey: function (key) { return this.validateLicense(key); },

    heartbeat: function () {
      return storageGet(STORAGE_KEY_LICENSE_KEY).then(function (res) {
        var key = res[STORAGE_KEY_LICENSE_KEY];
        if (!key) return null;
        return validateOnline(key).then(function (result) {
          if (result.valid) return persistValidation(key, result);
          return clearValidation().then(function () { return null; });
        });
      });
    },

    getStatus: function () { return currentLicensePromise(); },
    getLicense: function () { return null; }, // async only; use getStatus
    isValid: function () { return currentLicensePromise().then(function (l) { return !!l; }); },
    validateLicenseKeyWithDevice: function (key) { return this.validateLicense(key); },
  };

  // ---- Standalone helpers the obfuscated code may reference -----------------
  function pkEnsureActiveLicense() {
    return currentLicensePromise().then(function (l) {
      return { allowed: !!l, license: l };
    });
  }
  function pkRevokeLicenseStorage() { return clearValidation(); }
  function validateLicenseStandalone(key) { return pkLicenseV2.validateLicense(key); }
  function setPkCreditBypass() { return false; } // no credit system
  function pkSanitizeServerError(msg) { return String(msg || ""); }
  function pkInvalidateAssertCache() {}
  function pkShouldLockoutFromValidation(response) {
    // Lock out when the server says the license is not valid.
    var valid = response && (response.valid === true || (response.body && response.body.valid === true));
    return { lock: !valid, conflictCount: 0, message: valid ? "" : "License invalid", reason: valid ? "" : "invalid" };
  }
  function pkResolveFeatureBgFetch(bgResponse) {
    if (!bgResponse) return { ok: true, body: {} };
    return { ok: true, body: bgResponse.body || bgResponse || {} };
  }
  function pkFeatureRequestBody(licenseKey, token, projectId) {
    return { license_key: licenseKey || "", token_lovable: token || "", project_id: projectId || "" };
  }

  // ==========================================================================
  //  EXPOSE ON GLOBAL SCOPES
  // ==========================================================================
  var scopes = [];
  try { if (typeof window !== "undefined") scopes.push(window); } catch (e) {}
  try { if (typeof self !== "undefined" && self !== (typeof window !== "undefined" ? window : null)) scopes.push(self); } catch (e) {}
  try { if (typeof globalThis !== "undefined" && scopes.indexOf(globalThis) === -1) scopes.push(globalThis); } catch (e) {}

  for (var i = 0; i < scopes.length; i++) {
    var g = scopes[i];
    g.pkLicenseV2 = pkLicenseV2;
    g.pkEnsureActiveLicense = pkEnsureActiveLicense;
    g.pkRevokeLicenseStorage = pkRevokeLicenseStorage;
    g.validateLicense = validateLicenseStandalone;
    g.setPkCreditBypass = setPkCreditBypass;
    g.pkSanitizeServerError = pkSanitizeServerError;
    g.pkInvalidateAssertCache = pkInvalidateAssertCache;
    g.pkShouldLockoutFromValidation = pkShouldLockoutFromValidation;
    g.pkResolveFeatureBgFetch = pkResolveFeatureBgFetch;
    g.pkFeatureRequestBody = pkFeatureRequestBody;
    // NOT internal mode — we want the real remote flow to run.
    g.INTERNAL_LICENSE_MODE = false;
    // helpers other scripts may call
    g.liValidateOnline = validateOnline;
    g.liShowLicenseGate = showGate;
  }

  // ==========================================================================
  //  DOM SAFETY: hide any stray legacy credit gauge (e.g. "999,999,999")
  //  in case an older cached template renders one. Duration plans have no
  //  credits, so we suppress any giant credit number if it ever appears.
  // ==========================================================================
  function scrubLegacyCredits() {
    if (!IS_PANEL) return;
    try {
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var node, hits = [];
      while ((node = walker.nextNode())) {
        if (/9[\d,]{6,}/.test(node.nodeValue || "")) hits.push(node);
      }
      hits.forEach(function (n) {
        n.nodeValue = (n.nodeValue || "").replace(/9[\d,]{6,}\s*(credits?)?/gi, "Unlimited");
      });
    } catch (e) {}
  }

  // ==========================================================================
  //  RUN
  // ==========================================================================
  if (IS_PANEL) {
    boot().then(function () {
      startHeartbeat();
      // Run a scrub shortly after render and observe for late renders.
      setTimeout(scrubLegacyCredits, 800);
      setTimeout(scrubLegacyCredits, 2500);
      try {
        var obs = new MutationObserver(function () { scrubLegacyCredits(); });
        if (document.body) obs.observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
    });
  } else {
    // background / service-worker context: just expose the validators.
  }

})();
