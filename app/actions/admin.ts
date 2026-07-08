'use server'

import { db } from '@/lib/db'
import {
  licenses,
  licenseTiers,
  customers,
  payments,
  usageTracking,
} from '@/lib/db/schema'
import { eq, desc, and, gte, lte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import { requireAdmin } from '@/lib/auth-helpers'

// Every admin action requires the admin role.
const getUser = requireAdmin

// License Tiers
export async function createLicenseTier(data: {
  name: string
  displayName: string
  price: string
  maxSeats: number
  maxUsageLimit?: number
  durationDays: number
  features: string[]
  description?: string
}) {
  await getUser()

  const tierData = {
    id: crypto.randomUUID(),
    name: data.name,
    displayName: data.displayName,
    price: data.price,
    currency: 'INR',
    maxSeats: data.maxSeats,
    maxUsageLimit: data.maxUsageLimit || null,
    durationDays: data.durationDays,
    features: data.features,
    description: data.description || '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(licenseTiers).values(tierData as any)
  revalidatePath('/admin/tiers')
  return tierData
}

export async function getLicenseTiers() {
  await getUser()
  return db.select().from(licenseTiers).orderBy(desc(licenseTiers.price))
}

// Licenses Management
export async function getAllLicenses() {
  await getUser()
  return db
    .select()
    .from(licenses)
    .orderBy(desc(licenses.createdAt))
}

export async function getLicenseById(id: string) {
  await getUser()
  const result = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, id))
    .limit(1)
  return result[0]
}

export async function updateLicenseStatus(licenseId: string, status: string) {
  await getUser()
  await db
    .update(licenses)
    .set({ status, updatedAt: new Date() })
    .where(eq(licenses.id, licenseId))
  revalidatePath('/admin/licenses')
}

// Customers
export async function getAllCustomers() {
  await getUser()
  return db
    .select()
    .from(customers)
    .orderBy(desc(customers.createdAt))
}

export async function getCustomerStats() {
  await getUser()
  const customerList = await db.select().from(customers)
  const licenseList = await db.select().from(licenses)
  const paymentList = await db.select().from(payments)

  return {
    totalCustomers: customerList.length,
    totalLicenses: licenseList.length,
    totalRevenue: paymentList.reduce(
      (sum, p) => sum + (p.status === 'completed' ? parseFloat(p.amount.toString()) : 0),
      0
    ),
    activeCustomers: customerList.filter((c) => c.isActive).length,
  }
}

// Payments
export async function getAllPayments() {
  await getUser()
  return db
    .select()
    .from(payments)
    .orderBy(desc(payments.createdAt))
}

export async function getPaymentsByDateRange(startDate: Date, endDate: Date) {
  await getUser()
  return db
    .select()
    .from(payments)
    .where(
      and(
        gte(payments.createdAt, startDate),
        lte(payments.createdAt, endDate),
        eq(payments.status, 'completed')
      )
    )
    .orderBy(desc(payments.createdAt))
}

// Usage Analytics
export async function getLicenseUsageStats(licenseId: string) {
  await getUser()
  const usageData = await db
    .select()
    .from(usageTracking)
    .where(eq(usageTracking.licenseId, licenseId))
    .orderBy(desc(usageTracking.date))

  const licenseData = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1)

  if (!licenseData.length) throw new Error('License not found')

  const total = usageData.reduce((sum, u) => sum + u.usageCount, 0)
  const average =
    usageData.length > 0 ? Math.round(total / usageData.length) : 0

  return {
    license: licenseData[0],
    usageData,
    totalUsage: total,
    averageDailyUsage: average,
    daysTracked: usageData.length,
  }
}

export async function getRevenueStats() {
  await getUser()
  const paymentData = await db
    .select()
    .from(payments)
    .where(eq(payments.status, 'completed'))
    .orderBy(desc(payments.createdAt))

  // Group by month
  const monthlyRevenue: { [key: string]: number } = {}
  paymentData.forEach((payment) => {
    const date = new Date(payment.createdAt)
    const monthKey = date.toISOString().substring(0, 7) // YYYY-MM
    if (!monthlyRevenue[monthKey]) monthlyRevenue[monthKey] = 0
    monthlyRevenue[monthKey] += parseFloat(payment.amount.toString())
  })

  return {
    totalRevenue: Object.values(monthlyRevenue).reduce((a, b) => a + b, 0),
    monthlyRevenue,
    transactionCount: paymentData.length,
  }
}

// Manual License Creation (for admin)
export async function createManualLicense(data: {
  customerId: string
  tierId: string
  durationDays: number
}) {
  await getUser()

  const licenseKey = `LI-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}`

  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + data.durationDays)

  const licenseId = crypto.randomUUID()
  const license = {
    id: licenseId,
    licenseKey,
    tierId: data.tierId,
    customerId: data.customerId,
    userId: data.customerId,
    status: 'active',
    expiresAt: expiryDate,
    issuedAt: new Date(),
    seatsUsed: 0,
    usageCount: 0,
  }

  await db.insert(licenses).values(license as any)
  revalidatePath('/admin/licenses')
  return license
}
