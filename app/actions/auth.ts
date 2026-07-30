'use server'

import crypto from 'crypto'
import { db } from '@/lib/db'
import { verification } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const PASSWORD_RESET_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Send a password reset email to the user
 */
export async function sendPasswordResetEmail(email: string) {
  try {
    // Check if user exists
    const user = await auth.api.findUserByEmail({ email })
    if (!user) {
      // Don't reveal if email exists for security
      return
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Store reset token in verification table
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY)

    await db
      .insert(verification)
      .values({
        id: crypto.randomUUID(),
        identifier: `password-reset:${email}`,
        value: resetTokenHash,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [verification.identifier],
        set: {
          value: resetTokenHash,
          expiresAt,
          updatedAt: new Date(),
        },
      })

    // In production, send email here with reset link
    // For now, log the token
    const resetLink = `${process.env.BETTER_AUTH_URL || 'https://v0-unlimited-lovable.vercel.app'}/reset-password?token=${resetToken}`
    console.log('[v0] Password reset link:', resetLink)

    // TODO: Send email via sendgrid/resend/etc
    // await sendResetEmail(email, resetLink)

    return { success: true }
  } catch (error) {
    console.error('[v0] Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }
}

/**
 * Reset password with valid token
 */
export async function resetPassword(token: string, newPassword: string) {
  try {
    if (!token || newPassword.length < 8) {
      throw new Error('Invalid token or password')
    }

    // Hash the token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Find verification record
    const records = await db
      .select()
      .from(verification)
      .where(eq(verification.value, tokenHash))
      .limit(1)

    if (!records || records.length === 0) {
      throw new Error('Invalid or expired reset token')
    }

    const record = records[0]

    // Check if token is expired
    if (new Date() > new Date(record.expiresAt)) {
      throw new Error('Reset link has expired')
    }

    // Extract email from identifier
    const email = record.identifier.replace('password-reset:', '')

    // Update user password via Better Auth
    const user = await auth.api.findUserByEmail({ email })
    if (!user) {
      throw new Error('User not found')
    }

    // Update password using Better Auth
    await auth.api.updatePassword({
      newPassword,
      userId: user.id,
    })

    // Delete used verification token
    await db.delete(verification).where(eq(verification.id, record.id))

    return { success: true }
  } catch (error) {
    console.error('[v0] Failed to reset password:', error)
    throw error instanceof Error ? error : new Error('Failed to reset password')
  }
}
