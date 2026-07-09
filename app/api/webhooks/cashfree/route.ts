import { NextRequest, NextResponse } from 'next/server'
import { issueLicenseForPayment } from '@/lib/licensing'
import { db } from '@/lib/db'
import { payments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface CashfreeWebhookPayload {
  event: string
  data: {
    order: {
      order_id: string
      order_amount: number
      order_currency: string
      order_status: string
    }
    payment?: {
      payment_id: string
      payment_status: string
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload: CashfreeWebhookPayload = await request.json()

    console.log('[v0] Cashfree webhook received:', { event: payload.event, orderId: payload.data.order.order_id })

    // Only process payment success events
    if (payload.event !== 'PAYMENT_SUCCESS_WEBHOOK') {
      console.log('[v0] Skipping non-success event:', payload.event)
      return NextResponse.json({ success: true, message: 'Event skipped' })
    }

    const { order, payment } = payload.data
    const orderId = order.order_id

    // Find payment by order ID (which is our payment record ID)
    const paymentRecords = await db
      .select()
      .from(payments)
      .where(eq(payments.id, orderId))
      .limit(1)

    if (!paymentRecords.length) {
      console.error('[v0] Payment record not found for order:', orderId)
      return NextResponse.json(
        { success: false, message: 'Payment record not found' },
        { status: 404 }
      )
    }

    const paymentRecord = paymentRecords[0]
    console.log('[v0] Payment found, issuing license for order:', orderId)

    // Use the centralized licensing logic which handles idempotency
    const license = await issueLicenseForPayment(orderId)

    // Store the transaction ID for records
    await db
      .update(payments)
      .set({
        transactionId: payment?.payment_id || orderId,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, orderId))

    console.log('[v0] Webhook completed successfully, license:', license.licenseKey)

    return NextResponse.json({
      success: true,
      message: 'Payment processed and license issued',
      licenseKey: license.licenseKey,
    })
  } catch (error) {
    console.error('[v0] Webhook processing failed:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Webhook processing failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
