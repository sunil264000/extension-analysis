import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { user as userTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Admin Promotion Endpoint
 * POST /api/admin/promote-admin
 * Body: { email: "user@example.com" }
 * 
 * This endpoint promotes a user to admin role.
 * Should only be called with proper authorization.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email: string }
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    console.log(`[v0:promote-admin] Promoting ${email} to admin...`)

    // Find user by email
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1)

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: `User with email ${email} not found` },
        { status: 404 }
      )
    }

    const userData = users[0]
    console.log(`[v0:promote-admin] Found user: ${userData.name} (${userData.email})`)

    // Check if already admin
    if (userData.role === 'admin') {
      return NextResponse.json(
        { 
          message: 'User is already an admin',
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
          }
        },
        { status: 200 }
      )
    }

    // Update role to admin
    await db
      .update(userTable)
      .set({ role: 'admin', updatedAt: new Date() })
      .where(eq(userTable.id, userData.id))

    console.log(`[v0:promote-admin] ✅ Successfully promoted ${email} to admin`)

    return NextResponse.json(
      {
        message: 'User promoted to admin successfully',
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: 'admin',
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0:promote-admin] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}
