import { db } from '@/lib/db'
import { licenses, licenseTiers, customers, payments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

function generateLicenseKey(): string {
  const seg = (n: number) => crypto.randomBytes(n).toString('hex').toUpperCase()
  return `LI-${seg(4)}-${seg(2)}-${seg(2)}-${seg(2)}`
}

/**
 * Issues a license for a PAID payment. Idempotent: if the payment already has a
 * license, it returns that instead of creating a duplicate. Called from both the
 * Cashfree webhook and the checkout return page, so double-calls are expected.
 */
export async function issueLicenseForPayment(paymentId: string) {
  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1)

  if (!paymentRows.length) throw new Error('Payment not found')
  const payment = paymentRows[0]

  // Already fulfilled -> return the existing license (idempotency).
  if (payment.status === 'completed' && payment.licenseId) {
    const existing = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, payment.licenseId))
      .limit(1)
    if (existing.length) return existing[0]
  }

  const tierRows = await db
    .select()
    .from(licenseTiers)
    .where(eq(licenseTiers.id, payment.tierId))
    .limit(1)
  if (!tierRows.length) throw new Error('Tier not found')
  const tier = tierRows[0]

  const customerRows = await db
    .select()
    .from(customers)
    .where(eq(customers.id, payment.customerId))
    .limit(1)
  if (!customerRows.length) throw new Error('Customer not found')
  const customer = customerRows[0]

  // Create the license.
  const licenseId = crypto.randomUUID()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + tier.durationDays * 24 * 60 * 60 * 1000)
  const licenseKey = generateLicenseKey()

  await db.insert(licenses).values({
    id: licenseId,
    licenseKey,
    tierId: tier.id,
    customerId: customer.id,
    userId: customer.userId,
    status: 'active',
    expiresAt,
    issuedAt: now,
    hardwareFingerprints: [],
    seatsUsed: 0,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  })

  // Mark payment completed and link the license.
  await db
    .update(payments)
    .set({ status: 'completed', licenseId, updatedAt: now })
    .where(eq(payments.id, payment.id))

  // Update customer aggregates.
  const newTotal = (Number(customer.totalSpent) + Number(payment.amount)).toFixed(2)
  await db
    .update(customers)
    .set({
      totalSpent: newTotal,
      licenseCount: customer.licenseCount + 1,
      updatedAt: now,
    })
    .where(eq(customers.id, customer.id))

  const created = await db.select().from(licenses).where(eq(licenses.id, licenseId)).limit(1)
  return created[0]
}
