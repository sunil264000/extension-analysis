/**
 * Database migration script to create new audit and security tables
 * Run with: npx tsx scripts/migrate-db.ts
 */

import { pool } from '@/lib/db'

const SQL = `
-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT,
  "resourceId" TEXT,
  changes TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  metadata TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON audit_logs("userId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_createdAt ON audit_logs("createdAt");

-- Login attempts table (for brute force detection)
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  reason TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ipAddress ON login_attempts("ipAddress");
CREATE INDEX IF NOT EXISTS idx_login_attempts_createdAt ON login_attempts("createdAt");

-- Account lockouts table (for security holds)
CREATE TABLE IF NOT EXISTS account_lockouts (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  "lockedUntil" TIMESTAMP NOT NULL,
  "releaseReason" TEXT,
  "releasedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_lockouts_userId ON account_lockouts("userId");
CREATE INDEX IF NOT EXISTS idx_account_lockouts_email ON account_lockouts(email);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_lockedUntil ON account_lockouts("lockedUntil");
`

async function migrate() {
  try {
    console.log('[v0] Starting database migration...')
    const client = await pool.connect()

    try {
      // Split by double newline to get individual statements
      const statements = SQL.split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      for (const statement of statements) {
        console.log(`[v0] Executing: ${statement.substring(0, 50)}...`)
        await client.query(statement)
      }

      console.log('[v0] Database migration completed successfully!')
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('[v0] Database migration failed:', error)
    process.exit(1)
  }
}

migrate()
