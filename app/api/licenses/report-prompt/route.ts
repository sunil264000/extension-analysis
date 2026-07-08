import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { licenses, usageTracking, promptEvents } from '@/lib/db/schema'
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

function withCors<T>(res: NextResponse<T>): NextResponse<T> {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

interface ReportPromptRequest {
  licenseKey: string
  hardwareFingerprint: string
  promptText?: string
  pageUrl?: string
  projectId?: string
}

/**
 * Heuristics to flag prompts that look like tamper / crack attempts, or that
 * try to manipulate the extension's own licensing. This is what lets the admin
 * catch people trying to crack the extension.
 */
function detectAbuse(promptText: string, pageUrl: string): string | null {
  const text = (promptText || '').toLowerCase()
  const suspiciousPatterns: { re: RegExp; reason: string }[] = [
    { re: /crack|keygen|bypass\s*licen|patch\s*the\s*extension/i, reason: 'Mentions cracking / bypassing the license' },
    { re: /999999999|9,?999,?999|unlimited\s*credits?/i, reason: 'References the old fake-credits exploit' },
    { re: /local-activation\.js|lovable-license-validator|chrome\.storage|manifest\.json/i, reason: 'References extension internals' },
    { re: /disable\s*(the\s*)?(license|validation|check)/i, reason: 'Attempts to disable license validation' },
    { re: /reverse\s*engineer|deobfuscat|decompile/i, reason: 'Reverse-engineering intent' },
  ]
  for (const { re, reason } of suspiciousPatterns) {
    if (re.test(text)) return reason
  }
  return null
}

export async function POST(request: NextRequest) {
  return withCors(await handleReportPrompt(request))
}

async function handleReportPrompt(request: NextRequest) {
  try {
    const body: ReportPromptRequest = await request.json()
    const { licenseKey, hardwareFingerprint, promptText = '', pageUrl = '', projectId = '' } = body

    if (!licenseKey || !hardwareFingerprint) {
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST', message: 'Missing licenseKey or hardwareFingerprint' },
        { status: 400 }
      )
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Look up the license
    const licenseRecord = await db
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKey, licenseKey))
      .limit(1)

    if (!licenseRecord || licenseRecord.length === 0) {
      return NextResponse.json(
        { success: false, error: 'LICENSE_NOT_FOUND', message: 'License not found' },
        { status: 404 }
      )
    }

    const license = licenseRecord[0]

    // Determine flags
    const deviceRegistered = license.hardwareFingerprints?.includes(hardwareFingerprint) ?? false
    const abuseReason = detectAbuse(promptText, pageUrl)
    const expired = new Date(license.expiresAt).getTime() < Date.now()

    let flagged = false
    const reasons: string[] = []
    if (!deviceRegistered) {
      flagged = true
      reasons.push('Unregistered device fingerprint (possible key sharing / tamper)')
    }
    if (abuseReason) {
      flagged = true
      reasons.push(abuseReason)
    }
    if (expired || license.status !== 'active') {
      flagged = true
      reasons.push('Used while license expired/inactive')
    }

    // Truncate very long prompts so we don't store unbounded text
    const safePrompt = (promptText || '').slice(0, 8000)

    // Always log the prompt event (even flagged ones) so admin has full visibility
    await db.insert(promptEvents).values({
      id: crypto.randomUUID(),
      licenseId: license.id,
      userId: license.userId,
      licenseKey: license.licenseKey,
      promptText: safePrompt,
      promptLength: (promptText || '').length,
      pageUrl: pageUrl.slice(0, 500),
      projectId: projectId.slice(0, 200),
      hardwareFingerprint,
      ipAddress,
      userAgent: userAgent.slice(0, 500),
      flagged,
      flagReason: reasons.length ? reasons.join('; ') : null,
    })

    // Only count usage for legitimate prompts on active, registered licenses
    if (deviceRegistered && !expired && license.status === 'active') {
      const today = new Date().toISOString().split('T')[0]
      const usageRecord = await db
        .select()
        .from(usageTracking)
        .where(and(eq(usageTracking.licenseId, license.id), eq(usageTracking.date, today)))
        .limit(1)

      if (usageRecord && usageRecord.length > 0) {
        await db
          .update(usageTracking)
          .set({ usageCount: usageRecord[0].usageCount + 1, updatedAt: new Date() })
          .where(eq(usageTracking.id, usageRecord[0].id))
      } else {
        await db.insert(usageTracking).values({
          id: crypto.randomUUID(),
          licenseId: license.id,
          date: today,
          usageCount: 1,
          uniqueDevices: 1,
        })
      }

      await db
        .update(licenses)
        .set({ usageCount: license.usageCount + 1, updatedAt: new Date() })
        .where(eq(licenses.id, license.id))
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt recorded',
      flagged,
    })
  } catch (error) {
    console.error('[Report Prompt Error]', error)
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
