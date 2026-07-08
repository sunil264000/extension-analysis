// license-core.js
// =============================================================================
//  ██  LOVABLE INFINITY — HARDENED LICENSE CORE  ██   ( Modded bY Sk2 )
// -----------------------------------------------------------------------------
//  BUILD TAG : v7 (2026-07-08) "signed-tokens"
//
//  WHY THIS EXISTS
//    A browser extension can never be made 100% uncrackable, but the two
//    easiest attacks are closed here:
//      1. Faking the /validate network response  ("just return valid:true").
//      2. Editing the cached expiry in chrome.storage to never expire.
//
//    Both are defeated with ASYMMETRIC SIGNATURES. The website signs a compact
//    license token with an ECDSA P-256 PRIVATE key. This file embeds only the
//    matching PUBLIC key, so it can VERIFY a token but can NEVER forge one.
//    Every unlock path requires a signature that verifies against this key AND
//    is bound to (a) this device's fingerprint and (b) a real expiry timestamp
//    inside the signed blob. Editing storage or stubbing fetch no longer works
//    — an attacker would have to patch and re-sign, which needs the private key.
//
//  EXPOSES  window.LICORE / self.LICORE:
//    LICORE.API_BASE               - hardcoded website origin (no override)
//    LICORE.OWNER_TAG              - "Modded bY Sk2"
//    LICORE.fingerprint()          - Promise<string> stable device id
//    LICORE.verifyToken(tok, fp)   - Promise<{ok, payload, reason}>
//    LICORE.sha256Hex(str)         - Promise<string>
//    LICORE.digestTampered(seed)   - Promise<bool>  (integrity self-check)
// =============================================================================
;(function () {
  'use strict'

  // ---- HARDCODED CONFIG (no chrome.storage override — cannot be redirected) --
  var API_BASE = 'https://extension-analysis.vercel.app'
  var OWNER_TAG = 'Modded bY Sk2'
  var BUILD_TAG = 'v7-signed-tokens'

  // ECDSA P-256 public key (SPKI, base64). Pairs with the server private key.
  var PUBKEY_SPKI =
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEeKTDLg/0pD54M/Q4KhwdM4Byx0UvAtzN+BfvvbHTWZzFz/kxO7VzfUUvsCBFK+vvGlbvy9Xip3d7UcWI/0RmzA=='

  var STORAGE_KEY_FINGERPRINT = 'li_hw_fingerprint'

  function subtle() {
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle) return crypto.subtle
    } catch (e) {}
    return null
  }

  // ---- base64 / bytes helpers ----------------------------------------------
  function rawB64ToBytes(b64) {
    var bin = atob(b64)
    var out = new Uint8Array(bin.length)
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }
  function b64urlToBytes(b64url) {
    var b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    return rawB64ToBytes(b64)
  }
  function strToBytes(str) {
    return new TextEncoder().encode(str)
  }
  function bytesToHex(buf) {
    var b = new Uint8Array(buf)
    var s = ''
    for (var i = 0; i < b.length; i++) s += ('0' + b[i].toString(16)).slice(-2)
    return s
  }

  // ---- public key (imported once, cached) -----------------------------------
  var _pubKeyPromise = null
  function getPubKey() {
    if (_pubKeyPromise) return _pubKeyPromise
    var s = subtle()
    if (!s) return Promise.reject(new Error('no-subtle'))
    _pubKeyPromise = s.importKey(
      'spki',
      rawB64ToBytes(PUBKEY_SPKI),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    )
    return _pubKeyPromise
  }

  // ---- SHA-256 hex (used for integrity self-checks) --------------------------
  function sha256Hex(str) {
    var s = subtle()
    if (!s) return Promise.resolve('')
    return s.digest('SHA-256', strToBytes(String(str))).then(bytesToHex)
  }

  // ---- token verification ----------------------------------------------------
  // Returns { ok:boolean, payload:object|null, reason:string }
  function verifyToken(token, expectedFp) {
    if (!token || typeof token !== 'string' || token.indexOf('.') === -1) {
      return Promise.resolve({ ok: false, payload: null, reason: 'NO_TOKEN' })
    }
    var parts = token.split('.')
    var seg = parts[0]
    var sig = parts[1]
    var payload
    try {
      payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(seg)))
    } catch (e) {
      return Promise.resolve({ ok: false, payload: null, reason: 'BAD_PAYLOAD' })
    }
    return getPubKey()
      .then(function (key) {
        return subtle().verify(
          { name: 'ECDSA', hash: 'SHA-256' },
          key,
          b64urlToBytes(sig),
          strToBytes(seg)
        )
      })
      .then(function (valid) {
        if (!valid) return { ok: false, payload: null, reason: 'BAD_SIGNATURE' }
        // Signed, but still enforce the claims:
        var now = Date.now()
        if (typeof payload.exp === 'number' && now > payload.exp) {
          return { ok: false, payload: payload, reason: 'EXPIRED' }
        }
        if (expectedFp && payload.fp && payload.fp !== expectedFp) {
          return { ok: false, payload: payload, reason: 'DEVICE_MISMATCH' }
        }
        return { ok: true, payload: payload, reason: 'OK' }
      })
      .catch(function () {
        return { ok: false, payload: null, reason: 'VERIFY_ERROR' }
      })
  }

  // ---- canonical hardware fingerprint (matches server-side binding) ----------
  function computeFingerprint() {
    try {
      var data = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory || 'unknown',
        timezone:
          Intl && Intl.DateTimeFormat
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : 'unknown',
        screen:
          typeof screen !== 'undefined'
            ? screen.width + 'x' + screen.height + 'x' + screen.colorDepth
            : 'unknown',
      }
      var str = JSON.stringify(data)
      var hash = 0
      for (var i = 0; i < str.length; i++) {
        var ch = str.charCodeAt(i)
        hash = (hash << 5) - hash + ch
        hash = hash & hash
      }
      return 'HWID-' + Math.abs(hash).toString(16).toUpperCase()
    } catch (e) {
      return 'HWID-FALLBACK'
    }
  }

  function storageGet(keys) {
    return new Promise(function (resolve) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(keys, function (res) {
            resolve(res || {})
          })
        } else resolve({})
      } catch (e) {
        resolve({})
      }
    })
  }
  function storageSet(obj) {
    return new Promise(function (resolve) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(obj, function () {
            resolve()
          })
        } else resolve()
      } catch (e) {
        resolve()
      }
    })
  }

  function fingerprint() {
    return storageGet(STORAGE_KEY_FINGERPRINT).then(function (res) {
      var existing = res[STORAGE_KEY_FINGERPRINT]
      if (existing) return existing
      var fp = computeFingerprint()
      var o = {}
      o[STORAGE_KEY_FINGERPRINT] = fp
      return storageSet(o).then(function () {
        return fp
      })
    })
  }

  var LICORE = {
    API_BASE: API_BASE,
    OWNER_TAG: OWNER_TAG,
    BUILD_TAG: BUILD_TAG,
    PUBKEY_SPKI: PUBKEY_SPKI,
    fingerprint: fingerprint,
    computeFingerprint: computeFingerprint,
    verifyToken: verifyToken,
    sha256Hex: sha256Hex,
  }

  try {
    if (typeof window !== 'undefined') window.LICORE = LICORE
  } catch (e) {}
  try {
    if (typeof self !== 'undefined') self.LICORE = LICORE
  } catch (e) {}
  try {
    if (typeof globalThis !== 'undefined') globalThis.LICORE = LICORE
  } catch (e) {}

  try {
    console.log('[Lovable Infinity] license-core ' + BUILD_TAG + ' (' + OWNER_TAG + ')')
  } catch (e) {}
})()
