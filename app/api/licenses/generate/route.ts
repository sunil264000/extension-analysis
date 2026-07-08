import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { licenses, payments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

interface GenerateRequest {
  transactionId: string
  customerId: string
  tierId: string
}

interface GenerateResponse {
  success: boolean
  licenseKey?: string
  message: string
  error?: string
}

// Generate unique license key in format: LI-XXXXXXXX-XXXX-XXXX-XXXX
function generateLicenseKey(): string {
  const segments = [
    crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomBytes(2).toString('hex').toUpperCase(),
    crypto.randomBytes(2).toString('hex').toUpperCase(),
    crypto.randomBytes(2).toString('hex').toUpperCase(),
  ]
  return `LI-${segments.join('-')}`
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponse>> {
  try {
    const body: GenerateRequest = await request.json()
    const { transactionId, customerId, tierId } = body

    if (!transactionId || !customerId || !tierId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: transactionId, customerId, tierId',
          error: 'INVALID_REQUEST',
        },
        { status: 400 }
      )
    }

    // Verify payment exists and is completed
    const paymentRecord = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, transactionId))
      .limit(1)

    if (!paymentRecord || paymentRecord.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Payment not found',
          error: 'PAYMENT_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    const payment = paymentRecord[0]

    if (payment.status !== 'completed' && payment.status !== 'success') {
      return NextResponse.json(
        {
          success: false,
          message: `Payment status is ${payment.status}, expected completed or success`,
          error: 'PAYMENT_NOT_COMPLETED',
        },
        { status: 403 }
      )
    }

    // Check if license already generated for this payment
    if (payment.licenseId) {
      const existingLicense = await db
        .select()
        .from(licenses)
        .where(eq(licenses.id, payment.licenseId))
        .limit(1)

      if (existingLicense && existingLicense.length > 0) {
        return NextResponse.json({
          success: true,
          licenseKey: existingLicense[0].licenseKey,
          message: 'License already generated for this payment',
        })
      }
    }

    // Generate new license key
    const licenseKey = generateLicenseKey()

    // Calculate expiry date based on tier duration
    const expiryDate = new Date()
    const tierDuration = 30 // Default 30 days - in production, fetch from tier config
    expiryDate.setDate(expiryDate.getDate() + tierDuration)

    // Create license
    const licenseId = crypto.randomUUID()
    const userId = payment.customerId // Using customerId as userId for now

    await db.insert(licenses).values({
      id: licenseId,
      licenseKey,
      tierId,
      customerId: payment.customerId,
      userId,
      status: 'active',
      expiresAt: expiryDate,
      issuedAt: new Date(),
      seatsUsed: 0,
      usageCount: 0,
    })

    // Update payment with license ID
    await db
      .update(payments)
      .set({ licenseId, status: 'completed' })
      .where(eq(payments.id, payment.id))

    return NextResponse.json({
      success: true,
      licenseKey,
      message: 'License generated successfully',
    })
  } catch (error) {
    console.error('[License Generation Error]', error)
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
