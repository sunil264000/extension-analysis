# Extension Anti-Piracy Plan — "Hands Local, Brain Server, Checked Every Step"

Final security design for the Loveable Infinity extension (Modded bY Sk2).
Runs entirely on the existing **free Vercel + Neon** setup. No new cost.

> STATUS: IMPLEMENTED (v6.7.0). The step-protocol brain server is live.
> - Server: `app/api/automation/start` + `app/api/automation/step` (license-checked
>   per step, AES-256-GCM encrypted packets, rate-limited, session + device bound).
> - Brain (secret logic): `lib/automation/flows.ts` + `instruction-set.ts` (server-only).
> - Extension puppet: `extension-fixed/automation-runtime.js` (obfuscated; contains
>   NO secret logic — only "ask the server what to do next").
> - Tables: `automation_sessions`, `automation_events`.
> - Tamper attestation now also requires `automation-runtime.js` to be present.
>
> To wire a real feature: call `LIRuntime.runFlow('<flowId>', ctx)` from the
> content script where the old inline automation used to run, and move that
> feature's step list into `lib/automation/flows.ts`.

---

## Core principle

The extension physically MUST keep the "hands" (clicking, injecting UI, reading
the DOM on lovable.dev) — a server cannot touch a user's browser tab.

But the "brain" (which selectors, which sequence, which lovable API calls, the
prompts/templates) does NOT need to live in the extension. It moves to the
server and is handed out **one validated step at a time**.

> Extension = a tiny interpreter (knows HOW to click).
> Server = the brain (decides WHAT to click and WHEN), license-checked per step.

A cracked copy with all checks removed still asks the server for step 1, gets
`403 denied`, and does nothing. You cannot delete a check that isn't on the
attacker's machine.

---

## KEY DESIGN RULE: return DATA, never executable code

The server returns **declarative action objects**, NOT JavaScript. This is
safer, easier to maintain, AND required for Chrome Web Store MV3 compliance
(remotely-hosted executable code is banned; JSON data is allowed).

Example responses:

```json
{ "step": 4, "action": "click",   "selector": "[data-testid='publish']" }
{ "step": 5, "action": "waitFor", "selector": ".completed", "timeoutMs": 15000 }
{ "step": 6, "action": "type",    "selector": "#prompt", "valueRef": "userPrompt" }
{ "step": 7, "action": "callApi", "endpointRef": "publishProject", "bodyRef": "ctx" }
{ "step": 8, "action": "done" }
```

The extension has a small fixed **instruction set** it knows how to execute:
`click`, `waitFor`, `type`, `readAttr`, `callApi`, `injectPanel`, `done`.
Anything outside this set is ignored. No `eval`, ever.

---

## The 5 protection layers (priority order)

1. **Step-by-step instruction protocol (primary weapon).**
   Features are not stored in the extension. Extension asks server
   "what's step N?" → executes → asks for step N+1. Server validates the
   license on EVERY request. Cracked copy → denied at step 1 → dead puppet.
   This is what kills free re-uploads (the real income threat).

2. **Session + device binding.**
   Each response is bound to: device fingerprint + session id + live projectId.
   Copied/replayed responses are useless on another machine or session.

3. **Short-lived signed tokens (already built).**
   Signed, device-locked, expiring tokens. Shorten freshness window to minutes
   so a revoked license stops working almost immediately.

4. **Server kill-switch + tamper reporting (already built & tested).**
   Any tamper signal (missing security file, patched core, forged unlock) →
   `POST /api/licenses/report-tamper` → license permanently revoked in Neon.

5. **Rate-limiting per license.**
   One account can only pull the step-sequence N times/hour. Stops a single
   paying cracker from mass-harvesting the full protocol in one sitting.

---

## Honest scorecard

| Attacker | Result |
|---|---|
| Non-paying cracker / free re-uploader | **Defeated** — empty shell, no logic. |
| Skilled attacker + AI | Must reverse-engineer the whole live protocol instead of deleting one line. Massive effort jump. |
| Determined **paying** cracker | Can slowly record the protocol and rebuild it. Slowed a lot, not stopped. This is the unavoidable ceiling for ANY in-browser automation tool. |

The plan fully protects the actual income threat (free copies). No client-side
system can stop a paying user from observing their own browser traffic.

---

## Build phases (do NOT do all at once)

**Phase 0 — already done and running free:**
Signed device-locked tokens, server kill-switch, tamper attestation,
cross-guard between security scripts, obfuscation. Safe to launch on this.

**Phase 1 — Instruction API (server, low risk):**
Add routes next to `/api/licenses/validate` that return declarative action
objects per feature step, gated by the existing license check + session/device
binding + rate limit.

**Phase 2 — Puppet refactor (extension, HIGH risk — test in Chrome):**
Convert one feature at a time from "knows the steps" to "fetch step → execute
step". Test each feature in Chrome before moving to the next. Never convert all
features in one shot — the feature bundles are large and pre-obfuscated.

**Phase 3 — Hardening:**
Encrypt instruction packets, rotate per session, tighten rate limits.

---

## Cost

$0 on existing Vercel + Neon free tiers. Only caveat: Vercel Hobby is
technically non-commercial — once earning, move to Pro ($20/mo) paid from
sales, never upfront.

## Before selling checklist

- [ ] Run `node scripts/gen-signing-key.mjs`, set your own `LICENSE_SIGNING_JWK`
      env var, and update the public key in `extension-fixed/license-core.js`
      (don't ship the keypair from the build chat).
- [ ] Load the rebuilt ZIP (`public/lovable-infinity-patched.zip`) in Chrome and
      confirm activation + all features work end to end.
- [ ] Confirm the kill-switch: tamper a test copy → license revokes.
