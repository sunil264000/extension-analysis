import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getCashfreeOrderStatus } from '@/lib/cashfree'
import { issueLicenseForPayment } from '@/lib/licensing'

/**
 * Cashfree payment webhook. This is the reliable fulfillment path: Cashfree
 * POSTs here when a payment succeeds. We verify the signature, then re-check the
 * order status server-side before issuing the license (idempotent).
 *
 * Signature: base64(HMAC-SHA256(timestamp + rawBody, secretKey))
 * sent in the `x-webhook-signature` header with `x-webhook-timestamp`.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-webhook-signature')
    const timestamp = request.headers.get('x-webhook-timestamp')
    const secret = process.env.CASHFREE_SECRET_KEY

    if (secret && signature && timestamp) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(timestamp + rawBody)
        .digest('base64')
      if (expected !== signature) {
        console.error('[Cashfree Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody || '{}')
    const orderId =
      payload?.data?.order?.order_id ||
      payload?.data?.order_id ||
      payload?.order?.order_id

    if (!orderId) {
      return NextResponse.json({ received: true, note: 'no order id' })
    }

    // Re-verify with Cashfree before fulfilling (never trust the body alone).
    const status = await getCashfreeOrderStatus(orderId)
    if (status.isPaid) {
      await issueLicenseForPayment(orderId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Cashfree Webhook] Error:', error)
    // Return 200 so Cashfree doesn't hammer retries on our parse errors; we log.
    return NextResponse.json({ received: true, error: 'handler error' })
  }
}
