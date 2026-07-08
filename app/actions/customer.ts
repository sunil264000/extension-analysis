'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { licenses, customers, licenseTiers, payments } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { headers } from 'next/headers'
import crypto from 'crypto'

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
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

export async function initiatePayment(tierId: string) {
  const user = await getUser()
  const customer = await getCustomerProfile()

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

  // Create payment record with pending status
  const paymentId = crypto.randomUUID()
  const payment = {
    id: paymentId,
    customerId: customer.id,
    tierId,
    amount: tier.price,
    currency: tier.currency,
    paymentGateway: 'pending',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(payments).values(payment as any)

  return {
    paymentId,
    amount: tier.price,
    currency: tier.currency,
    tier: {
      id: tier.id,
      name: tier.displayName,
    },
  }
}
