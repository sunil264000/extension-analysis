import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { payments, licenses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

interface RazorpayWebhookPayload {
  event: string
  payload: {
    order?: {
      entity: {
        id: string
        amount: number
        currency: string
        status: string
      }
    }
    payment?: {
      entity: {
        id: string
        order_id: string
        amount: number
        status: string
      }
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
    const payload: RazorpayWebhookPayload = await request.json()

    console.log('[Razorpay Webhook] Received event:', payload.event)

    // Only process payment authorized events (Razorpay specific)
    if (payload.event !== 'payment.authorized' && payload.event !== 'payment.captured') {
      return NextResponse.json({
        success: false,
        message: 'Event not processed',
      })
    }

    const payment = payload.payload.payment?.entity
    if (!payment || !payment.order_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid payload',
        },
        { status: 400 }
      )
    }

    // Find payment by transaction ID (Razorpay order_id)
    const paymentRecord = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, payment.order_id))
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
        paymentGateway: 'razorpay',
        transactionId: payment.id,
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

    console.log('[Razorpay Webhook] License generated:', licenseKey)

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      licenseKey,
    })
  } catch (error) {
    console.error('[Razorpay Webhook Error]', error)
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
