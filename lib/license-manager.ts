import { db } from '@/lib/db'
import {
  licenses,
  licenseAuditTrail,
  authorizationFailures,
  licenseTiers,
} from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import crypto from 'crypto'

export interface DeviceInfo {
  hwid: string
  ip: string
  timezone: string
  userAgent: string
}

export interface LicenseValidationResult {
  valid: boolean
  reason?: string // 'EXPIRED', 'REVOKED', 'DEVICE_MISMATCH', 'INVALID_KEY', etc.
  message: string
}

/**
 * Log license events for audit trail
 */
export async function logLicenseEvent(
  licenseId: string,
  action: string,
  details?: Record<string, any>,
  device?: DeviceInfo
) {
  try {
    await db.insert(licenseAuditTrail).values({
      id: crypto.randomUUID(),
      licenseId,
      action,
      details: details ? JSON.stringify(details) : null,
      ip: device?.ip,
      timezone: device?.timezone,
      hwid: device?.hwid,
      createdAt: new Date(),
    })
  } catch (err) {
    console.error('[license-manager] Failed to log event:', err)
  }
}

/**
 * Log authorization failure with specific reason
 */
export async function logAuthorizationFailure(
  licenseId: string,
  licenseKey: string,
  attemptedHwid: string,
  reason: string,
  boundDevices: string[],
  device?: DeviceInfo
) {
  try {
    await db.insert(authorizationFailures).values({
      id: crypto.randomUUID(),
      licenseId,
      licenseKey,
      attemptedHwid,
      failureReason: reason,
      boundDevices,
      ip: device?.ip,
      timezone: device?.timezone,
      userAgent: device?.userAgent,
      createdAt: new Date(),
    })
  } catch (err) {
    console.error('[license-manager] Failed to log auth failure:', err)
  }
}

/**
 * Validate license key and check if it's active
 */
export async function validateLicenseStatus(
  licenseId: string,
  licenseKey: string
): Promise<LicenseValidationResult> {
  try {
    const license = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, licenseId))
      .limit(1)

    if (!license || license.length === 0) {
      return { valid: false, reason: 'INVALID_KEY', message: 'License key not found' }
    }

    const lic = license[0]

    // Check if key matches
    if (lic.licenseKey !== licenseKey) {
      return { valid: false, reason: 'INVALID_KEY', message: 'License key mismatch' }
    }

    // Check if revoked
    if (lic.status === 'revoked') {
      return { valid: false, reason: 'REVOKED', message: 'License has been revoked' }
    }

    // Check if expired
    const now = new Date()
    if (lic.expiresAt < now) {
      return { valid: false, reason: 'EXPIRED', message: 'License has expired' }
    }

    // Check if suspended
    if (lic.status === 'suspended') {
      return { valid: false, reason: 'SUSPENDED', message: 'License is currently suspended' }
    }

    return { valid: true, message: 'License is valid' }
  } catch (err) {
    console.error('[license-manager] Error validating license:', err)
    return {
      valid: false,
      reason: 'ERROR',
      message: 'Failed to validate license',
    }
  }
}

/**
 * Check if device can be bound to license
 */
export async function canBindDevice(
  licenseId: string,
  newHwid: string,
  device?: DeviceInfo
): Promise<{
  canBind: boolean
  reason?: string
  seatsUsed: number
  maxSeats: number
}> {
  try {
    const licenseRecord = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, licenseId))
      .limit(1)

    if (!licenseRecord || licenseRecord.length === 0) {
      return { canBind: false, reason: 'LICENSE_NOT_FOUND', seatsUsed: 0, maxSeats: 0 }
    }

    const license = licenseRecord[0]
    const boundDevices = license.hardwareFingerprints || []
    const isAlreadyBound = boundDevices.includes(newHwid)

    // Get tier info
    const tierRecord = await db
      .select()
      .from(licenseTiers)
      .where(eq(licenseTiers.id, license.tierId))
      .limit(1)

    const maxSeats = tierRecord?.[0]?.maxSeats || 1
    const seatsUsed = boundDevices.length

    // If already bound, allow (same device validating again)
    if (isAlreadyBound) {
      return { canBind: true, seatsUsed, maxSeats }
    }

    // If not bound but seats available, allow
    if (seatsUsed < maxSeats) {
      return { canBind: true, seatsUsed, maxSeats }
    }

    // Out of seats
    return {
      canBind: false,
      reason: 'SEAT_LIMIT_REACHED',
      seatsUsed,
      maxSeats,
    }
  } catch (err) {
    console.error('[license-manager] Error checking device binding:', err)
    return { canBind: false, reason: 'ERROR', seatsUsed: 0, maxSeats: 0 }
  }
}

/**
 * Bind a device to a license
 */
export async function bindDevice(
  licenseId: string,
  hwid: string,
  device?: DeviceInfo
): Promise<{ success: boolean; message: string }> {
  try {
    const licenseRecord = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, licenseId))
      .limit(1)

    if (!licenseRecord || licenseRecord.length === 0) {
      return { success: false, message: 'License not found' }
    }

    const license = licenseRecord[0]
    const boundDevices = license.hardwareFingerprints || []
    const deviceIps = license.deviceIpAddresses || []
    const deviceTimezones = license.deviceTimezones || []
    const deviceActivationTimes = license.deviceActivationTimes || []

    // Don't add if already bound
    if (!boundDevices.includes(hwid)) {
      boundDevices.push(hwid)
      deviceIps.push(device?.ip || 'unknown')
      deviceTimezones.push(device?.timezone || 'UTC')
      deviceActivationTimes.push(new Date().toISOString())

      await db
        .update(licenses)
        .set({
          hardwareFingerprints: boundDevices,
          deviceIpAddresses: deviceIps,
          deviceTimezones: deviceTimezones,
          deviceActivationTimes: deviceActivationTimes,
          seatsUsed: boundDevices.length,
          lastDeviceIp: device?.ip,
          lastDeviceTimezone: device?.timezone,
          lastDeviceHwid: hwid,
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(licenses.id, licenseId))

      await logLicenseEvent(licenseId, 'DEVICE_BOUND', { deviceCount: boundDevices.length }, device)
    }

    return { success: true, message: 'Device bound successfully' }
  } catch (err) {
    console.error('[license-manager] Error binding device:', err)
    return { success: false, message: 'Failed to bind device' }
  }
}

/**
 * Get license diagnostics for admin view
 */
export async function getLicenseDiagnostics(licenseId: string) {
  try {
    const license = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, licenseId))
      .limit(1)

    if (!license || license.length === 0) {
      return null
    }

    const lic = license[0]
    const recentFailures = await db
      .select()
      .from(authorizationFailures)
      .where(eq(authorizationFailures.licenseId, licenseId))
      .orderBy((t) => ({ createdAt: 'desc' }))
      .limit(10)

    const auditTrail = await db
      .select()
      .from(licenseAuditTrail)
      .where(eq(licenseAuditTrail.licenseId, licenseId))
      .orderBy(desc(licenseAuditTrail.createdAt))
      .limit(20)

    return {
      license: lic,
      devices: (lic.hardwareFingerprints || []).map((hwid, idx) => ({
        hwid,
        ip: (lic.deviceIpAddresses || [])[idx] || 'unknown',
        timezone: (lic.deviceTimezones || [])[idx] || 'UTC',
        activatedAt: (lic.deviceActivationTimes || [])[idx] || 'unknown',
      })),
      recentFailures,
      auditTrail,
    }
  } catch (err) {
    console.error('[license-manager] Error getting diagnostics:', err)
    return null
  }
}
