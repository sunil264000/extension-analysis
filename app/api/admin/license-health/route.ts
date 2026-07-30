import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getUserRole } from '@/lib/auth-helpers'
import { checkLicenseHealth, getAllLicenseHealth } from '@/lib/license-health'

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getUserRole(session.user.id)
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get specific license or all licenses
    const searchParams = request.nextUrl.searchParams
    const licenseId = searchParams.get('licenseId')

    if (licenseId) {
      const health = await checkLicenseHealth(licenseId)
      return NextResponse.json({ health }, { status: 200 })
    }

    // Return all licenses health
    const allHealth = await getAllLicenseHealth()
    const healthySummary = {
      total: allHealth.length,
      healthy: allHealth.filter((h) => h.isHealthy).length,
      expired: allHealth.filter((h) => h.status === 'expired').length,
      revoked: allHealth.filter((h) => h.status === 'revoked').length,
      suspicious: allHealth.filter((h) => h.status === 'suspicious').length,
      licenses: allHealth,
    }

    return NextResponse.json(healthySummary, { status: 200 })
  } catch (err) {
    console.error('[v0] License health check error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
