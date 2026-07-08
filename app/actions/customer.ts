'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { licenses, customers, licenseTiers, payments } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { grantTrialLicense, getUserRole } from '@/lib/auth-helpers'
import { createCashfreeOrder, isCashfreeConfigured, cashfreeMode } from '@/lib/cashfree'
import { getBaseUrl } from '@/lib/base-url'

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

/**
 * Grants the one-time free 15-minute trial to the current user if they have
 * never had one. Safe to call repeatedly (idempotent). Used as a safety net on
 * dashboard load for accounts created before the signup hook, or if that hook
 * failed to fire.
 */
export async function claimTrialLicense() {
  const user = await getUser()
  const created = await grantTrialLicense(user.id, user.email)
  return { granted: Boolean(created) }
}

/** Whether the current user is an admin — used to show the admin link. */
export async function getIsAdmin() {
  const user = await getUser()
  return (await getUserRole(user.id)) === 'admin'
}

export async function getCustomerProfile() {
  const user = await getUser()
  const customerRecord = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, user.id))
    .limit(1)

  if (!customerRecord || customerRecord.length === 0) {
    // Create customer profile on first access
    const customerId = crypto.randomUUID()
    const newCustomer = {
      id: customerId,
      userId: user.id,
      email: user.email,
      companyName: '',
      phone: '',
      country: '',
      city: '',
      taxId: '',
      totalSpent: '0',
      licenseCount: 0,
      isActive: true,
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.insert(customers).values(newCustomer as any)
    return newCustomer
  }

  return customerRecord[0]
}

export async function updateCustomerProfile(data: {
  companyName?: string
  phone?: string
  country?: string
  city?: string
  taxId?: string
}) {
  const user = await getUser()
  const customer = await getCustomerProfile()

  await db
    .update(customers)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customer.id))

  return { ...customer, ...data }
}

export async function getMyLicenses() {
  const user = await getUser()
  const customer = await getCustomerProfile()

  return db
    .select()
    .from(licenses)
    .where(eq(licenses.userId, user.id))
    .orderBy(desc(licenses.createdAt))
}

export async function getMyPayments() {
  const user = await getUser()
  const customer = await getCustomerProfile()

  return db
    .select()
    .from(payments)
    .where(eq(payments.customerId, customer.id))
    .orderBy(desc(payments.createdAt))
}

export async function getLicenseDetails(licenseId: string) {
  const user = await getUser()
  const licenseRecord = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1)

  if (!licenseRecord || licenseRecord.length === 0) {
    throw new Error('License not found')
  }

  const license = licenseRecord[0]
  if (license.userId !== user.id) {
    throw new Error('Unauthorized')
  }

  return license
}

export async function getAvailableTiers() {
  return db
    .select()
    .from(licenseTiers)
    .where(eq(licenseTiers.isActive, true))
    .orderBy(licenseTiers.price)
}

/**
 * Creates a Cashfree order for the chosen tier and returns the
 * payment_session_id the client SDK needs to open hosted checkout. The DB
 * payment row (status='pending') uses the Cashfree order_id as its primary key
 * so the webhook / return page can look it up and issue the license.
 *
 * Cashfree domestic settlement is in INR, so the order is charged in INR
 * regardless of the tier's display currency.
 */
export async function initiatePayment(tierId: string) {
  const user = await getUser()
  const customer = await getCustomerProfile()

  if (!isCashfreeConfigured()) {
    throw new Error(
      'Online payments are not configured yet. Please add your Cashfree API keys.'
    )
  }

  // Get tier info
  const tierRecord = await db
    .select()
    .from(licenseTiers)
    .where(eq(licenseTiers.id, tierId))
    .limit(1)

  if (!tierRecord || tierRecord.length === 0) {
    throw new Error('Tier not found')
  }

  const tier = tierRecord[0]

  // Cashfree order_id doubles as our payment primary key.
  const orderId = `LIORD-${crypto.randomBytes(8).toString('hex')}`
  const chargeCurrency = 'INR'

  await db.insert(payments).values({
    id: orderId,
    customerId: customer.id,
    tierId,
    amount: tier.price,
    currency: chargeCurrency,
    paymentGateway: 'cashfree',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any)

  const baseUrl = await getBaseUrl()
  const order = await createCashfreeOrder({
    orderId,
    amount: Number(tier.price),
    currency: chargeCurrency,
    customerId: customer.id,
    customerEmail: customer.email || user.email,
    customerPhone: customer.phone || '',
    returnUrl: `${baseUrl}/shop/checkout/return`,
  })

  return {
    orderId,
    paymentSessionId: order.paymentSessionId,
    mode: cashfreeMode(),
    amount: tier.price,
    currency: chargeCurrency,
    tier: { id: tier.id, name: tier.displayName },
  }
}

/**
 * Verifies a Cashfree order server-side and, if paid, issues the license.
 * Called from the checkout return page. Idempotent.
 */
export async function verifyAndFulfillOrder(orderId: string) {
  const user = await getUser()
  const customer = await getCustomerProfile()

  // Ensure the order belongs to this customer.
  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.id, orderId))
    .limit(1)
  if (!paymentRows.length || paymentRows[0].customerId !== customer.id) {
    throw new Error('Order not found')
  }

  const { getCashfreeOrderStatus } = await import('@/lib/cashfree')
  const status = await getCashfreeOrderStatus(orderId)

  if (!status.isPaid) {
    return { paid: false as const, status: status.orderStatus }
  }

  const { issueLicenseForPayment } = await import('@/lib/licensing')
  const license = await issueLicenseForPayment(orderId)
  return {
    paid: true as const,
    status: status.orderStatus,
    licenseKey: license.licenseKey,
    licenseId: license.id,
  }
}
