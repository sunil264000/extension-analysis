import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  licenses,
  authorizationFailures,
  licenseAuditTrail,
  licenseTiers,
} from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Get query params
    const licenseKey = request.nextUrl.searchParams.get('licenseKey')

    if (!licenseKey) {
      // Return summary of recent failures
      const recentFailures = await db
        .select()
        .from(authorizationFailures)
        .orderBy(desc(authorizationFailures.createdAt))
        .limit(50)

      return NextResponse.json({
        type: 'summary',
        recentFailures,
      })
    }

    // Get specific license diagnostics
    const licenseRecord = await db
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKey, licenseKey))
      .limit(1)

    if (!licenseRecord || licenseRecord.length === 0) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 })
    }

    const license = licenseRecord[0]

    // Get tier info
    const tierRecord = await db
      .select()
      .from(licenseTiers)
      .where(eq(licenseTiers.id, license.tierId))
      .limit(1)

    const tier = tierRecord?.[0]

    // Get authorization failures
    const failures = await db
      .select()
      .from(authorizationFailures)
      .where(eq(authorizationFailures.licenseId, license.id))
      .orderBy(desc(authorizationFailures.createdAt))
      .limit(20)

    // Get audit trail
    const auditTrail = await db
      .select()
      .from(licenseAuditTrail)
      .where(eq(licenseAuditTrail.licenseId, license.id))
      .orderBy(desc(licenseAuditTrail.createdAt))
      .limit(30)

    // Build device info
    const devices = (license.hardwareFingerprints || []).map((hwid, idx) => ({
      hwid,
      ipAddress: (license.deviceIpAddresses || [])[idx] || 'unknown',
      timezone: (license.deviceTimezones || [])[idx] || 'UTC',
      activatedAt: (license.deviceActivationTimes || [])[idx] || 'unknown',
      index: idx,
    }))

    // Calculate status
    const now = new Date()
    const isExpired = license.expiresAt < now
    const daysRemaining = Math.max(0, Math.ceil((license.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    return NextResponse.json({
      type: 'detail',
      license: {
        id: license.id,
        licenseKey: license.licenseKey,
        status: license.status,
        isExpired,
        daysRemaining,
        expiresAt: license.expiresAt.toISOString(),
        issuedAt: license.issuedAt.toISOString(),
        seatsUsed: license.seatsUsed,
        maxSeats: tier?.maxSeats || 1,
      },
      tier: {
        id: tier?.id,
        name: tier?.name,
        displayName: tier?.displayName,
        durationDays: tier?.durationDays,
      },
      devices: {
        count: devices.length,
        list: devices,
      },
      authorizationFailures: {
        count: failures.length,
        recent: failures.map((f) => ({
          id: f.id,
          attemptedHwid: f.attemptedHwid,
          reason: f.failureReason,
          ip: f.ip,
          timezone: f.timezone,
          createdAt: f.createdAt.toISOString(),
        })),
      },
      auditTrail: {
        count: auditTrail.length,
        recent: auditTrail.map((a) => ({
          id: a.id,
          action: a.action,
          details: a.details ? JSON.parse(a.details) : null,
          hwid: a.hwid,
          ip: a.ip,
          createdAt: a.createdAt.toISOString(),
        })),
      },
    })
  } catch (err) {
    console.error('[diagnostics] error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
