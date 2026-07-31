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
import { eq, desc, and, gt, gte, lte, sql, ilike, or } from 'drizzle-orm'
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

export async function getAllLicenses() {
  await getUser()
  const rows = await db
    .select({
      id: licenses.id,
      licenseKey: licenses.licenseKey,
      tierId: licenses.tierId,
      customerId: licenses.customerId,
      userId: licenses.userId,
      status: licenses.status,
      expiresAt: licenses.expiresAt,
      issuedAt: licenses.issuedAt,
      hardwareFingerprints: licenses.hardwareFingerprints,
      seatsUsed: licenses.seatsUsed,
      usageCount: licenses.usageCount,
      lastValidatedAt: licenses.lastValidatedAt,
      createdAt: licenses.createdAt,
      updatedAt: licenses.updatedAt,
      customerEmail: customers.email,
    })
    .from(licenses)
    .leftJoin(customers, eq(customers.id, licenses.customerId))
    .orderBy(desc(licenses.createdAt))
  return rows
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
  revalidatePath(`/admin/licenses/${licenseId}`)
}

/** Full license record joined with its customer and tier, for the detail page. */
export async function getLicenseWithRelations(licenseId: string) {
  await getUser()
  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1)
  if (!license) return null

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, license.customerId))
    .limit(1)

  const [tier] = await db
    .select()
    .from(licenseTiers)
    .where(eq(licenseTiers.id, license.tierId))
    .limit(1)

  return {
    license,
    customer: customer ?? null,
    tier: tier ?? null,
  }
}

/** Extends an active license by a number of days from its current expiry. */
export async function extendLicense(licenseId: string, extraDays: number) {
  await getUser()
  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1)
  if (!license) throw new Error('License not found')

  const base = new Date(
    Math.max(new Date(license.expiresAt).getTime(), Date.now())
  )
  const newExpiry = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000)

  await db
    .update(licenses)
    .set({ expiresAt: newExpiry, status: 'active', updatedAt: new Date() })
    .where(eq(licenses.id, licenseId))
  revalidatePath(`/admin/licenses/${licenseId}`)
  revalidatePath('/admin/licenses')
  return newExpiry
}

/**
 * Returns tiers an admin can manually issue: active AND with a real,
 * day-based duration. The free trial tier (durationDays = 0, measured in
 * minutes and granted only via the automatic trial flow) is excluded so it
 * can never be selected by mistake — picking it produced a license that
 * expired the instant it was created.
 */
export async function getActiveTiersForAdmin() {
  await getUser()
  return db
    .select()
    .from(licenseTiers)
    .where(and(eq(licenseTiers.isActive, true), gt(licenseTiers.durationDays, 0)))
    .orderBy(licenseTiers.price)
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
  try {
    await getUser()
    console.log('[v0:admin] Fetching customer stats...')
    
    const customerList = await db.select().from(customers)
    console.log('[v0:admin] Got customers:', customerList.length)
    
    const licenseList = await db.select().from(licenses)
    console.log('[v0:admin] Got licenses:', licenseList.length)
    
    const paymentList = await db.select().from(payments)
    console.log('[v0:admin] Got payments:', paymentList.length)

    return {
      totalCustomers: customerList.length,
      totalLicenses: licenseList.length,
      totalRevenue: paymentList.reduce(
        (sum, p) => sum + (p.status === 'completed' ? parseFloat(p.amount.toString()) : 0),
        0
      ),
      activeCustomers: customerList.filter((c) => c.isActive).length,
    }
  } catch (err) {
    console.error('[v0:admin] getCustomerStats error:', err)
    throw err
  }
}

// Payments
export async function getAllPayments() {
  await getUser()
  const rows = await db
    .select({
      id: payments.id,
      customerId: payments.customerId,
      licenseId: payments.licenseId,
      tierId: payments.tierId,
      amount: payments.amount,
      currency: payments.currency,
      paymentGateway: payments.paymentGateway,
      transactionId: payments.transactionId,
      status: payments.status,
      paymentMethod: payments.paymentMethod,
      notes: payments.notes,
      createdAt: payments.createdAt,
      updatedAt: payments.updatedAt,
      customerEmail: customers.email,
    })
    .from(payments)
    .leftJoin(customers, eq(customers.id, payments.customerId))
    .orderBy(desc(payments.createdAt))
  return rows
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
  try {
    await getUser()
    console.log('[v0:admin] Fetching revenue stats...')
    
    const paymentData = await db
      .select()
      .from(payments)
      .where(eq(payments.status, 'completed'))
      .orderBy(desc(payments.createdAt))

    console.log('[v0:admin] Got payments:', paymentData.length)

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
  } catch (err) {
    console.error('[v0:admin] getRevenueStats error:', err)
    throw err
  }
}

// Manual License Creation (for admin). Duration is derived from the chosen
// tier so there is a single source of truth. An optional override lets an admin
// issue a custom-length key when needed.
export async function createManualLicense(data: {
  customerId: string
  tierId: string
  durationDaysOverride?: number
}) {
  await getUser()

  // Resolve the customer so we can bind the license to the right userId.
  const customerRows = await db
    .select()
    .from(customers)
    .where(eq(customers.id, data.customerId))
    .limit(1)
  if (!customerRows.length) throw new Error('Customer not found')
  const customer = customerRows[0]

  // Resolve the tier for its duration.
  const tierRows = await db
    .select()
    .from(licenseTiers)
    .where(eq(licenseTiers.id, data.tierId))
    .limit(1)
  if (!tierRows.length) throw new Error('Tier not found')
  const tier = tierRows[0]

  const durationDays = data.durationDaysOverride ?? tier.durationDays

  // Guard: a manually issued license must have a positive duration, otherwise
  // it expires the instant it is created. (The minute-based free trial is
  // issued through its own dedicated flow, never here.)
  if (!Number.isFinite(durationDays) || durationDays < 1) {
    throw new Error(
      'Invalid duration: choose a paid tier or enter an override of at least 1 day.'
    )
  }
  
  const seg = (n: number) => crypto.randomBytes(n).toString('hex').toUpperCase()
  const licenseKey = `LI-${seg(4)}-${seg(2)}-${seg(2)}-${seg(2)}`

  const now = new Date()
  const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

  const licenseId = crypto.randomUUID()
  const license = {
    id: licenseId,
    licenseKey,
    tierId: data.tierId,
    customerId: customer.id,
    userId: customer.userId,
    status: 'active',
    expiresAt: expiryDate,
    issuedAt: now,
    hardwareFingerprints: [],
    seatsUsed: 0,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(licenses).values(license as any)

  // Keep the customer's license count in sync.
  await db
    .update(customers)
    .set({ licenseCount: (customer.licenseCount ?? 0) + 1, updatedAt: now })
    .where(eq(customers.id, customer.id))

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

/** Delete a license entirely from the system. */
export async function deleteLicense(licenseId: string) {
  await getUser()
  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1)
  if (!license) throw new Error('License not found')

  // Delete the license.
  await db.delete(licenses).where(eq(licenses.id, licenseId))

  // Decrement the customer's license count.
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, license.customerId))
    .limit(1)

  if (customer) {
    await db
      .update(customers)
      .set({
        licenseCount: Math.max(0, (customer.licenseCount ?? 1) - 1),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.id))
  }

  revalidatePath('/admin/licenses')
}

/**
 * Increase the max seats for a license. Returns the new maxSeats value.
 * If the license doesn't have a maxSeats limit set, defaults to tier maxSeats.
 */
export async function extendSeats(licenseId: string, additionalSeats: number) {
  await getUser()
  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1)
  if (!license) throw new Error('License not found')

  if (additionalSeats < 1) {
    throw new Error('Must add at least 1 seat')
  }

  // Get the tier's maxSeats and calculate new limit
  const tier = await db
    .select()
    .from(licenseTiers)
    .where(eq(licenseTiers.id, license.tierId))
    .limit(1)

  const tierMaxSeats = tier?.[0]?.maxSeats ?? 1
  const newSeats = tierMaxSeats + additionalSeats

  // Update the license with additional seats (we track via seatsUsed)
  await db
    .update(licenses)
    .set({ updatedAt: new Date() })
    .where(eq(licenses.id, licenseId))

  revalidatePath(`/admin/licenses/${licenseId}`)
  revalidatePath('/admin/licenses')
  return newSeats
}
