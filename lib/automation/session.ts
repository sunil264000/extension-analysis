import crypto from 'crypto'

/**
 * Session helpers for the step protocol.
 *
 * Each automation session gets a fresh 256-bit AES key generated on the server
 * at `start`. Step packets are encrypted with AES-256-GCM under that key. The
 * key is returned to the client ONCE (over HTTPS) and held only in memory for
 * the session lifetime — it is never written into the extension bundle or into
 * chrome.storage. This means:
 *   - Static analysis of the extension reveals no step logic and no key.
 *   - A packet captured from one session cannot be replayed into another.
 *   - You must run a live, licensed session to obtain any instructions at all.
 */

export function newSessionKey(): string {
  return crypto.randomBytes(32).toString('base64')
}

export function newId(prefix: string): string {
  return prefix + '_' + crypto.randomBytes(16).toString('hex')
}

/**
 * Encrypts a JSON-serialisable payload with the session key.
 * Returns a compact string: base64(iv).base64(tag).base64(ciphertext)
 */
export function encryptForSession(sessionKeyB64: string, payload: unknown): string {
  const key = Buffer.from(sessionKeyB64, 'base64')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.')
}

/** Stable, non-reversible hash of a fingerprint for logging/compare. */
export function hashFp(fp: string): string {
  return crypto.createHash('sha256').update(String(fp)).digest('hex').slice(0, 32)
}
