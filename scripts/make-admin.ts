import { db } from '@/lib/db'
import { user as userTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Script to promote a user to admin role
 * Usage: npx tsx scripts/make-admin.ts <email>
 */

async function makeAdmin(email: string) {
  console.log(`[v0] Making ${email} an admin...`)

  try {
    // Find user by email
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1)

    if (!users || users.length === 0) {
      console.error(`[v0] User with email ${email} not found`)
      process.exit(1)
    }

    const userData = users[0]
    console.log(`[v0] Found user: ${userData.name} (${userData.email})`)
    console.log(`[v0] Current role: ${userData.role}`)

    // Update role to admin
    await db
      .update(userTable)
      .set({ role: 'admin', updatedAt: new Date() })
      .where(eq(userTable.id, userData.id))

    console.log(`[v0] ✅ Successfully promoted ${email} to admin`)
    process.exit(0)
  } catch (error) {
    console.error(`[v0] Error:`, error)
    process.exit(1)
  }
}

// Get email from command line argument
const email = process.argv[2]
if (!email) {
  console.error('Usage: npx tsx scripts/make-admin.ts <email>')
  process.exit(1)
}

makeAdmin(email)
