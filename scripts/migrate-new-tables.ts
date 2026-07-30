import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

async function migrate() {
  console.log('🔄 Creating new tables for license diagnostics...')

  try {
    // Create authorization_failures table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS authorization_failures (
        id TEXT PRIMARY KEY,
        "licenseId" TEXT NOT NULL,
        "licenseKey" TEXT NOT NULL,
        "attemptedHwid" TEXT NOT NULL,
        "failureReason" TEXT NOT NULL,
        "boundDevices" TEXT[] DEFAULT '{}',
        ip TEXT,
        timezone TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `)

    // Create indexes for authorization_failures
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_auth_failures_licenseId ON authorization_failures("licenseId")`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_auth_failures_reason ON authorization_failures("failureReason")`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_auth_failures_createdAt ON authorization_failures("createdAt")`
    )

    console.log('✅ authorization_failures table created')

    // Create license_audit_trail table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS license_audit_trail (
        id TEXT PRIMARY KEY,
        "licenseId" TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip TEXT,
        timezone TEXT,
        hwid TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `)

    // Create indexes for license_audit_trail
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_audit_trail_licenseId ON license_audit_trail("licenseId")`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON license_audit_trail(action)`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_audit_trail_createdAt ON license_audit_trail("createdAt")`
    )

    console.log('✅ license_audit_trail table created')

    console.log('✨ Migration complete!')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  }
}

migrate()
