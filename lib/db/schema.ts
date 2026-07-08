import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'

// ========== Better Auth Tables ==========

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull(),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  expiresAt: timestamp('expiresAt'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
})

// ========== License Validator Tables ==========

export const licenseTiers = pgTable('license_tiers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('displayName').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('INR'),
  maxSeats: integer('maxSeats').notNull(),
  maxUsageLimit: integer('maxUsageLimit'),
  durationDays: integer('durationDays').notNull(),
  features: text('features').array().notNull(),
  description: text('description'),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const licenses = pgTable(
  'licenses',
  {
    id: text('id').primaryKey(),
    licenseKey: text('licenseKey').notNull().unique(),
    tierId: text('tierId').notNull(),
    customerId: text('customerId').notNull(),
    userId: text('userId').notNull(),
    status: text('status').notNull().default('active'),
    expiresAt: timestamp('expiresAt').notNull(),
    issuedAt: timestamp('issuedAt').notNull().defaultNow(),
    hardwareFingerprints: text('hardwareFingerprints').array().default([]),
    seatsUsed: integer('seatsUsed').notNull().default(1),
    usageCount: integer('usageCount').notNull().default(0),
    lastValidatedAt: timestamp('lastValidatedAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_licenses_licenseKey').on(table.licenseKey),
    index('idx_licenses_userId').on(table.userId),
    index('idx_licenses_customerId').on(table.customerId),
    index('idx_licenses_status').on(table.status),
    index('idx_licenses_expiresAt').on(table.expiresAt),
  ]
)

export const customers = pgTable(
  'customers',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    companyName: text('companyName'),
    email: text('email').notNull(),
    phone: text('phone'),
    country: text('country'),
    city: text('city'),
    taxId: text('taxId'),
    totalSpent: decimal('totalSpent', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    licenseCount: integer('licenseCount').notNull().default(0),
    isActive: boolean('isActive').notNull().default(true),
    notes: text('notes'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => [index('idx_customers_userId').on(table.userId)]
)

export const usageTracking = pgTable(
  'usage_tracking',
  {
    id: text('id').primaryKey(),
    licenseId: text('licenseId').notNull(),
    date: text('date').notNull(),
    usageCount: integer('usageCount').notNull().default(0),
    uniqueDevices: integer('uniqueDevices').notNull().default(0),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => [index('idx_usage_tracking_licenseId').on(table.licenseId)]
)

export const payments = pgTable(
  'payments',
  {
    id: text('id').primaryKey(),
    customerId: text('customerId').notNull(),
    licenseId: text('licenseId'),
    tierId: text('tierId').notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('INR'),
    paymentGateway: text('paymentGateway').notNull(),
    transactionId: text('transactionId').unique(),
    status: text('status').notNull().default('pending'),
    paymentMethod: text('paymentMethod'),
    notes: text('notes'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => [
    index('idx_payments_customerId').on(table.customerId),
    uniqueIndex('idx_payments_transactionId').on(table.transactionId),
  ]
)

export const licenseActivations = pgTable('license_activations', {
  id: text('id').primaryKey(),
  licenseId: text('licenseId').notNull(),
  hardwareFingerprint: text('hardwareFingerprint').notNull(),
  activatedAt: timestamp('activatedAt').notNull().defaultNow(),
  lastUsedAt: timestamp('lastUsedAt'),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Full record of every prompt the user submits through the extension.
// This powers the user's usage graphs and gives the admin complete visibility
// into how the extension is used (including tamper / crack detection).
export const promptEvents = pgTable(
  'prompt_events',
  {
    id: text('id').primaryKey(),
    licenseId: text('licenseId'),
    userId: text('userId').notNull(),
    licenseKey: text('licenseKey'),
    promptText: text('promptText'),
    promptLength: integer('promptLength').notNull().default(0),
    pageUrl: text('pageUrl'),
    projectId: text('projectId'),
    hardwareFingerprint: text('hardwareFingerprint'),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    // Abuse / integrity signals
    flagged: boolean('flagged').notNull().default(false),
    flagReason: text('flagReason'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => [
    index('idx_prompt_events_userId').on(table.userId),
    index('idx_prompt_events_licenseId').on(table.licenseId),
    index('idx_prompt_events_createdAt').on(table.createdAt),
    index('idx_prompt_events_flagged').on(table.flagged),
  ]
)

// ========== Automation "Brain Server" Tables ==========
// These power the anti-piracy step protocol: the extension is a dumb puppet
// that fetches one declarative action at a time from the server. A session is
// created only for a valid, non-revoked, device-bound license.

export const automationSessions = pgTable(
  'automation_sessions',
  {
    id: text('id').primaryKey(),
    licenseId: text('licenseId').notNull(),
    licenseKey: text('licenseKey').notNull(),
    hardwareFingerprint: text('hardwareFingerprint').notNull(),
    flowId: text('flowId').notNull(),
    // Ephemeral AES-GCM key (base64) used to encrypt step packets. Lives only
    // for the session lifetime; never shipped inside the extension bundle.
    sessionKey: text('sessionKey').notNull(),
    cursor: integer('cursor').notNull().default(0), // next step index expected
    totalSteps: integer('totalSteps').notNull().default(0),
    status: text('status').notNull().default('active'), // active | done | aborted | expired
    stepCount: integer('stepCount').notNull().default(0), // steps actually served
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    expiresAt: timestamp('expiresAt').notNull(),
    lastStepAt: timestamp('lastStepAt'),
  },
  (table) => [
    index('idx_automation_sessions_licenseId').on(table.licenseId),
    index('idx_automation_sessions_status').on(table.status),
    index('idx_automation_sessions_createdAt').on(table.createdAt),
  ]
)

export const automationEvents = pgTable(
  'automation_events',
  {
    id: text('id').primaryKey(),
    sessionId: text('sessionId').notNull(),
    licenseId: text('licenseId').notNull(),
    flowId: text('flowId').notNull(),
    step: integer('step').notNull(),
    action: text('action').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => [
    index('idx_automation_events_sessionId').on(table.sessionId),
    index('idx_automation_events_licenseId').on(table.licenseId),
    index('idx_automation_events_createdAt').on(table.createdAt),
  ]
)

// ========== Type Exports ==========
export type AutomationSession = typeof automationSessions.$inferSelect
export type AutomationEvent = typeof automationEvents.$inferSelect


export type User = typeof user.$inferSelect
export type LicenseTier = typeof licenseTiers.$inferSelect
export type License = typeof licenses.$inferSelect
export type Customer = typeof customers.$inferSelect
export type UsageTracking = typeof usageTracking.$inferSelect
export type Payment = typeof payments.$inferSelect
export type LicenseActivation = typeof licenseActivations.$inferSelect
export type PromptEvent = typeof promptEvents.$inferSelect
