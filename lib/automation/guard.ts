import { db } from '@/lib/db'
import { licenses, licenseTiers, automationSessions } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import type { License } from '@/lib/db/schema'

export interface GuardOk {
  ok: true
  license: License
  planName: string
}
export interface GuardFail {
  ok: false
  reason: string
  message: string
}
export type GuardResult = GuardOk | GuardFail

// How many sessions a single license may start per rolling hour.
const MAX_SESSIONS_PER_HOUR = 60

/**
 * Authoritative license check shared by the automation start/step routes.
 * Verifies the key exists, is active (not revoked/expired), and — when a
 * fingerprint was already bound — that this device matches. This is the gate a
 * cracked extension cannot get past: without a valid license the server returns
 * a failure and hands out no instructions.
 */
export async function verifyLicense(
  licenseKey: string,
  hardwareFingerprint: string
): Promise<GuardResult> {
  if (!licenseKey || !hardwareFingerprint) {
    return { ok: false, reason: 'MISSING_FIELDS', message: 'License key and device required.' }
  }

  const rows = await db
    .select()
    .from(licenses)
    .where(eq(licenses.licenseKey, licenseKey.trim()))
    .limit(1)

  if (!rows.length) {
    return { ok: false, reason: 'NOT_FOUND', message: 'License not found.' }
  }
  const license = rows[0]

  if (license.status === 'revoked') {
    return { ok: false, reason: 'REVOKED', message: 'This license has been revoked.' }
  }
  if (license.status !== 'active') {
    return { ok: false, reason: 'INACTIVE', message: 'This license is not active.' }
  }
  if (new Date() > new Date(license.expiresAt)) {
    return { ok: false, reason: 'EXPIRED', message: 'This license has expired.' }
  }

  // Device binding: if fingerprints are already registered, this device must be
  // one of them (prevents sharing one key across many machines).
  const fps = license.hardwareFingerprints || []
  if (fps.length > 0 && !fps.includes(hardwareFingerprint)) {
    return { ok: false, reason: 'DEVICE_MISMATCH', message: 'License is bound to another device.' }
  }

  let planName = 'Pro'
  try {
    const tierRows = await db
      .select({ displayName: licenseTiers.displayName })
      .from(licenseTiers)
      .where(eq(licenseTiers.id, license.tierId))
      .limit(1)
    if (tierRows.length) planName = tierRows[0].displayName
  } catch {
    /* tier lookup is best-effort */
  }

  return { ok: true, license, planName }
}

/** Per-license rate limit on new sessions. Returns true when OVER the limit. */
export async function isRateLimited(licenseId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000)
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(automationSessions)
    .where(and(eq(automationSessions.licenseId, licenseId), gte(automationSessions.createdAt, since)))
  return Number(row?.count ?? 0) >= MAX_SESSIONS_PER_HOUR
}
