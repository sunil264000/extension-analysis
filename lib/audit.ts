import { db } from '@/lib/db'
import { auditLogs, loginAttempts, accountLockouts } from '@/lib/db/schema'
import { eq, and, gt, isNull, desc } from 'drizzle-orm'
import crypto from 'crypto'

export interface AuditLogInput {
  userId: string
  action: string
  resource?: string
  resourceId?: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  status?: 'success' | 'failure'
  metadata?: Record<string, any>
}

/**
 * Log an audit event
 */
export async function logAudit(input: AuditLogInput) {
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      changes: input.changes ? JSON.stringify(input.changes) : null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: input.status || 'success',
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error('[v0] Failed to log audit event:', error)
  }
}

/**
 * Log a login attempt
 */
export async function logLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  reason?: string
) {
  try {
    await db.insert(loginAttempts).values({
      id: crypto.randomUUID(),
      email,
      success,
      ipAddress,
      userAgent,
      reason,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error('[v0] Failed to log login attempt:', error)
  }
}

/**
 * Check if user has too many failed login attempts (brute force protection)
 */
export async function checkFailedAttempts(email: string, threshold = 5, timeWindow = 15 * 60 * 1000) {
  const now = new Date()
  const since = new Date(now.getTime() - timeWindow)

  const recentAttempts = await db
    .select()
    .from(loginAttempts)
    .where(and(
      eq(loginAttempts.email, email),
      eq(loginAttempts.success, false),
      gt(loginAttempts.createdAt, since)
    ))

  return recentAttempts.length >= threshold
}

/**
 * Lock account due to suspicious activity
 */
export async function lockAccount(
  userId: string,
  email: string,
  reason: string,
  lockoutMinutes = 30
) {
  try {
    const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000)

    await db.insert(accountLockouts).values({
      id: crypto.randomUUID(),
      userId,
      email,
      reason,
      lockedUntil,
      createdAt: new Date(),
    })

    // Also log this action
    await logAudit({
      userId,
      action: 'account_locked',
      resource: 'user',
      resourceId: userId,
      status: 'success',
      metadata: { reason, lockedUntil: lockedUntil.toISOString() },
    })
  } catch (error) {
    console.error('[v0] Failed to lock account:', error)
  }
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: string) {
  const locks = await db
    .select()
    .from(accountLockouts)
    .where(and(
      eq(accountLockouts.userId, userId),
      isNull(accountLockouts.releasedAt)
    ))
    .orderBy((t) => t.lockedUntil)
    .limit(1)

  if (locks.length === 0) return false

  const lock = locks[0]
  const isStillLocked = new Date() < lock.lockedUntil

  // Auto-release if lockout period expired
  if (!isStillLocked) {
    await db
      .update(accountLockouts)
      .set({
        releasedAt: new Date(),
        releaseReason: 'auto_release',
      })
      .where(eq(accountLockouts.id, lock.id))
    return false
  }

  return true
}

/**
 * Manually unlock an account (admin action)
 */
export async function unlockAccount(userId: string, releaseReason = 'manual_unlock') {
  try {
    const locks = await db
      .select()
      .from(accountLockouts)
      .where(and(
        eq(accountLockouts.userId, userId),
        isNull(accountLockouts.releasedAt)
      ))

    for (const lock of locks) {
      await db
        .update(accountLockouts)
        .set({
          releasedAt: new Date(),
          releaseReason,
        })
        .where(eq(accountLockouts.id, lock.id))
    }

    await logAudit({
      userId,
      action: 'account_unlocked',
      resource: 'user',
      resourceId: userId,
      status: 'success',
      metadata: { releaseReason },
    })
  } catch (error) {
    console.error('[v0] Failed to unlock account:', error)
  }
}

/**
 * Get user activity history
 */
export async function getUserActivityHistory(userId: string, limit = 50) {
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
}
