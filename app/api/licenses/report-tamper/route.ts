import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { licenses, promptEvents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// TAMPER REPORT + KILL SWITCH
// The extension's client-side tripwires call this when they detect that the
// security scripts were removed/edited, the manifest was altered, or the
// integrity self-check failed. The server is authoritative and CANNOT be
// edited by the attacker, so this is where enforcement actually bites:
//   - the offending license is immediately REVOKED (status='revoked')
//   - a flagged prompt_event is written so it shows in the admin usage log
// A revoked license never passes /validate again, so every copy of that key
// (including the tampered one and any resold copies) stops working on its
// next heartbeat.
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

interface TamperReport {
  licenseKey?: string
  hardwareFingerprint?: string
  reason?: string
  detail?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TamperReport
    const licenseKey = (body.licenseKey || '').trim()
    const reason = (body.reason || 'UNKNOWN').slice(0, 120)
    const detail = (body.detail || '').slice(0, 500)
    const fp = (body.hardwareFingerprint || '').slice(0, 200)

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null

    if (!licenseKey) {
      // Still record the event so we can see anonymous tamper attempts.
      await db.insert(promptEvents).values({
        id: crypto.randomUUID(),
        userId: 'unknown',
        licenseKey: null,
        promptText: null,
        promptLength: 0,
        hardwareFingerprint: fp || null,
        ipAddress: ip,
        flagged: true,
        flagReason: `TAMPER:${reason} ${detail}`.trim(),
      } as any)
      return json({ ok: true, revoked: false })
    }

    const rows = await db
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKey, licenseKey))
      .limit(1)

    if (rows.length > 0) {
      const lic = rows[0]
      
      // SAFETY CHECK: Only revoke for certain reasons (actual tampering detected)
      // Don't revoke for loading timing issues like 'NO_CORE', 'CORE_MISSING', 'ACTIVATION_MISSING'
      const SAFE_REVOKE_REASONS = ['CORE_PATCHED', 'PUBKEY_TAMPERED', 'MANIFEST_MODIFIED']
      const shouldRevoke = SAFE_REVOKE_REASONS.includes(reason)
      
      if (shouldRevoke) {
        console.log('[v0:tamper] REVOKING license:', { licenseKey, reason, detail })
        // Kill switch: revoke the license so it can never validate again.
        await db
          .update(licenses)
          .set({ status: 'revoked' })
          .where(eq(licenses.id, lic.id))
      } else {
        console.log('[v0:tamper] NOT revoking (safe reason):', { licenseKey, reason, detail })
      }

      const revoked = SAFE_REVOKE_REASONS.includes(reason)
      
      await db.insert(promptEvents).values({
        id: crypto.randomUUID(),
        licenseId: lic.id,
        userId: lic.userId,
        licenseKey: lic.licenseKey,
        promptText: null,
        promptLength: 0,
        hardwareFingerprint: fp || null,
        ipAddress: ip,
        flagged: true,
        flagReason: revoked ? `TAMPER→REVOKED:${reason} ${detail}`.trim() : `TAMPER→LOGGED:${reason} ${detail}`.trim(),
      } as any)

      return json({ ok: true, revoked })
    }

    return json({ ok: true, revoked: false })
  } catch (error) {
    console.error('[Tamper Report Error]', error)
    return json({ ok: false, error: 'SERVER_ERROR' }, 500)
  }
}
