import { db } from '@/lib/db'
import { licenses, licenseAuditTrail } from '@/lib/db/schema'
import { eq, gt } from 'drizzle-orm'

export interface LicenseHealth {
  licenseId: string
  licenseKey: string
  isHealthy: boolean
  status: 'active' | 'expired' | 'revoked' | 'suspicious'
  issues: string[]
  daysRemaining: number
  seatsUsed: number
  maxSeats: number
  lastValidation: Date | null
  deviceCount: number
}

export async function checkLicenseHealth(licenseId: string): Promise<LicenseHealth> {
  const licenseRows = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1)

  if (!licenseRows || licenseRows.length === 0) {
    return {
      licenseId,
      licenseKey: 'unknown',
      isHealthy: false,
      status: 'suspicious',
      issues: ['License not found in database'],
      daysRemaining: -1,
      seatsUsed: 0,
      maxSeats: 0,
      lastValidation: null,
      deviceCount: 0,
    }
  }

  const license = licenseRows[0]
  const issues: string[] = []
  const now = new Date()
  const daysRemaining = Math.max(0, Math.ceil((new Date(license.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  // Check if revoked
  if (license.status === 'revoked') {
    issues.push('License has been revoked')
  }

  // Check if expired
  if (new Date(license.expiresAt) < now) {
    issues.push('License has expired')
  }

  // Check device binding integrity
  const boundDevices = license.hardwareFingerprints || []
  const deviceIps = license.deviceIpAddresses || []
  const deviceTimezones = license.deviceTimezones || []
  const deviceActivationTimes = license.deviceActivationTimes || []

  if (boundDevices.length !== deviceIps.length || boundDevices.length !== deviceTimezones.length) {
    issues.push('Device binding data is inconsistent - arrays have mismatched lengths')
  }

  // Check for suspicious patterns
  if (boundDevices.length > 0 && license.lastValidatedAt) {
    const hoursSinceLastValidation = (now.getTime() - new Date(license.lastValidatedAt).getTime()) / (1000 * 60 * 60)
    if (hoursSinceLastValidation > 72) {
      issues.push(`License has not been validated for ${Math.floor(hoursSinceLastValidation)} hours`)
    }
  }

  const status =
    license.status === 'revoked' ? 'revoked' :
    new Date(license.expiresAt) < now ? 'expired' :
    issues.length > 0 ? 'suspicious' :
    'active'

  return {
    licenseId: license.id,
    licenseKey: license.licenseKey,
    isHealthy: issues.length === 0 && license.status !== 'revoked',
    status,
    issues,
    daysRemaining,
    seatsUsed: license.seatsUsed,
    maxSeats: boundDevices.length,
    lastValidation: license.lastValidatedAt,
    deviceCount: boundDevices.length,
  }
}

export async function logLicenseEvent(
  licenseId: string,
  action: 'CREATED' | 'ACTIVATED' | 'DEVICE_BOUND' | 'EXPIRED' | 'REVOKED' | 'VALIDATED' | 'FAILED_AUTH' | 'AUTO_UNLOCKED',
  details?: Record<string, any>,
  hwid?: string,
  ip?: string,
  timezone?: string
) {
  try {
    await db.insert(licenseAuditTrail).values({
      id: crypto.randomUUID(),
      licenseId,
      action,
      details: details ? JSON.stringify(details) : undefined,
      hwid,
      ip,
      timezone,
    })
  } catch (err) {
    console.error('[v0] Failed to log license event:', err)
  }
}

export async function getAllLicenseHealth(): Promise<LicenseHealth[]> {
  const allLicenses = await db.select().from(licenses)
  return Promise.all(allLicenses.map((l) => checkLicenseHealth(l.id)))
}
