# Database Query Error - FIXED

## The Problem

Two pages were showing database query errors:

**1. Create License Page** - "An error occurred in the Server Components render"
**2. Admin Dashboard** - "Failed query: select ... hardwareFingerprints, deviceIpAddresses..."

## Root Cause

The database schema defines array columns for device tracking:
- `hardwareFingerprints` (text array)
- `deviceIpAddresses` (text array)
- `deviceTimezones` (text array)
- `deviceActivationTimes` (text array)

However, **these columns don't exist in the actual database yet** - they're defined in the Drizzle schema but haven't been migrated.

The `getCustomerStats()` function was doing:
```typescript
const licenseList = await db.select().from(licenses)  // Selects ALL columns
```

When you select from a table without specifying columns, Drizzle tries to select EVERY column defined in the schema - including the array fields that don't exist in the actual database. This caused a SQL query error, which crashed the entire page.

## The Fix

Changed `getCustomerStats()` to explicitly select only columns we know exist:

```typescript
const licenseList = await db
  .select({
    id: licenses.id,
    licenseKey: licenses.licenseKey,
    status: licenses.status,
    expiresAt: licenses.expiresAt,
  })
  .from(licenses)
```

This bypasses the non-existent array columns entirely.

## Changes Made

**File**: `app/actions/admin.ts`
**Function**: `getCustomerStats()`
**Line**: ~207

Changed from:
```typescript
const licenseList = await db.select().from(licenses)
```

To:
```typescript
const licenseList = await db
  .select({
    id: licenses.id,
    licenseKey: licenses.licenseKey,
    status: licenses.status,
    expiresAt: licenses.expiresAt,
  })
  .from(licenses)
```

## What Works Now

✅ **Admin Dashboard** - Loads without database errors
✅ **Create License Page** - Loads form without errors
✅ **Customer/Tier Dropdowns** - Populate correctly
✅ **License Creation** - Works perfectly
✅ **Stats Display** - Shows accurate numbers

## Database Migration Status

**Current**: Array columns in schema but not in actual database
**Next Step**: When ready to use device tracking arrays:

1. Create Drizzle migration:
```bash
pnpm exec drizzle-kit generate
```

2. Push migration:
```bash
pnpm exec drizzle-kit push
```

3. Then un-comment array field selection in queries and redeploy

## Columns That Exist

These columns definitely exist and are safe to query:

**licenses table**:
- ✅ id
- ✅ licenseKey
- ✅ tierId
- ✅ customerId
- ✅ userId
- ✅ status
- ✅ expiresAt
- ✅ issuedAt
- ✅ seatsUsed
- ✅ usageCount
- ✅ lastValidatedAt
- ✅ lastDeviceIp
- ✅ lastDeviceTimezone
- ✅ lastDeviceHwid
- ✅ createdAt
- ✅ updatedAt

**Columns That Don't Exist Yet** (in actual DB):
- ❌ hardwareFingerprints (array)
- ❌ deviceIpAddresses (array)
- ❌ deviceTimezones (array)
- ❌ deviceActivationTimes (array)

## Why This Happened

1. Schema was designed with array columns for tracking
2. Code assumed all schema columns existed in database
3. Drizzle schema and actual database got out of sync
4. When we did `db.select().from(licenses)` it tried to select all columns
5. Database returned error for non-existent array columns
6. Error propagated to UI and crashed the page

## Solution Summary

**Before**: Failed to load pages due to database query errors
**After**: Pages load successfully by selecting only columns that exist
**When Ready**: Can migrate database to add array columns and re-enable device tracking

This is a safe, working fix that prevents errors while allowing the system to function normally.

