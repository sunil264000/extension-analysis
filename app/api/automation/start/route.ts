import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { automationSessions } from '@/lib/db/schema'
import { getFlow } from '@/lib/automation/flows'
import { verifyLicense, isRateLimited } from '@/lib/automation/guard'
import { newSessionKey, newId } from '@/lib/automation/session'

// ---------------------------------------------------------------------------
// AUTOMATION START  (POST /api/automation/start)
// Opens a license-gated automation session. This is the first gate a cracked
// extension hits: no valid license -> no session -> no session key -> the
// puppet can never fetch a single step. The valuable flow logic is never sent
// here; only a session handle + the ephemeral key needed to decrypt steps.
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

const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface StartBody {
  licenseKey?: string
  hardwareFingerprint?: string
  flowId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StartBody
    const licenseKey = (body.licenseKey || '').trim()
    const fp = (body.hardwareFingerprint || '').trim()
    const flowId = (body.flowId || '').trim()

    const flow = getFlow(flowId)
    if (!flow) {
      return json({ ok: false, reason: 'UNKNOWN_FLOW', message: 'Unknown flow.' }, 400)
    }

    // 1) Authoritative license check.
    const guard = await verifyLicense(licenseKey, fp)
    if (!guard.ok) {
      return json({ ok: false, reason: guard.reason, message: guard.message }, 403)
    }

    // 2) Optional plan gate.
    if (flow.minPlan && guard.planName.toLowerCase() !== flow.minPlan.toLowerCase()) {
      return json({ ok: false, reason: 'PLAN_REQUIRED', message: `${flow.minPlan} plan required.` }, 403)
    }

    // 3) Rate limit per license.
    if (await isRateLimited(guard.license.id)) {
      return json({ ok: false, reason: 'RATE_LIMITED', message: 'Too many sessions. Try again later.' }, 429)
    }

    // 4) Create the session with a fresh ephemeral key.
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null
    const sessionId = newId('as')
    const sessionKey = newSessionKey()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)

    await db.insert(automationSessions).values({
      id: sessionId,
      licenseId: guard.license.id,
      licenseKey: guard.license.licenseKey,
      hardwareFingerprint: fp,
      flowId: flow.id,
      sessionKey,
      cursor: 0,
      totalSteps: flow.steps.length,
      status: 'active',
      stepCount: 0,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || null,
      createdAt: now,
      expiresAt,
    })

    return json({
      ok: true,
      sessionId,
      sessionKey, // returned once, over HTTPS; client keeps it in memory only
      flowId: flow.id,
      title: flow.title,
      totalSteps: flow.steps.length,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('[Automation Start Error]', error)
    return json({ ok: false, reason: 'SERVER_ERROR', message: 'Server error.' }, 500)
  }
}
