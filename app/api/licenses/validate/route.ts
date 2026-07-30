import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { licenses, licenseActivations, licenseTiers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'
import { signLicenseToken } from '@/lib/license-signing'

// ---------------------------------------------------------------------------
// CORS — the extension calls this endpoint cross-origin from lovable.dev,
// so every response (including errors and preflight) must carry CORS headers.
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

interface ValidateRequest {
  licenseKey: string
  hardwareFingerprint: string
  timezone?: string
  userAgent?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ValidateRequest
    const licenseKey = (body.licenseKey || '').trim()
    const hardwareFingerprint = (body.hardwareFingerprint || '').trim()
    const timezone = body.timezone || 'UTC'
    const userAgent = body.userAgent || request.headers.get('user-agent') || 'unknown'

    // Get client IP address
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    if (!licenseKey || !hardwareFingerprint) {
      return json(
        {
          valid: false,
          message: 'Missing licenseKey or hardwareFingerprint',
          error: 'INVALID_REQUEST',
        },
        400
      )
    }

    // Find license by key
    const licenseRecord = await db
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKey, licenseKey))
      .limit(1)

    if (!licenseRecord || licenseRecord.length === 0) {
      return json(
        {
          valid: false,
          message: 'License key not found',
          error: 'LICENSE_NOT_FOUND',
        },
        404
      )
    }

    const license = licenseRecord[0]

    // Check if license is active (e.g. not revoked/suspended)
    if (license.status !== 'active') {
      return json(
        {
          valid: false,
          message: `License is ${license.status}`,
          error: 'LICENSE_INACTIVE',
        },
        403
      )
    }

    // Check expiry (duration-based licensing)
    const now = new Date()
    if (license.expiresAt < now) {
      await db.update(licenses).set({ status: 'expired' }).where(eq(licenses.id, license.id))
      return json(
        {
          valid: false,
          message: 'License has expired',
          error: 'LICENSE_EXPIRED',
          expiresAt: license.expiresAt.toISOString(),
        },
        403
      )
    }

    // Get tier info (for seat limits + display)
    const tierRecord = await db
      .select()
      .from(licenseTiers)
      .where(eq(licenseTiers.id, license.tierId))
      .limit(1)
    const tier = tierRecord?.[0]
    const maxSeats = tier?.maxSeats ?? 1

    // Device binding — verify / register the hardware fingerprint
    const boundDevices = license.hardwareFingerprints || []
    const deviceIps = license.deviceIpAddresses || []
    const deviceTimezones = license.deviceTimezones || []
    const deviceActivationTimes = license.deviceActivationTimes || []
    const deviceFound = boundDevices.includes(hardwareFingerprint)

    if (!deviceFound) {
      if (boundDevices.length >= maxSeats) {
        return json(
          {
            valid: false,
            message: 'Maximum device seats reached for this license',
            error: 'MAX_SEATS_EXCEEDED',
          },
          403
        )
      }

      // Add new device with full tracking info
      const updatedFingerprints = [...boundDevices, hardwareFingerprint]
      const updatedIps = [...deviceIps, clientIp]
      const updatedTimezones = [...deviceTimezones, timezone]
      const updatedActivationTimes = [...deviceActivationTimes, new Date().toISOString()]

      await db
        .update(licenses)
        .set({
          hardwareFingerprints: updatedFingerprints,
          deviceIpAddresses: updatedIps,
          deviceTimezones: updatedTimezones,
          deviceActivationTimes: updatedActivationTimes,
          seatsUsed: updatedFingerprints.length,
          lastDeviceIp: clientIp,
          lastDeviceTimezone: timezone,
          lastDeviceHwid: hardwareFingerprint,
        })
        .where(eq(licenses.id, license.id))

      await db.insert(licenseActivations).values({
        id: crypto.randomUUID(),
        licenseId: license.id,
        hardwareFingerprint,
      })
    } else {
      // Update last device info
      await db
        .update(licenses)
        .set({
          lastDeviceIp: clientIp,
          lastDeviceTimezone: timezone,
          lastDeviceHwid: hardwareFingerprint,
        })
        .where(eq(licenses.id, license.id))
    }

    // Update last validated timestamp
    await db
      .update(licenses)
      .set({ lastValidatedAt: now })
      .where(eq(licenses.id, license.id))

    // Compute remaining duration. Trials are measured in minutes, so expose
    // minute-level precision as well as the whole-day figure.
    const msRemaining = Math.max(0, license.expiresAt.getTime() - now.getTime())
    const minutesRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60)))
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
    // Human-friendly label the extension can show directly.
    const timeRemainingLabel =
      minutesRemaining < 60
        ? `${minutesRemaining} min`
        : minutesRemaining < 60 * 24
          ? `${Math.ceil(minutesRemaining / 60)} hr`
          : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`

    // Sign a tamper-proof token bound to this device + expiry. The extension
    // verifies it with the embedded public key; it cannot be forged or edited
    // client-side, so faking validity or extending expiry is not possible
    // without the server's private key.
    const planName = tier?.displayName ?? 'Pro'
    const { token } = signLicenseToken({
      k: license.licenseKey,
      fp: hardwareFingerprint,
      plan: planName,
      status: 'active',
      exp: license.expiresAt.getTime(),
    })

    return json({
      valid: true,
      message: 'License is valid',
      // Signed, verifiable proof of validity (see lib/license-signing.ts)
      token,
      // Flat fields the extension reads directly
      planName,
      expiresAt: license.expiresAt.toISOString(),
      issuedAt: license.issuedAt.toISOString(),
      daysRemaining,
      minutesRemaining,
      timeRemainingLabel,
      seatsUsed: deviceFound ? license.seatsUsed : boundDevices.length + 1,
      maxSeats,
      // Device tracking info
      device: {
        hwid: hardwareFingerprint,
        ipAddress: clientIp,
        timezone,
        userAgent,
        activatedAt: deviceFound
          ? deviceActivationTimes[boundDevices.indexOf(hardwareFingerprint)]
          : new Date().toISOString(),
      },
      // All registered devices (admin view)
      devices: boundDevices.map((hwid, idx) => ({
        hwid,
        ipAddress: deviceIps[idx] || 'unknown',
        timezone: deviceTimezones[idx] || 'UTC',
        activatedAt: deviceActivationTimes[idx] || 'unknown',
      })),
      license: {
        licenseKey: license.licenseKey,
        tierId: license.tierId,
        tier: tier
          ? {
              displayName: tier.displayName,
              maxSeats: tier.maxSeats,
              maxUsageLimit: tier.maxUsageLimit || 0,
              durationDays: tier.durationDays,
              features: tier.features || [],
            }
          : undefined,
        expiresAt: license.expiresAt.toISOString(),
        issuedAt: license.issuedAt.toISOString(),
        daysRemaining,
        minutesRemaining,
        seatsUsed: license.seatsUsed,
        usageCount: license.usageCount,
        status: license.status,
      },
    })
  } catch (error) {
    console.error('[License Validation Error]', error)
    return json(
      {
        valid: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      },
      500
    )
  }
}
