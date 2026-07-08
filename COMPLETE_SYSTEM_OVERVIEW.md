# Complete License Validator System - Full Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     END USER (Customer)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
   ┌─────────────┐              ┌──────────────────┐
   │  Chrome     │              │  License Shop    │
   │ Extension   │              │  Website         │
   │  (Browser)  │              │  (Web App)       │
   └──────┬──────┘              └────────┬─────────┘
          │                             │
          │   License Key              │  Purchase
          │   Activation               │  License
          │                             │
   ┌──────▼─────────────────────────────▼───────────┐
   │                                                 │
   │        Your Backend (Next.js + Neon)           │
   │        ├─ /api/licenses/validate               │
   │        ├─ /api/licenses/track-usage            │
   │        ├─ /api/licenses/generate               │
   │        ├─ /api/webhooks/cashfree               │
   │        ├─ /api/webhooks/razorpay               │
   │        ├─ /admin/* (Admin Dashboard)           │
   │        ├─ /shop/* (Customer Portal)            │
   │        └─ /dashboard/* (My Licenses)           │
   │                                                 │
   └──────┬───────────────────────┬──────────────────┘
          │                       │
   ┌──────▼────┐          ┌──────▼────────┐
   │   Neon    │          │   Cashfree &  │
   │ PostgreSQL│          │   Razorpay    │
   │ Database  │          │  Payment      │
   └───────────┘          │  Gateways     │
                          └───────────────┘
```

---

## Data Flow: License Purchase to Activation

### Step 1: Customer Purchases License (Web Shop)

```
1. Customer visits https://your-domain.vercel.app/shop
2. Selects license tier (Pro, Enterprise, etc.)
3. Enters email and payment info
4. Clicks "Buy Now"
5. Redirected to Cashfree/Razorpay checkout
```

### Step 2: Payment Processing

```
1. Cashfree/Razorpay processes payment
2. If successful → Webhook to your API
3. Webhook URL: /api/webhooks/cashfree or /api/webhooks/razorpay
4. Webhook handler:
   - Verifies payment signature
   - Creates customer record (if new)
   - Generates license key
   - Stores license in database
   - Marks payment as completed
```

### Step 3: License Key Delivered

```
1. Customer receives email with license key
2. Email format: "LI-ABCD-1234-EFGH-5678"
3. Customer is given instructions to activate in extension
```

### Step 4: Extension Activation

```
1. Customer opens Lovable Infinity extension
2. Clicks "Activate License"
3. Enters license key
4. Extension stores: chrome.storage.local.ql_license_key
5. Background script reads key
6. Generates device fingerprint
7. Calls POST /api/licenses/validate
   {
     licenseKey: "LI-ABCD-1234-EFGH-5678",
     hardwareFingerprint: "fp_abc123",
     timestamp: 1720000000000
   }
```

### Step 5: Server Validates

```
Database lookup:
1. Find license by key in licenses table
2. Check license.status (active/suspended/expired)
3. Check license.expiresAt > now()
4. Check license.seatsUsed < license.maxSeats
5. Verify hardware fingerprint isn't already at seat limit

Response:
{
  valid: true,
  status: "active",
  plan_name: "Pro",
  expires_at: "2024-12-31T23:59:59Z",
  usage_limit: 1000,
  usage_count: 45,
  max_seats: 5,
  seats_used: 1
}
```

### Step 6: Extension Updates UI

```
1. Extension receives validation response
2. Stores in chrome.storage.local:
   - ql_license_valid: true
   - ql_license_data: {...}
   - ql_last_validated: timestamp
3. Updates badge: ✓ (green checkmark)
4. User can now use Lovable Infinity features
```

---

## Database Schema

### licenses Table
```sql
CREATE TABLE licenses (
  id TEXT PRIMARY KEY,                    -- UUID
  licenseKey TEXT UNIQUE NOT NULL,        -- LI-XXXX-XXXX-XXXX-XXXX
  tierId TEXT NOT NULL,                   -- References license_tiers.id
  customerId TEXT NOT NULL,               -- References customers.id
  userId TEXT NOT NULL,                   -- References users.id
  status TEXT DEFAULT 'active',           -- active, suspended, expired
  expiresAt TIMESTAMP NOT NULL,           -- License expiry date
  issuedAt TIMESTAMP DEFAULT now(),       -- When license was created
  hardwareFingerprints TEXT[] DEFAULT '{}', -- Array of device fingerprints
  seatsUsed INTEGER DEFAULT 1,            -- Devices using this license
  usageCount INTEGER DEFAULT 0,           -- Total API calls
  lastValidatedAt TIMESTAMP,              -- Last time it was validated
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

### license_tiers Table
```sql
CREATE TABLE license_tiers (
  id TEXT PRIMARY KEY,                    -- UUID or slug (pro, enterprise)
  name TEXT UNIQUE NOT NULL,              -- pro, enterprise, etc
  displayName TEXT NOT NULL,              -- "Pro Plan", "Enterprise"
  price DECIMAL(10, 2) NOT NULL,          -- Cost in primary currency
  currency TEXT DEFAULT 'INR',            -- INR, USD, etc
  maxSeats INTEGER NOT NULL,              -- Max devices per license
  maxUsageLimit INTEGER,                  -- API calls per month (null = unlimited)
  durationDays INTEGER NOT NULL,          -- 30, 365, etc
  features TEXT[] NOT NULL,               -- ["Feature1", "Feature2"]
  description TEXT,                       -- Marketing description
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

### customers Table
```sql
CREATE TABLE customers (
  id TEXT PRIMARY KEY,                    -- UUID
  userId TEXT NOT NULL,                   -- References users.id
  companyName TEXT,                       -- Customer company name
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  city TEXT,
  taxId TEXT,                             -- GST/VAT ID
  totalSpent DECIMAL(10, 2) DEFAULT 0,    -- Total revenue from customer
  licenseCount INTEGER DEFAULT 0,         -- Number of active licenses
  isActive BOOLEAN DEFAULT true,
  notes TEXT,                             -- Admin notes
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

### payments Table
```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY,                    -- UUID
  customerId TEXT NOT NULL,               -- References customers.id
  licenseId TEXT,                         -- References licenses.id (can be null)
  tierId TEXT NOT NULL,                   -- References license_tiers.id
  amount DECIMAL(10, 2) NOT NULL,         -- Amount paid
  currency TEXT DEFAULT 'INR',
  paymentGateway TEXT NOT NULL,           -- cashfree or razorpay
  transactionId TEXT UNIQUE,              -- Payment gateway transaction ID
  status TEXT DEFAULT 'pending',          -- pending, success, failed
  paymentMethod TEXT,                     -- credit_card, net_banking, etc
  notes TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

### usage_tracking Table
```sql
CREATE TABLE usage_tracking (
  id TEXT PRIMARY KEY,                    -- UUID
  licenseId TEXT NOT NULL,                -- References licenses.id
  date DATE NOT NULL,                     -- YYYY-MM-DD
  usageCount INTEGER DEFAULT 0,           -- API calls on this date
  uniqueDevices INTEGER DEFAULT 0,        -- Unique devices used
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

---

## API Endpoints Summary

### License Validation (Used by Extension)

**POST** `/api/licenses/validate`
- Called by: Extension
- Input: License key + device fingerprint
- Output: License status, expiry, usage
- Error Handling: Expired, invalid, seat limit exceeded

**POST** `/api/licenses/track-usage`
- Called by: Extension (hourly)
- Input: License key + device fingerprint
- Output: Current usage count, remaining quota
- Tracks daily usage for quota enforcement

### License Generation (Used by Admin/Webhooks)

**POST** `/api/licenses/generate`
- Called by: Payment webhooks or admin
- Input: Customer ID, tier ID, duration
- Output: Generated license key
- Creates new license record in database

### Payment Webhooks (Called by Gateways)

**POST** `/api/webhooks/cashfree`
- Cashfree webhook callback
- Verifies payment signature
- Creates license on success

**POST** `/api/webhooks/razorpay`
- Razorpay webhook callback
- Verifies payment signature
- Creates license on success

### Admin APIs

**GET** `/admin` - Dashboard with stats
**POST** `/admin/licenses` - Create license manually
**GET** `/admin/licenses` - List all licenses
**PUT** `/admin/licenses/:id` - Suspend/extend license
**DELETE** `/admin/licenses/:id` - Delete license
**GET** `/admin/customers` - List customers
**GET** `/admin/payments` - View payment history

### Customer APIs

**GET** `/shop` - License shop page
**POST** `/shop/create-checkout` - Initiate payment
**GET** `/dashboard` - My licenses & usage
**GET** `/dashboard/download/:licenseId` - Download license cert

---

## License Lifecycle

```
CREATED
   ↓
   ├─ After successful payment (via webhook)
   ├─ Manual creation by admin
   └─ Status: "active"
       ↓
   ACTIVE
   ├─ Can be validated by extension
   ├─ Usage is tracked daily
   ├─ 1 month from creation
   │  └─ Check if expires soon
   │     └─ Status: "expiring_soon"
   │        ├─ Send email reminder
   │        └─ Extension shows ⚠ warning
   │
   ├─ Expiry date reached
   │  └─ Status: "expired"
   │     ├─ Extension shows ✗
   │     └─ Must purchase renewal
   │
   ├─ Usage quota exceeded
   │  └─ Status: "quota_exceeded"
   │     ├─ Extension blocks usage
   │     └─ Must upgrade tier
   │
   └─ Manually suspended
      └─ Status: "suspended"
         ├─ Admin action
         └─ Can be unsuspended
```

---

## Seat/Device Management

### What is a "Seat"?

One "seat" = one device using the license simultaneously.

Example: Pro plan has 5 seats
- Device 1 (home PC) using license ✓
- Device 2 (laptop) can activate on same license ✓
- Device 3 (work PC) can activate on same license ✓
- Device 4 (phone) can activate on same license ✓
- Device 5 (tablet) can activate on same license ✓
- Device 6 (second monitor) **cannot activate** (limit reached)

### How Device Binding Works

1. **Extension generates fingerprint** based on hardware
2. **Sent with validation request**
3. **Server stores fingerprint** in license.hardwareFingerprints array
4. **On next activation**, checks if fingerprint already exists
5. **If fingerprint ≠ new device**, counts as new seat
6. **If seatsUsed ≥ maxSeats**, validation fails

### User Unbinds Device

- Clear browser cache/cookies (generates new fingerprint)
- Request admin to remove binding
- After 30 days of inactivity, device binding auto-expires

---

## Deployment Checklist

### Before Going Live

- [ ] Update `CONFIG.API_BASE` in both extension files
- [ ] Verify all API endpoints are working
- [ ] Test payment webhooks (Cashfree & Razorpay)
- [ ] Generate test license keys
- [ ] Test license activation in extension
- [ ] Verify usage tracking works
- [ ] Test admin dashboard functions
- [ ] Set up SSL/HTTPS (Vercel does this automatically)
- [ ] Configure payment gateway webhooks to point to your API
- [ ] Test email notifications (license expiry, welcome, etc)
- [ ] Set up error tracking/monitoring

### Production Setup

1. Deploy to Vercel
   ```bash
   git push origin main
   ```

2. Vercel auto-deploys, gives you URL:
   ```
   https://your-app-name.vercel.app
   ```

3. Update extension files:
   ```javascript
   API_BASE: 'https://your-app-name.vercel.app'
   ```

4. Update payment gateway webhooks:
   - Cashfree → Settings → Webhooks
     ```
     https://your-app-name.vercel.app/api/webhooks/cashfree
     ```
   - Razorpay → Settings → Webhooks
     ```
     https://your-app-name.vercel.app/api/webhooks/razorpay
     ```

5. Publish extension to Chrome Web Store

6. Monitor:
   - Vercel logs
   - Database metrics
   - Payment success rates
   - License validation errors

---

## Testing Workflow

### Local Development

```bash
# Terminal 1: Run backend
pnpm dev
# Runs on http://localhost:3000

# Terminal 2: Update extension
# Set API_BASE to 'http://localhost:3000'

# Browser: Load extension in developer mode
# chrome://extensions → Load unpacked → select extension folder

# Test: Activate license through extension UI
# Check: Browser console for logs
# Verify: Chrome storage shows license data
```

### Production Testing

```bash
# Deploy to Vercel
git push origin main

# Update extension with production URL
API_BASE: 'https://your-app.vercel.app'

# Reload extension
chrome://extensions → reload button

# Test with real license key from admin dashboard
# Verify: Extension shows green ✓ badge
# Check: Admin dashboard shows usage tracking
```

---

## Support & Monitoring

### Logs to Check

1. **Extension logs:**
   - `chrome://extensions` → details → background logs
   - Look for validation success/failures

2. **Server logs:**
   - Vercel dashboard → Functions/Logs
   - Look for API errors

3. **Database:**
   - Check `licenses` table for new records
   - Check `usage_tracking` for daily usage

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "License validation failed" | Check API endpoint URL, network connectivity |
| "Device limit exceeded" | User has activated on too many devices |
| "License expired" | Show user renewal prompt in shop |
| "Quota exceeded" | User needs to upgrade plan tier |
| Webhook not firing | Verify webhook URL in payment gateway settings |
| Payment not creating license | Check webhook logs for errors |

---

## Next Steps

1. **Deploy backend** to Vercel
2. **Update extension** files with production URL
3. **Test** license activation flow
4. **Publish** extension to users
5. **Monitor** usage and collect feedback
6. **Iterate** based on customer feedback

---

**System is now fully integrated and ready for production!** 🚀
