/**
 * Lovable Infinity - Prompt Tracker
 * ---------------------------------
 * Captures every prompt the user submits on lovable.dev and reports it to the
 * license server so it powers the user's usage dashboard and gives the admin
 * full visibility (including tamper / crack-attempt detection).
 *
 * Reads the same storage keys that local-activation.js writes:
 *   li_license_key    - the raw license key the user activated with
 *   li_hw_fingerprint - the device fingerprint
 *   li_api_base       - optional API base override (defaults to the prod site)
 */
;(function () {
  'use strict'

  var DEFAULT_API_BASE = 'https://extension-analysis.vercel.app'
  var STORAGE_KEY_LICENSE_KEY = 'li_license_key'
  var STORAGE_KEY_FINGERPRINT = 'li_hw_fingerprint'
  var STORAGE_KEY_API_BASE = 'li_api_base'

  // De-dupe guard so Enter + send-button click don't double-count one prompt.
  var lastPrompt = ''
  var lastSentAt = 0

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

  function getApiBase(res) {
    var override = (res[STORAGE_KEY_API_BASE] || '').trim()
    return override || DEFAULT_API_BASE
  }

  // Pull readable text out of a textarea / input / contenteditable editor.
  function readEditorText(el) {
    if (!el) return ''
    var tag = (el.tagName || '').toLowerCase()
    if (tag === 'textarea' || tag === 'input') return (el.value || '').trim()
    if (el.isContentEditable) return (el.innerText || el.textContent || '').trim()
    return ''
  }

  // Find the most likely prompt editor on the page.
  function findPromptText(fromEl) {
    // 1) If the event came from an editor, use it directly.
    var direct = readEditorText(fromEl)
    if (direct) return direct

    // 2) Otherwise look for the focused element.
    var active = document.activeElement
    var focused = readEditorText(active)
    if (focused) return focused

    // 3) Fall back to the largest visible textarea / contenteditable.
    var candidates = Array.prototype.slice.call(
      document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable=""]')
    )
    var best = ''
    for (var i = 0; i < candidates.length; i++) {
      var t = readEditorText(candidates[i])
      if (t.length > best.length) best = t
    }
    return best
  }

  function reportPrompt(promptText) {
    var text = (promptText || '').trim()
    if (!text) return

    var now = Date.now()
    // Ignore an identical prompt fired again within 2s (Enter + click).
    if (text === lastPrompt && now - lastSentAt < 2000) return
    lastPrompt = text
    lastSentAt = now

    storageGet([STORAGE_KEY_LICENSE_KEY, STORAGE_KEY_FINGERPRINT, STORAGE_KEY_API_BASE]).then(
      function (res) {
        var licenseKey = res[STORAGE_KEY_LICENSE_KEY]
        var fingerprint = res[STORAGE_KEY_FINGERPRINT]
        if (!licenseKey || !fingerprint) return // not activated - nothing to report

        var apiBase = getApiBase(res)
        var payload = {
          licenseKey: licenseKey,
          hardwareFingerprint: fingerprint,
          promptText: text,
          pageUrl: location.href,
          projectId: extractProjectId(location.href),
        }

        try {
          fetch(apiBase + '/api/licenses/report-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(function () {})
        } catch (e) {
          /* best-effort, never block the user */
        }
      }
    )
  }

  // lovable.dev project URLs look like /projects/<id> or /<id>
  function extractProjectId(url) {
    try {
      var m = url.match(/projects\/([a-zA-Z0-9_-]+)/)
      if (m) return m[1]
      var u = new URL(url)
      var parts = u.pathname.split('/').filter(Boolean)
      return parts.length ? parts[parts.length - 1] : ''
    } catch (e) {
      return ''
    }
  }

  // --- Capture on Enter (without Shift) inside an editor ---
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key !== 'Enter' || e.shiftKey) return
      // Ignore IME composition (CJK) and Safari's 229 quirk.
      if (e.isComposing || e.keyCode === 229) return
      var text = findPromptText(e.target)
      if (text) reportPrompt(text)
    },
    true
  )

  // --- Capture on send-button click ---
  document.addEventListener(
    'click',
    function (e) {
      var el = e.target
      if (!el) return
      // Walk up a few levels to find a button-like element.
      var node = el
      var isButton = false
      for (var i = 0; i < 4 && node; i++) {
        var tag = (node.tagName || '').toLowerCase()
        var type = (node.getAttribute && node.getAttribute('type')) || ''
        var aria = (node.getAttribute && (node.getAttribute('aria-label') || '')) || ''
        if (
          tag === 'button' ||
          type === 'submit' ||
          /send|submit|generate|ask/i.test(aria)
        ) {
          isButton = true
          break
        }
        node = node.parentElement
      }
      if (!isButton) return
      // Read text BEFORE the editor clears.
      var text = findPromptText(null)
      if (text) reportPrompt(text)
    },
    true
  )

  console.log('[LovableInfinity] Prompt tracker active')
})()
