import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { payments, licenses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

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

// Generate license key
function generateLicenseKey(): string {
  const segments = [
    crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomBytes(2).toString('hex').toUpperCase(),
    crypto.randomBytes(2).toString('hex').toUpperCase(),
    crypto.randomBytes(2).toString('hex').toUpperCase(),
  ]
  return `LI-${segments.join('-')}`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload: CashfreeWebhookPayload = await request.json()

    console.log('[Cashfree Webhook] Received event:', payload.event)

    // Only process payment success events
    if (payload.event !== 'PAYMENT_SUCCESS_WEBHOOK') {
      return NextResponse.json({
        success: false,
        message: 'Event not processed',
      })
    }

    const { order, payment } = payload.data

    // Find payment by transaction ID
    const paymentRecord = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, order.order_id))
      .limit(1)

    if (!paymentRecord || paymentRecord.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Payment not found',
        },
        { status: 404 }
      )
    }

    const paymentData = paymentRecord[0]

    // Update payment status
    await db
      .update(payments)
      .set({
        status: 'completed',
        paymentGateway: 'cashfree',
        transactionId: payment?.payment_id || order.order_id,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentData.id))

    // Generate license for this payment
    const licenseKey = generateLicenseKey()
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 30) // Default 30 days

    const licenseId = crypto.randomUUID()
    const newLicense = {
      id: licenseId,
      licenseKey,
      tierId: paymentData.tierId,
      customerId: paymentData.customerId,
      userId: paymentData.customerId,
      status: 'active',
      expiresAt: expiryDate,
      issuedAt: new Date(),
      seatsUsed: 0,
      usageCount: 0,
    }

    await db.insert(licenses).values(newLicense as any)

    // Update payment with license ID
    await db
      .update(payments)
      .set({ licenseId })
      .where(eq(payments.id, paymentData.id))

    console.log('[Cashfree Webhook] License generated:', licenseKey)

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      licenseKey,
    })
  } catch (error) {
    console.error('[Cashfree Webhook Error]', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Webhook processing failed',
        error: String(error),
      },
      { status: 500 }
    )
  }
}
