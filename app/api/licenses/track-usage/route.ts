import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { licenses, usageTracking, licenseTiers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

interface TrackUsageRequest {
  licenseKey: string
  hardwareFingerprint: string
}

interface TrackUsageResponse {
  success: boolean
  message: string
  usage?: {
    todayUsage: number
    totalUsage: number
    maxLimit: number
    remaining: number
  }
  error?: string
}

function withCors<T>(res: NextResponse<T>): NextResponse<T> {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export async function POST(request: NextRequest): Promise<NextResponse<TrackUsageResponse>> {
  return withCors(await handleTrackUsage(request))
}

async function handleTrackUsage(request: NextRequest): Promise<NextResponse<TrackUsageResponse>> {
  try {
    const body: TrackUsageRequest = await request.json()
    const { licenseKey, hardwareFingerprint } = body

    if (!licenseKey || !hardwareFingerprint) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing licenseKey or hardwareFingerprint',
          error: 'INVALID_REQUEST',
        },
        { status: 400 }
      )
    }

    // Find license
    const licenseRecord = await db
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKey, licenseKey))
      .limit(1)

    if (!licenseRecord || licenseRecord.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'License not found',
          error: 'LICENSE_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    const license = licenseRecord[0]

    // Verify device is registered
    if (!license.hardwareFingerprints?.includes(hardwareFingerprint)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Device not registered for this license',
          error: 'DEVICE_NOT_REGISTERED',
        },
        { status: 403 }
      )
    }

    // Get tier info for usage limits
    const tierRecord = await db
      .select()
      .from(licenseTiers)
      .where(eq(licenseTiers.id, license.tierId))
      .limit(1)

    if (!tierRecord || tierRecord.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'License tier not found',
          error: 'TIER_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    const tier = tierRecord[0]
    const maxLimit = tier.maxUsageLimit || 0

    // Get today's usage
    const today = new Date().toISOString().split('T')[0]
    const usageRecord = await db
      .select()
      .from(usageTracking)
      .where(and(eq(usageTracking.licenseId, license.id), eq(usageTracking.date, today)))
      .limit(1)

    let todayUsage = 0
    let usageId = crypto.randomUUID()

    if (usageRecord && usageRecord.length > 0) {
      todayUsage = usageRecord[0].usageCount + 1
      usageId = usageRecord[0].id

      // Check limit
      if (maxLimit > 0 && todayUsage > maxLimit) {
        return NextResponse.json(
          {
            success: false,
            message: 'Daily usage limit exceeded',
            error: 'USAGE_LIMIT_EXCEEDED',
            usage: {
              todayUsage,
              totalUsage: license.usageCount + 1,
              maxLimit,
              remaining: Math.max(0, maxLimit - todayUsage),
            },
          },
          { status: 429 }
        )
      }

      // Update today's usage
      await db
        .update(usageTracking)
        .set({ usageCount: todayUsage })
        .where(eq(usageTracking.id, usageId))
    } else {
      // Create new usage record for today
      if (maxLimit > 0 && 1 > maxLimit) {
        return NextResponse.json(
          {
            success: false,
            message: 'Daily usage limit exceeded',
            error: 'USAGE_LIMIT_EXCEEDED',
          },
          { status: 429 }
        )
      }

      todayUsage = 1
      await db.insert(usageTracking).values({
        id: usageId,
        licenseId: license.id,
        date: today,
        usageCount: 1,
        uniqueDevices: 1,
      })
    }

    // Update license total usage
    await db
      .update(licenses)
      .set({ usageCount: license.usageCount + 1 })
      .where(eq(licenses.id, license.id))

    const remaining = maxLimit > 0 ? Math.max(0, maxLimit - todayUsage) : -1

    return NextResponse.json({
      success: true,
      message: 'Usage tracked successfully',
      usage: {
        todayUsage,
        totalUsage: license.usageCount + 1,
        maxLimit,
        remaining,
      },
    })
  } catch (error) {
    console.error('[Usage Tracking Error]', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    )
  }
}
