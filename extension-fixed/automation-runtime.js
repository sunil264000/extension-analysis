/*
 * ============================================================================
 *  Loveable Infinity - Automation Runtime  (the "puppet" executor)
 *  Modded bY Sk2
 * ============================================================================
 *
 *  This is the client half of the anti-piracy "brain server" protocol.
 *
 *  The extension does NOT know how to perform a feature. It only knows how to
 *  execute tiny declarative actions ({ action:"click", selector:"..." }). The
 *  actual SEQUENCE of actions - the valuable know-how - lives on the server and
 *  is handed out one encrypted step at a time, license-checked on every step.
 *
 *  Result: a cracked copy with all license checks stripped still gets NOTHING,
 *  because step 1 is refused by the server without a valid, device-bound,
 *  non-revoked license. You cannot delete a check that isn't on your machine.
 *
 *  IMPORTANT: this file contains no secret logic. If a cracker reads it, they
 *  only learn "it asks the server what to do" - which is the whole point.
 * ============================================================================
 */
;(function () {
  'use strict'

  var LICORE =
    (typeof window !== 'undefined' && window.LICORE) ||
    (typeof self !== 'undefined' && self.LICORE) ||
    (typeof globalThis !== 'undefined' && globalThis.LICORE) ||
    null

  var API_BASE = (LICORE && LICORE.API_BASE) || 'https://extension-analysis.vercel.app'
  var START_PATH = '/api/automation/start'
  var STEP_PATH = '/api/automation/step'
  var STORAGE_KEY_LICENSE_KEY = 'li_license_key'
  var STORAGE_KEY_FINGERPRINT = 'li_hw_fingerprint'

  var MAX_STEPS = 200 // safety ceiling so a bad flow can't loop forever

  // -------------------------------------------------------------------------
  //  storage + crypto helpers
  // -------------------------------------------------------------------------
  function storageGet(keys) {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(keys, function (res) {
          resolve(res || {})
        })
      } catch (e) {
        resolve({})
      }
    })
  }

  function b64ToBytes(b64) {
    var bin = atob(b64)
    var out = new Uint8Array(bin.length)
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }

  // Decrypt an AES-256-GCM packet of the form "ivB64.tagB64.ctB64" using the
  // session key handed back by /start. WebCrypto expects ct||tag concatenated.
  function decryptPacket(sessionKeyB64, packet) {
    var parts = String(packet || '').split('.')
    if (parts.length !== 3) return Promise.reject(new Error('BAD_PACKET'))
    var iv = b64ToBytes(parts[0])
    var tag = b64ToBytes(parts[1])
    var ct = b64ToBytes(parts[2])
    var combined = new Uint8Array(ct.length + tag.length)
    combined.set(ct, 0)
    combined.set(tag, ct.length)
    return crypto.subtle
      .importKey('raw', b64ToBytes(sessionKeyB64), { name: 'AES-GCM' }, false, ['decrypt'])
      .then(function (key) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, combined)
      })
      .then(function (buf) {
        return JSON.parse(new TextDecoder().decode(buf))
      })
  }

  // -------------------------------------------------------------------------
  //  the tiny declarative interpreter
  //  Each supported action is intentionally small + safe. NO eval, NO remote
  //  code - only these fixed primitives can ever run.
  // -------------------------------------------------------------------------
  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, Math.max(0, ms | 0)) })
  }

  function waitForSelector(selector, timeoutMs) {
    var deadline = Date.now() + (timeoutMs || 15000)
    return new Promise(function (resolve, reject) {
      ;(function poll() {
        var el = document.querySelector(selector)
        if (el) return resolve(el)
        if (Date.now() > deadline) return reject(new Error('WAIT_TIMEOUT:' + selector))
        setTimeout(poll, 200)
      })()
    })
  }

  // Executes one declarative action. Returns a value that may be fed back to
  // the server as context for the next step (e.g. a read value).
  function executeAction(act, ctx) {
    switch (act.action) {
      case 'click':
        return waitForSelector(act.selector, act.timeout).then(function (el) {
          el.click()
          return { clicked: true }
        })

      case 'type':
        return waitForSelector(act.selector, act.timeout).then(function (el) {
          var value = act.value
          if (act.fromCtx && ctx && ctx[act.fromCtx] != null) value = ctx[act.fromCtx]
          el.focus()
          var proto = el.tagName === 'TEXTAREA'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype
          var setter = Object.getOwnPropertyDescriptor(proto, 'value')
          if (setter && setter.set) setter.set.call(el, value)
          else el.value = value
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
          return { typed: true }
        })

      case 'waitFor':
        return waitForSelector(act.selector, act.timeout).then(function () {
          return { found: true }
        })

      case 'sleep':
        return sleep(act.ms || 500).then(function () { return { slept: true } })

      case 'readAttr':
        return waitForSelector(act.selector, act.timeout).then(function (el) {
          var v = act.attr === 'text' ? el.textContent : el.getAttribute(act.attr)
          var out = {}
          out[act.saveAs || 'value'] = v
          return out
        })

      case 'exists': {
        var found = !!document.querySelector(act.selector)
        var o = {}
        o[act.saveAs || 'exists'] = found
        return Promise.resolve(o)
      }

      case 'scrollTo':
        return waitForSelector(act.selector, act.timeout).then(function (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return { scrolled: true }
        })

      case 'dispatchKey':
        return waitForSelector(act.selector, act.timeout).then(function (el) {
          el.focus()
          var opts = { key: act.key, code: act.key, bubbles: true }
          el.dispatchEvent(new KeyboardEvent('keydown', opts))
          el.dispatchEvent(new KeyboardEvent('keyup', opts))
          return { keyed: true }
        })

      case 'toast':
        try { console.log('[LI]', act.message) } catch (e) {}
        return Promise.resolve({ noted: true })

      case 'done':
        return Promise.resolve({ done: true })

      default:
        // Unknown action - fail safe (do nothing, report to server on next step).
        return Promise.resolve({ skipped: act.action })
    }
  }

  // -------------------------------------------------------------------------
  //  the run loop: start a session, then fetch+decrypt+execute each step
  // -------------------------------------------------------------------------
  function runFlow(flowId, initialCtx) {
    var ctx = Object.assign({}, initialCtx || {})
    return storageGet([STORAGE_KEY_LICENSE_KEY, STORAGE_KEY_FINGERPRINT]).then(function (creds) {
      var licenseKey = creds[STORAGE_KEY_LICENSE_KEY]
      var fingerprint = creds[STORAGE_KEY_FINGERPRINT]
      if (!licenseKey || !fingerprint) {
        return { ok: false, reason: 'NOT_ACTIVATED' }
      }

      return fetch(API_BASE + START_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey, hardwareFingerprint: fingerprint, flowId: flowId }),
      })
        .then(function (r) { return r.json() })
        .then(function (s) {
          if (!s.ok) return { ok: false, reason: s.reason || 'START_DENIED', message: s.message }
          var sessionId = s.sessionId
          var sessionKey = s.sessionKey

          function nextStep(count) {
            if (count > MAX_STEPS) return { ok: false, reason: 'STEP_LIMIT' }
            return fetch(API_BASE + STEP_PATH, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: sessionId,
                licenseKey: licenseKey,
                hardwareFingerprint: fingerprint,
                ctx: ctx,
              }),
            })
              .then(function (r) { return r.json() })
              .then(function (j) {
                // Server refused mid-run (revoked / expired / wrong device / stale).
                if (!j.ok) return { ok: false, reason: j.reason || 'STEP_DENIED', message: j.message }
                return decryptPacket(sessionKey, j.packet).then(function (act) {
                  if (act.action === 'done' || j.done) return { ok: true, reason: 'DONE', ctx: ctx }
                  return executeAction(act, ctx).then(function (result) {
                    if (result && typeof result === 'object') ctx = Object.assign(ctx, result)
                    return nextStep(count + 1)
                  })
                })
              })
          }
          return nextStep(1)
        })
    }).catch(function (e) {
      return { ok: false, reason: 'RUNTIME_ERROR', message: String(e && e.message) }
    })
  }

  var PROMPT_PATH = '/api/automation/prompt'

  // Current server-authorized entitlements, published by local-activation.js
  // into window.__LI_ENT after each authorize. Read-only view for the UI.
  function getEntitlements() {
    var e =
      (typeof window !== 'undefined' && window.__LI_ENT) ||
      (typeof self !== 'undefined' && self.__LI_ENT) ||
      (typeof globalThis !== 'undefined' && globalThis.__LI_ENT) ||
      null
    return e && e.ok ? e : { ok: false, features: [] }
  }

  // Is this feature allowed for the current license? Used to enable/disable or
  // hide UI buttons without trusting the client — the server still re-checks on
  // every prompt/flow request, so this is only a UX convenience.
  function isEntitled(featureId) {
    var e = getEntitlements()
    return !!(e.ok && e.features && e.features.indexOf(featureId) !== -1)
  }

  // Fetch a license-gated prompt for one of the quick-action buttons. The prompt
  // text lives ONLY on the server and is returned only to a valid, device-bound,
  // entitled license. Resolves { ok, prompt } or { ok:false, reason }.
  function getPrompt(featureId) {
    return storageGet([STORAGE_KEY_LICENSE_KEY, STORAGE_KEY_FINGERPRINT]).then(function (res) {
      var key = res[STORAGE_KEY_LICENSE_KEY]
      var fp = res[STORAGE_KEY_FINGERPRINT]
      if (!key || !fp) return { ok: false, reason: 'NOT_ACTIVATED' }
      return fetch(API_BASE + PROMPT_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key, hardwareFingerprint: fp, featureId: featureId }),
      })
        .then(function (r) { return r.json() })
        .then(function (j) {
          if (!j || !j.ok) return { ok: false, reason: (j && j.reason) || 'DENIED' }
          return { ok: true, featureId: j.featureId, label: j.label, prompt: j.prompt }
        })
        .catch(function () { return { ok: false, reason: 'NETWORK' } })
    })
  }

  // Public surface used by the extension UI / content bridge.
  var RUNTIME = {
    runFlow: runFlow,
    executeAction: executeAction, // exposed for isolated testing only
    getEntitlements: getEntitlements,
    isEntitled: isEntitled,
    getPrompt: getPrompt,
  }
  if (typeof window !== 'undefined') window.LIRuntime = RUNTIME
  if (typeof self !== 'undefined') self.LIRuntime = RUNTIME
  if (typeof globalThis !== 'undefined') globalThis.LIRuntime = RUNTIME
})()
