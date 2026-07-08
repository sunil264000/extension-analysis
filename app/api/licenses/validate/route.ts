import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { licenses, licenseActivations, licenseTiers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

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
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ValidateRequest
    const licenseKey = (body.licenseKey || '').trim()
    const hardwareFingerprint = (body.hardwareFingerprint || '').trim()

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

      const updatedFingerprints = [...boundDevices, hardwareFingerprint]
      await db
        .update(licenses)
        .set({
          hardwareFingerprints: updatedFingerprints,
          seatsUsed: updatedFingerprints.length,
        })
        .where(eq(licenses.id, license.id))

      await db.insert(licenseActivations).values({
        id: crypto.randomUUID(),
        licenseId: license.id,
        hardwareFingerprint,
      })
    }

    // Update last validated timestamp
    await db
      .update(licenses)
      .set({ lastValidatedAt: now })
      .where(eq(licenses.id, license.id))

    // Compute remaining duration (whole days, rounded up, min 0)
    const msRemaining = license.expiresAt.getTime() - now.getTime()
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))

    return json({
      valid: true,
      message: 'License is valid',
      // Flat fields the extension reads directly
      planName: tier?.displayName ?? 'Pro',
      expiresAt: license.expiresAt.toISOString(),
      daysRemaining,
      seatsUsed: deviceFound ? license.seatsUsed : boundDevices.length + 1,
      maxSeats,
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
        daysRemaining,
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
