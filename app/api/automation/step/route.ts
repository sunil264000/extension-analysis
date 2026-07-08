import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { automationSessions, automationEvents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getFlow, resolveEndpoint } from '@/lib/automation/flows'
import { verifyLicense } from '@/lib/automation/guard'
import { encryptForSession, newId } from '@/lib/automation/session'
import type { StepAction } from '@/lib/automation/instruction-set'

// ---------------------------------------------------------------------------
// AUTOMATION STEP  (POST /api/automation/step)
// Returns the NEXT declarative action, encrypted with the session key. The
// license is re-verified on EVERY step, so a license revoked mid-run (kill
// switch) stops the puppet immediately. Steps must be requested in order — the
// server enforces the cursor, so an attacker cannot jump ahead or replay.
// The response is DATA describing an action, never executable code.
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

interface StepBody {
  sessionId?: string
  licenseKey?: string
  hardwareFingerprint?: string
  // Values the puppet is allowed to feed into resolvable refs (e.g. the user's
  // typed prompt, the live projectId it read from the DOM).
  ctx?: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StepBody
    const sessionId = (body.sessionId || '').trim()
    const licenseKey = (body.licenseKey || '').trim()
    const fp = (body.hardwareFingerprint || '').trim()
    const ctx = body.ctx && typeof body.ctx === 'object' ? body.ctx : {}

    if (!sessionId) {
      return json({ ok: false, reason: 'NO_SESSION', message: 'Missing session.' }, 400)
    }

    // 1) Re-verify the license on every step (catches mid-run revocation).
    const guard = await verifyLicense(licenseKey, fp)
    if (!guard.ok) {
      // Best-effort: mark the session aborted so it can't continue.
      await db
        .update(automationSessions)
        .set({ status: 'aborted' })
        .where(eq(automationSessions.id, sessionId))
      return json({ ok: false, reason: guard.reason, message: guard.message }, 403)
    }

    // 2) Load and validate the session.
    const rows = await db
      .select()
      .from(automationSessions)
      .where(eq(automationSessions.id, sessionId))
      .limit(1)
    if (!rows.length) {
      return json({ ok: false, reason: 'BAD_SESSION', message: 'Session not found.' }, 404)
    }
    const sessionRow = rows[0]

    if (sessionRow.status !== 'active') {
      return json({ ok: false, reason: 'SESSION_' + sessionRow.status.toUpperCase(), message: 'Session is not active.' }, 409)
    }
    if (new Date() > new Date(sessionRow.expiresAt)) {
      await db.update(automationSessions).set({ status: 'expired' }).where(eq(automationSessions.id, sessionId))
      return json({ ok: false, reason: 'SESSION_EXPIRED', message: 'Session expired.' }, 409)
    }
    // Session must belong to this exact license + device.
    if (sessionRow.licenseKey !== guard.license.licenseKey || sessionRow.hardwareFingerprint !== fp) {
      return json({ ok: false, reason: 'SESSION_MISMATCH', message: 'Session does not match device.' }, 403)
    }

    // 3) Resolve the current step from the server-held flow.
    const flow = getFlow(sessionRow.flowId)
    if (!flow) {
      return json({ ok: false, reason: 'UNKNOWN_FLOW', message: 'Flow missing.' }, 500)
    }
    const cursor = sessionRow.cursor
    if (cursor >= flow.steps.length) {
      await db.update(automationSessions).set({ status: 'done' }).where(eq(automationSessions.id, sessionId))
      const donePacket: StepAction = { step: cursor, action: 'done' }
      return json({
        ok: true,
        done: true,
        packet: encryptForSession(sessionRow.sessionKey, donePacket),
      })
    }

    // Clone the step and resolve server-side refs (endpoints) so raw endpoint
    // templates never ship in the extension.
    const raw = flow.steps[cursor]
    const step: StepAction = { ...raw }
    if (step.action === 'callApi' && step.endpointRef) {
      const url = resolveEndpoint(step.endpointRef, { ...ctx })
      if (url) {
        // Deliver the concrete URL under a neutral field the puppet reads.
        ;(step as StepAction & { url?: string }).url = url
      }
      delete (step as Partial<StepAction>).endpointRef
    }

    // 4) Advance the cursor and audit.
    const now = new Date()
    await db
      .update(automationSessions)
      .set({ cursor: cursor + 1, stepCount: sessionRow.stepCount + 1, lastStepAt: now })
      .where(eq(automationSessions.id, sessionId))

    await db.insert(automationEvents).values({
      id: newId('ae'),
      sessionId,
      licenseId: guard.license.id,
      flowId: flow.id,
      step: cursor,
      action: step.action,
      createdAt: now,
    })

    const isLast = cursor + 1 >= flow.steps.length
    return json({
      ok: true,
      done: false,
      step: cursor,
      isLast,
      // Encrypted declarative action; decrypt with the session key in memory.
      packet: encryptForSession(sessionRow.sessionKey, step),
    })
  } catch (error) {
    console.error('[Automation Step Error]', error)
    return json({ ok: false, reason: 'SERVER_ERROR', message: 'Server error.' }, 500)
  }
}
