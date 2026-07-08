import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { licenses, licenseActivations, licenseTiers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'

interface ValidateRequest {
  licenseKey: string
  hardwareFingerprint: string
}

interface ValidateResponse {
  valid: boolean
  message: string
  license?: {
    licenseKey: string
    tierId: string
    tier?: {
      displayName: string
      maxSeats: number
      maxUsageLimit: number
      durationDays: number
      features: string[]
    }
    expiresAt: string
    seatsUsed: number
    usageCount: number
    status: string
  }
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<ValidateResponse>> {
  try {
    const body: ValidateRequest = await request.json()
    const { licenseKey, hardwareFingerprint } = body

    if (!licenseKey || !hardwareFingerprint) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Missing licenseKey or hardwareFingerprint',
          error: 'INVALID_REQUEST',
        },
        { status: 400 }
      )
    }

    // Find license by key
    const licenseRecord = await db
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKey, licenseKey))
      .limit(1)

    if (!licenseRecord || licenseRecord.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          message: 'License key not found',
          error: 'LICENSE_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    const license = licenseRecord[0]

    // Check if license is active
    if (license.status !== 'active') {
      return NextResponse.json(
        {
          valid: false,
          message: `License is ${license.status}`,
          error: 'LICENSE_INACTIVE',
        },
        { status: 403 }
      )
    }

    // Check expiry
    const now = new Date()
    if (license.expiresAt < now) {
      await db.update(licenses).set({ status: 'expired' }).where(eq(licenses.id, license.id))
      return NextResponse.json(
        {
          valid: false,
          message: 'License has expired',
          error: 'LICENSE_EXPIRED',
        },
        { status: 403 }
      )
    }

    // Check device binding - verify hardware fingerprint
    if (license.hardwareFingerprints && license.hardwareFingerprints.length > 0) {
      const deviceFound = license.hardwareFingerprints.includes(hardwareFingerprint)

      if (!deviceFound) {
        // Check if still can add more devices (seats)
        if (license.seatsUsed >= license.maxSeats) {
          return NextResponse.json(
            {
              valid: false,
              message: 'Maximum device seats reached for this license',
              error: 'MAX_SEATS_EXCEEDED',
            },
            { status: 403 }
          )
        }

        // Add new device
        const updatedFingerprints = [...(license.hardwareFingerprints || []), hardwareFingerprint]
        await db
          .update(licenses)
          .set({
            hardwareFingerprints: updatedFingerprints,
            seatsUsed: license.seatsUsed + 1,
          })
          .where(eq(licenses.id, license.id))

        // Create activation record
        const activationId = crypto.randomUUID()
        await db.insert(licenseActivations).values({
          id: activationId,
          licenseId: license.id,
          hardwareFingerprint,
        })
      }
    } else {
      // First activation - bind to this device
      const updatedFingerprints = [hardwareFingerprint]
      await db
        .update(licenses)
        .set({
          hardwareFingerprints: updatedFingerprints,
          seatsUsed: 1,
        })
        .where(eq(licenses.id, license.id))

      const activationId = crypto.randomUUID()
      await db.insert(licenseActivations).values({
        id: activationId,
        licenseId: license.id,
        hardwareFingerprint,
      })
    }

    // Get tier info
    const tierRecord = await db
      .select()
      .from(licenseTiers)
      .where(eq(licenseTiers.id, license.tierId))
      .limit(1)

    // Update last validated timestamp
    await db
      .update(licenses)
      .set({ lastValidatedAt: new Date() })
      .where(eq(licenses.id, license.id))

    return NextResponse.json({
      valid: true,
      message: 'License is valid',
      license: {
        licenseKey: license.licenseKey,
        tierId: license.tierId,
        tier: tierRecord?.[0]
          ? {
              displayName: tierRecord[0].displayName,
              maxSeats: tierRecord[0].maxSeats,
              maxUsageLimit: tierRecord[0].maxUsageLimit || 0,
              durationDays: tierRecord[0].durationDays,
              features: tierRecord[0].features || [],
            }
          : undefined,
        expiresAt: license.expiresAt.toISOString(),
        seatsUsed: license.seatsUsed,
        usageCount: license.usageCount,
        status: license.status,
      },
    })
  } catch (error) {
    console.error('[License Validation Error]', error)
    return NextResponse.json(
      {
        valid: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    )
  }
}
