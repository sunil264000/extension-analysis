# Lovable Infinity License Validator

> Complete license generation, validation, and management system for your Chrome extension with Cashfree & Razorpay payment integration.

## Quick Links

📚 **Start Here:**
- [Build Summary](./BUILD_SUMMARY.md) - What was built
- [Setup Guide](./SETUP_GUIDE.md) - How to deploy (30 min)
- [License Validator README](./LICENSE_VALIDATOR_README.md) - System overview

🔧 **Integration Guides:**
- [Payment Integration](./PAYMENT_INTEGRATION_GUIDE.md) - Cashfree & Razorpay setup
- [Extension Integration](./EXTENSION_INTEGRATION.md) - Modify your extension
- [Deobfuscation Report](./DEOBFUSCATION_REPORT.md) - Extension analysis

---

## System Overview

Complete full-stack system that:
- Generates unique license keys (LI-XXXX-XXXX-XXXX-XXXX format)
- Validates licenses in your extension
- Binds licenses to devices (seat limiting)
- Tracks daily usage (quota enforcement)
- Processes payments (Cashfree & Razorpay)
- Manages customers and tiers
- Provides admin dashboard

---

## What's Included

### ✅ Backend (Next.js 16 + Neon PostgreSQL)

**3 Core API Endpoints:**
- `POST /api/licenses/validate` - Validate license keys
- `POST /api/licenses/track-usage` - Track usage quota
- `POST /api/licenses/generate` - Generate licenses (post-payment)

**2 Webhook Handlers:**
- `POST /api/webhooks/cashfree` - Cashfree payments
- `POST /api/webhooks/razorpay` - Razorpay payments

**Admin Dashboard** (`/admin`)
- License management
- Customer database
- Payment history
- Revenue analytics
- Tier configuration

**Customer Portal** (`/`)
- License shop
- Dashboard (my licenses & payments)
- License details

**Authentication**
- Sign up / Sign in
- Better Auth with sessions
- Protected routes

### ✅ Database (10 Tables)

- users, sessions, accounts, verification (Better Auth)
- licenses, license_tiers, customers
- payments, usage_tracking, license_activations

### ✅ Documentation

- System architecture diagrams
- API documentation
- Payment gateway setup
- Extension integration guide
- Deployment instructions

---

## 30-Minute Quick Start

### 1. Set Environment Variables

```env
DATABASE_URL=postgresql://...  # From Neon integration
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```

### 2. Start Dev Server

```bash
pnpm dev
```

Visit:
- Admin: http://localhost:3000/admin
- Shop: http://localhost:3000/shop
- Dashboard: http://localhost:3000/dashboard

### 3. Create License Tiers

1. Go to `/admin/tiers`
2. Create "Pro" tier (₹999, 30 days, 3 seats)
3. Create "Enterprise" tier (₹4999, 90 days)

### 4. Generate Test License

1. Sign up at `/sign-up`
2. Go to `/admin/licenses/new`
3. Create manual license
4. Get license key

### 5. Test Validation API

```bash
curl -X POST http://localhost:3000/api/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "LI-XXXXXXXX-XXXX-XXXX-XXXX",
    "hardwareFingerprint": "device-id"
  }'
```

---

## Architecture

```
Chrome Extension
    ↓
POST /api/licenses/validate     ← Main validation
POST /api/licenses/track-usage  ← Usage tracking
    ↓
Next.js API Routes
    ↓
Neon PostgreSQL
    ↓
↙ Cashfree
↓ Razorpay
```

---

## Key Features

### License Management
- Unique key generation
- Multi-tier support
- Expiry tracking
- Device binding
- Seat limiting

### Payment Processing
- Cashfree webhook handler
- Razorpay webhook handler
- Automatic license generation
- Transaction tracking

### Usage Tracking
- Daily usage counting
- Quota enforcement
- Historical data
- Analytics dashboard

### Admin Features
- KPI dashboard
- Revenue charts
- License management
- Customer management
- Manual license creation

### Customer Features
- License shop
- My licenses view
- Payment history
- License details

---

## File Structure

```
lib/
├── auth.ts                    # Better Auth config
├── db/schema.ts              # Database schema
├── extension-api-client.ts   # For extension use

app/
├── admin/                    # Admin dashboard
├── shop/                     # License shop
├── dashboard/                # Customer dashboard
├── api/
│   ├── licenses/            # Core endpoints
│   └── webhooks/            # Payment webhooks
├── sign-in/                 # Auth pages
└── sign-up/

Documentation:
├── BUILD_SUMMARY.md         # What was built
├── SETUP_GUIDE.md          # How to deploy
├── LICENSE_VALIDATOR_README.md
├── PAYMENT_INTEGRATION_GUIDE.md
├── EXTENSION_INTEGRATION.md
└── DEOBFUSCATION_REPORT.md
```

---

## Deployment

### Step 1: Deploy to Vercel
```bash
git push origin main
```

### Step 2: Configure Environment
- Add `DATABASE_URL` from Neon
- Add `BETTER_AUTH_SECRET`
- Add payment credentials (optional)

### Step 3: Set Up Payments
- Configure Cashfree webhooks
- Configure Razorpay webhooks
- Update webhook URLs to production domain

### Step 4: Configure Extension
- Copy `/lib/extension-api-client.ts` to extension
- Update API endpoint to production domain
- Test end-to-end flow

---

## API Endpoints

### License Validation
```
POST /api/licenses/validate
{ licenseKey, hardwareFingerprint }
→ { valid, license, error }
```

### Usage Tracking
```
POST /api/licenses/track-usage
{ licenseKey, hardwareFingerprint }
→ { success, usage }
```

### License Generation
```
POST /api/licenses/generate
{ transactionId, customerId, tierId }
→ { success, licenseKey }
```

---

## Payment Gateways

### Cashfree
- Create account: https://cashfree.com
- Configure webhook: `POST /api/webhooks/cashfree`
- Add env vars: `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`

### Razorpay
- Create account: https://razorpay.com
- Configure webhook: `POST /api/webhooks/razorpay`
- Add env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

See [Payment Integration Guide](./PAYMENT_INTEGRATION_GUIDE.md) for detailed setup.

---

## Extension Integration

Copy this to your extension:

```javascript
import { getApiClient } from 'lib/extension-api-client'

const client = getApiClient('https://your-domain.com')

// Validate license
const result = await client.validateLicense({
  licenseKey: userKey,
  hardwareFingerprint: deviceId
})

// Track usage
await client.trackUsage({
  licenseKey: userKey,
  hardwareFingerprint: deviceId
})
```

See [Extension Integration Guide](./EXTENSION_INTEGRATION.md) for full details.

---

## Testing

### Unit Tests
```bash
pnpm test
```

### API Testing
```bash
# Validate license
curl -X POST http://localhost:3000/api/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"LI-...", "hardwareFingerprint":"..."}'
```

### Manual Testing
1. Sign up at `/sign-up`
2. Create license at `/admin/licenses`
3. Test validation with curl
4. Verify admin dashboard

---

## Monitoring

### Logs
- Vercel dashboard → Function Logs
- Error tracking in database
- Webhook delivery logs

### Analytics
- `/admin` dashboard
- Revenue by month
- Active licenses
- Customer metrics

---

## Support

### Documentation
- [Setup Guide](./SETUP_GUIDE.md) - Deployment
- [Payment Guide](./PAYMENT_INTEGRATION_GUIDE.md) - Payments
- [Extension Guide](./EXTENSION_INTEGRATION.md) - Extension mods
- [System README](./LICENSE_VALIDATOR_README.md) - Architecture

### Troubleshooting
See respective guide for:
- Database errors
- API failures
- Payment webhook issues
- Extension connectivity

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:password@host/db
BETTER_AUTH_SECRET=<random-32-chars>

# Optional
CASHFREE_CLIENT_ID=
CASHFREE_CLIENT_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Neon PostgreSQL
- **ORM:** Drizzle
- **Auth:** Better Auth
- **UI:** Tailwind CSS + shadcn/ui
- **Payments:** Cashfree & Razorpay webhooks

---

## Project Stats

- 10 Database tables
- 5 API endpoints
- 6 Admin pages
- 3 Customer pages
- 2 Auth pages
- ~2,500 lines of code
- Full TypeScript
- Production-ready

---

## Next Steps

1. ✅ Read [Build Summary](./BUILD_SUMMARY.md)
2. ✅ Follow [Setup Guide](./SETUP_GUIDE.md)
3. ⏳ Deploy to production
4. ⏳ Configure payment gateways
5. ⏳ Integrate with extension
6. ⏳ Test end-to-end flow

---

## Quick Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start

# Type check
pnpm type-check

# Format code
pnpm format
```

---

## License

This project is proprietary. Do not distribute without permission.

---

## Summary

You now have a **complete license validation system** ready for production:

✅ Database with 10 optimized tables
✅ 5 API endpoints (validation, tracking, generation, webhooks)
✅ Admin dashboard for management
✅ Customer portal with shop
✅ Payment webhooks (Cashfree & Razorpay)
✅ Better Auth authentication
✅ Extension integration guide
✅ Complete documentation

**Time to deploy!** Start with:

```bash
pnpm dev
```

Visit http://localhost:3000/admin to see it in action.

---

**Questions?** Check the relevant documentation file above or the inline code comments.

**Ready to deploy?** Follow the [Setup Guide](./SETUP_GUIDE.md).

**Need to modify extension?** Use [Extension Integration Guide](./EXTENSION_INTEGRATION.md).
