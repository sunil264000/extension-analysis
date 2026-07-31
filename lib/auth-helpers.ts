import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user as userTable, customers, licenses } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { headers } from 'next/headers'
import crypto from 'crypto'

export const TRIAL_TIER_ID = 'trial-15min'
export const TRIAL_DURATION_MINUTES = 15

/** Returns the current session user or throws. */
export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

/** Returns the current session user, or null if not signed in. */
export async function getOptionalUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

/** Looks up the DB role for a user id. */
export async function getUserRole(userId: string): Promise<string> {
  const rows = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)
  return rows[0]?.role ?? 'user'
}

/** Throws unless the current user has the admin role. */
export async function requireAdmin() {
  const u = await getUser()
  const role = await getUserRole(u.id)
  if (role !== 'admin') throw new Error('Forbidden: admin access required')
  return u
}

/** True if the current user is an admin (never throws for auth). */
export async function isAdmin(): Promise<boolean> {
  const u = await getOptionalUser()
  if (!u) return false
  return (await getUserRole(u.id)) === 'admin'
}

function generateLicenseKey(): string {
  const seg = (n: number) => crypto.randomBytes(n).toString('hex').toUpperCase()
  return `LI-${seg(4)}-${seg(2)}-${seg(2)}-${seg(2)}`
}

/**
 * Ensures a customer profile exists for the user, returning its id.
 */
export async function ensureCustomer(userId: string, email: string): Promise<string> {
  const existing = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1)
  if (existing[0]) return existing[0].id

  const customerId = crypto.randomUUID()
  await db.insert(customers).values({
    id: customerId,
    userId,
    email,
    totalSpent: '0',
    licenseCount: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any)
  return customerId
}

/**
 * Grants a one-time free 15-minute trial license to a user.
 * Idempotent: if the user already has (or had) a trial, it does nothing.
 * Returns the created license, or null if a trial already existed.
 */
export async function grantTrialLicense(userId: string, email: string) {
  // Only one trial per user, ever.
  const priorTrial = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(and(eq(licenses.userId, userId), eq(licenses.tierId, TRIAL_TIER_ID)))
    .limit(1)
  if (priorTrial[0]) return null

  const customerId = await ensureCustomer(userId, email)

  const now = new Date()
  const expiresAt = new Date(now.getTime() + TRIAL_DURATION_MINUTES * 60 * 1000)

  const license = {
    id: crypto.randomUUID(),
    licenseKey: generateLicenseKey(),
    tierId: TRIAL_TIER_ID,
    customerId,
    userId,
    status: 'active',
    expiresAt,
    issuedAt: now,
    seatsUsed: 0,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(licenses).values(license as any)
  return license
}
