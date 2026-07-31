import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { licenses, authorizationFailures } from '@/lib/db/schema'

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get total licenses
    const allLicenses = await db.select().from(licenses)
    const totalLicenses = allLicenses.length
    const activeLicenses = allLicenses.filter((l) => l.status === 'active').length
    const expiredLicenses = allLicenses.filter((l) => new Date(l.expiresAt) < now).length
    const revokedLicenses = allLicenses.filter((l) => l.status === 'revoked').length

    // Get recent failures
    const failuresCount = await db
      .select()
      .from(authorizationFailures)
      .where((t) => t.createdAt > oneDayAgo)

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: now.toISOString(),
        licenses: {
          total: totalLicenses,
          active: activeLicenses,
          expired: expiredLicenses,
          revoked: revokedLicenses,
        },
        recentFailures: {
          last24hours: failuresCount.length,
        },
        api: {
          responsive: true,
          databaseConnected: true,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[v0] Health check error:', err)
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: 'Database connection issue',
      },
      { status: 503 }
    )
  }
}
