# Lovable Infinity License Validator System

Complete license management platform for validating Lovable Infinity Chrome extension licenses with support for multiple payment gateways (Cashfree & Razorpay).

## System Overview

This is a full-stack Next.js application that manages:

- License generation and validation
- Multi-tier pricing plans (Pro, Enterprise, etc.)
- Device binding and seat management
- Usage tracking and quota enforcement
- Payment processing via Cashfree and Razorpay
- Admin and customer dashboards

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Lovable Infinity Extension                │
│                     (Chrome Browser)                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ POST /api/licenses/validate
                 │ POST /api/licenses/track-usage
                 ▼
┌─────────────────────────────────────────────────────────────┐
│        Next.js License Validator API (This Project)         │
│                                                             │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ License APIs   │  │ Payment Webhooks │  │ Dashboards │ │
│  │ - Validate     │  │ - Cashfree       │  │ - Admin    │ │
│  │ - Generate     │  │ - Razorpay       │  │ - Customer │ │
│  │ - Track Usage  │  │                  │  │            │ │
│  └────────────────┘  └──────────────────┘  └────────────┘ │
│                                                             │
│                    ▼                                        │
│            Neon PostgreSQL Database                       │
└─────────────────────────────────────────────────────────────┘
                 │
                 ├─ Cashfree Payment Gateway
                 └─ Razorpay Payment Gateway
```

## Quick Start

### Prerequisites

- Node.js 18+ with pnpm
- Neon PostgreSQL database
- Vercel account (for deployment)
- Cashfree and/or Razorpay accounts

### Installation

1. **Clone and install**
```bash
git clone <your-repo>
cd <project>
pnpm install
```

2. **Set up environment variables**

Create `.env.local`:

```env
# Database
DATABASE_URL=postgresql://user:password@host/database

# Authentication
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Payment Gateways (optional - add when ready)
CASHFREE_CLIENT_ID=your_id
CASHFREE_CLIENT_SECRET=your_secret
RAZORPAY_KEY_ID=your_id
RAZORPAY_KEY_SECRET=your_secret
```

3. **Run development server**
```bash
pnpm dev
```

4. **Set up initial data**

Visit `/admin` and create license tiers:
- Go to `/admin/tiers`
- Create "Pro" tier (₹999, 30 days, 3 seats, 1000 API calls/day)
- Create "Enterprise" tier (₹4999, 90 days, unlimited seats, unlimited API calls)

### Initial Testing

1. **Create account**
   - Sign up at `http://localhost:3000/sign-up`

2. **Buy license**
   - Visit `/shop`
   - Select tier (will be stuck at checkout - needs payment integration)

3. **Admin panel**
   - Visit `/admin`
   - View all licenses, customers, payments

4. **Test API**
   - Generate test license manually
   - Use test license key to validate against API

---

## Database Schema

### Core Tables

#### `users` (Better Auth)
- id, email, name, image, emailVerified
- createdAt, updatedAt

#### `licenses`
- id, licenseKey (unique format: LI-XXXX-XXXX-XXXX-XXXX)
- tierId, customerId, userId
- status (active, expired, suspended)
- expiresAt, hardwareFingerprints[], seatsUsed
- usageCount, lastValidatedAt

#### `license_tiers`
- id, name, displayName, price, currency
- maxSeats, maxUsageLimit, durationDays
- features[], description, isActive

#### `customers`
- id, userId, email, companyName, phone
- country, city, taxId, totalSpent
- licenseCount, isActive

#### `payments`
- id, customerId, licenseId, tierId
- amount, currency, paymentGateway
- transactionId (external ID), status (pending/completed)

#### `usage_tracking`
- id, licenseId, date, usageCount
- uniqueDevices

#### `license_activations`
- id, licenseId, hardwareFingerprint
- activatedAt, lastUsedAt, isActive

---

## API Endpoints

### License Validation (Public)

```
POST /api/licenses/validate
{
  licenseKey: string
  hardwareFingerprint: string
}
→ { valid, license, error }
```

### Usage Tracking (Public)

```
POST /api/licenses/track-usage
{
  licenseKey: string
  hardwareFingerprint: string
}
→ { success, usage { todayUsage, totalUsage, maxLimit, remaining } }
```

### License Generation (Webhook)

```
POST /api/licenses/generate
{
  transactionId: string
  customerId: string
  tierId: string
}
→ { success, licenseKey }
```

### Payment Webhooks

```
POST /api/webhooks/cashfree  (Cashfree events)
POST /api/webhooks/razorpay  (Razorpay events)
```

---

## Dashboard Routes

### Admin (`/admin`)
- Dashboard: `/admin` (stats, charts)
- Licenses: `/admin/licenses` (manage all licenses)
- Customers: `/admin/customers` (customer database)
- Payments: `/admin/payments` (transaction history)
- Tiers: `/admin/tiers` (pricing plans)
- Analytics: `/admin/analytics` (usage reports)

### Customer (`/`)
- Dashboard: `/dashboard` (my licenses, my payments)
- Shop: `/shop` (buy licenses)
- License Details: `/dashboard/license/:id`

### Authentication
- Sign In: `/sign-in`
- Sign Up: `/sign-up`

---

## Payment Gateway Integration

### Cashfree Setup

1. Create account at https://cashfree.com
2. Get Client ID & Secret
3. Add webhook: `https://your-domain.com/api/webhooks/cashfree`
4. Set env vars: `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`
5. On checkout page, initialize Cashfree payment session
6. Webhook auto-generates license on success

### Razorpay Setup

1. Create account at https://razorpay.com
2. Get Key ID & Key Secret
3. Add webhook: `https://your-domain.com/api/webhooks/razorpay`
4. Set env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
5. On checkout page, initialize Razorpay checkout
6. Webhook auto-generates license on success

See `PAYMENT_INTEGRATION_GUIDE.md` for detailed setup.

---

## Extension Integration

The Chrome extension validates licenses by calling your API:

1. User enters license key in extension
2. Extension generates device fingerprint
3. Extension calls `POST /api/licenses/validate`
4. API validates and binds to device
5. Extension stores valid status locally
6. Extension tracks usage periodically

See `EXTENSION_INTEGRATION.md` for detailed integration guide.

Copy `/lib/extension-api-client.ts` to your extension project.

---

## File Structure

```
app/
  ├── admin/                 # Admin dashboard pages
  │   ├── layout.tsx
  │   ├── page.tsx          # Admin home
  │   ├── licenses/
  │   ├── customers/
  │   ├── payments/
  │   ├── tiers/
  │   └── analytics/
  ├── api/
  │   ├── auth/[...all]/    # Better Auth handler
  │   ├── licenses/
  │   │   ├── validate/     # Validation endpoint
  │   │   ├── generate/     # Generation endpoint
  │   │   └── track-usage/  # Usage tracking
  │   └── webhooks/
  │       ├── cashfree/     # Cashfree webhook
  │       └── razorpay/     # Razorpay webhook
  ├── shop/                  # Customer license shop
  │   └── page.tsx
  ├── dashboard/             # Customer dashboard
  │   └── page.tsx
  ├── sign-in/               # Auth pages
  └── sign-up/
lib/
  ├── auth.ts               # Better Auth config
  ├── auth-client.ts        # Client-side auth
  ├── db/
  │   ├── index.ts          # Drizzle client
  │   └── schema.ts         # Database schema
  ├── extension-api-client.ts # For extension use
components/
  └── ui/                    # shadcn components
```

---

## Development

### Add a License Tier

```bash
# Via admin UI at /admin/tiers or use API

POST /api/admin/tiers
{
  name: "pro",
  displayName: "Pro",
  price: "999",
  maxSeats: 3,
  maxUsageLimit: 1000,
  durationDays: 30,
  features: ["Feature 1", "Feature 2"]
}
```

### Generate Test License

Use admin page `/admin/licenses/new` to manually create license.

### Test Extension Validation

```javascript
// In browser console
fetch('http://localhost:3000/api/licenses/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    licenseKey: 'LI-XXXXXXXX-XXXX-XXXX-XXXX',
    hardwareFingerprint: 'device-id'
  })
})
.then(r => r.json())
.then(console.log)
```

---

## Deployment

### Deploy to Vercel

1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy via Git push (automatic)

```bash
git push origin main
```

### Post-Deployment

1. Set up Neon production database
2. Configure payment webhook URLs to production domain
3. Update extension API endpoint to production domain
4. Test full flow with real payments

---

## Monitoring

### Admin Analytics (`/admin/analytics`)
- Total revenue by month
- Active licenses vs expired
- Usage trends
- Customer acquisition

### Logs

Check application logs for:
- API validation errors
- Payment webhook issues
- License generation failures
- Usage tracking errors

---

## Troubleshooting

### License validation returns 404
- Ensure license key exists: check `/admin/licenses`
- Verify hardware fingerprint format
- Check database connection

### Webhook not triggering
- Verify webhook URL in payment gateway
- Check webhook secret matches
- Review webhook logs in payment dashboard
- Test webhook delivery manually

### Extension can't reach API
- Check CORS headers in API response
- Verify API URL is correct
- Check network in browser DevTools
- Ensure API is deployed and running

### Database errors
- Verify `DATABASE_URL` environment variable
- Check Neon connection status
- Run migrations if needed

---

## Security Notes

- Always use HTTPS in production
- Store payment gateway secrets in environment variables
- Validate all webhook signatures
- Rate limit API endpoints
- Use proper CORS headers
- Encrypt sensitive data in transit
- Monitor for suspicious license usage patterns

---

## Support

For issues:
1. Check logs at `/admin/analytics`
2. Review relevant integration guide
3. Check database schema in `DEOBFUSCATION_REPORT.md`
4. Contact support (add your email)

---

## License

This project is proprietary. Do not distribute without permission.

---

## Next Steps

1. ✅ Database schema set up
2. ✅ API endpoints created
3. ✅ Admin dashboard built
4. ✅ Customer dashboard built
5. ✅ Payment webhooks configured
6. ⏳ Integrate Cashfree/Razorpay checkout UI
7. ⏳ Modify extension for API integration
8. ⏳ Deploy to production
9. ⏳ Test end-to-end flow

See tasks in README for completion status.
