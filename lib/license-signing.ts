import crypto from 'crypto'

/**
 * Cryptographic license token signing (server-only).
 *
 * The extension can be trivially cracked if it simply trusts a JSON
 * `{ valid: true }` response — an attacker can stub the network call or edit
 * the cached expiry in chrome.storage. To defeat that, the server signs a
 * compact token with an ECDSA P-256 private key. The extension holds ONLY the
 * matching PUBLIC key, so it can verify authenticity but can NEVER forge a
 * token (extend expiry, move devices, fake a plan) without the private key.
 *
 * Token format (compact, dot-separated, base64url):
 *   base64url(payloadJSON) + "." + base64url(signature)
 *
 * Signature: ECDSA P-256 / SHA-256 over the payload segment bytes, encoded in
 * IEEE-P1363 (r||s) so the browser's WebCrypto `verify` accepts it directly.
 *
 * KEY MANAGEMENT
 *   The private key is read from process.env.LICENSE_SIGNING_KEY (a JWK string).
 *   A generated key is hardcoded as a fallback so the system works out of the
 *   box. If you push this repo publicly, set LICENSE_SIGNING_KEY to a fresh key
 *   (see scripts/gen-signing-key.mjs) and the matching public key in the
 *   extension — the committed fallback should then be considered rotated out.
 */

// Rotated ECDSA P-256 private key (JWK), v7.1. Fallback only; the authoritative
// private key should live in the LICENSE_SIGNING_KEY env var on the server.
const FALLBACK_PRIVATE_JWK =
  '{"kty":"EC","x":"f2AjEhIjyzYF3B_l8fakdGPvbXQyij3JI5HyfvpywcU","y":"3y3Wmg8GFUXsQ-qkNmzi1-SoZFTWzV_B2qcfj3y7HRw","crv":"P-256","d":"66jp4Uyxeyyn_yOnGYv-Ee6EsfVSiQFEGnH2GOouN3U"}'

// The public SPKI (base64) that ships inside the extension, exported for the
// key-generation script and documentation. Not secret.
export const PUBLIC_SPKI_B64 =
  'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEf2AjEhIjyzYF3B/l8fakdGPvbXQyij3JI5HyfvpywcXfLdaaDwYVRexD6qQ2bOLX5KhkVNbNX8Hapx+PfLsdHA=='

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function getPrivateKey(): crypto.KeyObject {
  const jwkStr = process.env.LICENSE_SIGNING_KEY || FALLBACK_PRIVATE_JWK
  const jwk = JSON.parse(jwkStr)
  return crypto.createPrivateKey({ key: jwk, format: 'jwk' })
}

export interface LicenseTokenPayload {
  v: number // token schema version
  k: string // license key
  fp: string // hardware fingerprint the token is bound to
  plan: string // plan/tier display name
  status: string // license status at issue time
  iat: number // issued-at (ms epoch)
  exp: number // hard expiry (ms epoch) — matches the license expiry
  ttl: number // token freshness window (ms) the client should re-check within
  nonce: string // random, anti-replay
}

/**
 * Builds and signs a license token. Returns the compact token string.
 */
export function signLicenseToken(
  input: Omit<LicenseTokenPayload, 'v' | 'iat' | 'nonce' | 'ttl'> & { ttlMs?: number }
): { token: string; payload: LicenseTokenPayload } {
  const payload: LicenseTokenPayload = {
    v: 1,
    k: input.k,
    fp: input.fp,
    plan: input.plan,
    status: input.status,
    iat: Date.now(),
    exp: input.exp,
    ttl: input.ttlMs ?? 6 * 60 * 60 * 1000, // 6h default re-check window
    nonce: crypto.randomBytes(12).toString('hex'),
  }

  const payloadSeg = base64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  const signature = crypto.sign('sha256', Buffer.from(payloadSeg, 'utf8'), {
    key: getPrivateKey(),
    dsaEncoding: 'ieee-p1363',
  })
  const token = payloadSeg + '.' + base64url(signature)
  return { token, payload }
}
