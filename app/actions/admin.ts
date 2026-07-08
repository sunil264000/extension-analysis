'use server'

import { db } from '@/lib/db'
import {
  licenses,
  licenseTiers,
  customers,
  payments,
  usageTracking,
  promptEvents,
} from '@/lib/db/schema'
import { eq, desc, and, gte, lte, sql, ilike, or } from 'drizzle-orm'
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

// ---------------------------------------------------------------------------
// Prompt monitoring & abuse detection
// ---------------------------------------------------------------------------

/** High-level prompt-usage overview across all users. */
export async function getPromptOverview() {
  await getUser()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      today: sql<number>`count(*) filter (where ${promptEvents.createdAt} >= ${startOfToday.toISOString()})::int`,
      flagged: sql<number>`count(*) filter (where ${promptEvents.flagged})::int`,
      users: sql<number>`count(distinct ${promptEvents.userId})::int`,
    })
    .from(promptEvents)

  // Prompts per day for the last 30 days.
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - 29)
  const rows = await db
    .select({
      day: sql<string>`to_char(${promptEvents.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(promptEvents)
    .where(gte(promptEvents.createdAt, since))
    .groupBy(sql`to_char(${promptEvents.createdAt}, 'YYYY-MM-DD')`)

  const byDay = new Map(rows.map((r) => [r.day, Number(r.count)]))
  const daily: { date: string; prompts: number }[] = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    daily.push({ date: key, prompts: byDay.get(key) ?? 0 })
  }

  return {
    totalPrompts: Number(totals?.total ?? 0),
    promptsToday: Number(totals?.today ?? 0),
    flaggedPrompts: Number(totals?.flagged ?? 0),
    activeUsers: Number(totals?.users ?? 0),
    daily,
  }
}

/**
 * Full prompt log with the customer email joined in. Supports search and a
 * flagged-only filter for abuse review.
 */
export async function getPromptEvents(opts?: {
  search?: string
  flaggedOnly?: boolean
  limit?: number
}) {
  await getUser()
  const limit = opts?.limit ?? 100

  const conditions = []
  if (opts?.flaggedOnly) conditions.push(eq(promptEvents.flagged, true))
  if (opts?.search) {
    const term = `%${opts.search}%`
    conditions.push(
      or(
        ilike(promptEvents.promptText, term),
        ilike(promptEvents.licenseKey, term),
        ilike(customers.email, term)
      )
    )
  }

  const rows = await db
    .select({
      id: promptEvents.id,
      userId: promptEvents.userId,
      email: customers.email,
      licenseKey: promptEvents.licenseKey,
      promptText: promptEvents.promptText,
      promptLength: promptEvents.promptLength,
      pageUrl: promptEvents.pageUrl,
      projectId: promptEvents.projectId,
      ipAddress: promptEvents.ipAddress,
      hardwareFingerprint: promptEvents.hardwareFingerprint,
      flagged: promptEvents.flagged,
      flagReason: promptEvents.flagReason,
      createdAt: promptEvents.createdAt,
    })
    .from(promptEvents)
    .leftJoin(customers, eq(customers.userId, promptEvents.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(promptEvents.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    ...r,
    createdAt: new Date(r.createdAt).toISOString(),
  }))
}

/** Manually flag or clear a prompt event during abuse review. */
export async function setPromptFlag(
  id: string,
  flagged: boolean,
  reason?: string
) {
  await getUser()
  await db
    .update(promptEvents)
    .set({ flagged, flagReason: flagged ? reason ?? 'Manually flagged' : null })
    .where(eq(promptEvents.id, id))
  revalidatePath('/admin/usage')
}
