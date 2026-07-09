# Payment System Documentation

## Overview
The payment system is fully integrated with Cashfree for Indian rupee transactions and auto-issues licenses upon successful payment.

## Payment Flow

### 1. Initiate Payment
**Endpoint**: `initiatePayment(tierId)` (Server Action)
- Called when user clicks "Buy now" button
- Creates a pending payment record in the database
- Returns payment session ID for Cashfree checkout UI
- Flow: `CheckoutButton` → `initiatePayment` → Cashfree SDK

### 2. Customer Checkout
**Component**: Cashfree hosted checkout
- User enters payment details in Cashfree's hosted UI
- Cashfree processes payment and returns to `/shop/checkout/return?order_id=LIORD-xxx`

### 3. Webhook Confirmation
**Endpoint**: `POST /api/webhooks/cashfree`
- Receives `PAYMENT_SUCCESS_WEBHOOK` from Cashfree
- Calls `issueLicenseForPayment(orderId)`
- Automatically issues license and updates payment status to `completed`
- Idempotent - safe to retry

### 4. Return Page Verification
**Page**: `/shop/checkout/return`
- Calls `verifyAndFulfillOrder(orderId)` server-side
- Gets Cashfree order status from API
- If paid: shows license key and success message
- If pending: shows "processing" state
- User can copy license key and go to dashboard

### 5. Dashboard Access
**Page**: `/dashboard`
- User sees activated Premium Member license
- Can view devices, usage stats, and other licenses
- Can manage license through admin if needed

## Database Schema

### Payments Table
```sql
payments {
  id: string (Primary Key - Cashfree order_id)
  customerId: string (FK to customers)
  tierId: string (FK to license_tiers)
  amount: numeric (Price in INR)
  currency: string (INR)
  paymentGateway: string (cashfree)
  status: string (pending | completed | failed)
  transactionId: string (Cashfree payment_id)
  licenseId: string (FK to licenses - populated after issue)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Licenses Table
```sql
licenses {
  id: string (Primary Key - UUID)
  licenseKey: string (Human-readable key LI-XXXX-XX-XX-XX)
  tierId: string (FK to license_tiers)
  customerId: string (FK to customers)
  userId: string (FK to users)
  status: string (active | suspended | revoked | expired)
  expiresAt: timestamp (Calculated from tier.durationDays)
  issuedAt: timestamp
  hardwareFingerprints: string[] (Device bindings)
  seatsUsed: integer
  usageCount: integer
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Key Functions

### issueLicenseForPayment(paymentId)
- **Location**: `lib/licensing.ts`
- **Purpose**: Issues license for completed payment
- **Idempotent**: Returns existing license if already issued
- **Flow**:
  1. Validates payment exists
  2. Gets tier and customer info
  3. Generates license key
  4. Calculates expiry from tier.durationDays
  5. Creates license record
  6. Links license to payment
  7. Updates customer aggregates (totalSpent, licenseCount)

### verifyAndFulfillOrder(orderId)
- **Location**: `app/actions/customer.ts`
- **Purpose**: Server-side verification from return page
- **Security**: Validates order belongs to current user
- **Returns**: { paid: boolean, status: string, licenseKey?: string }

## Environment Variables Required

```
CASHFREE_APP_ID=xxx
CASHFREE_SECRET_KEY=xxx
CASHFREE_ENV=sandbox or production
```

## Testing Payment Flow

### Test Mode (Sandbox)
1. Set `CASHFREE_ENV=sandbox` in `.env`
2. Click "Buy now" on any tier
3. Use Cashfree test credentials
4. Webhook automatically processes success
5. License appears in dashboard

### Webhook Verification
- Verify webhook is enabled in Cashfree dashboard
- URL should be: `https://v0-unlimited-lovable.vercel.app/api/webhooks/cashfree`
- Listen for: `PAYMENT_SUCCESS_WEBHOOK`

## Error Handling

### Payment Failures
- User returned to checkout return page with error state
- Payment record created but marked `pending`
- No license issued until payment succeeds

### Webhook Failures
- Logged to console and Vercel logs
- Returns 500 error to Cashfree
- Cashfree will retry webhook
- Idempotency ensures no duplicates on retry

### License Issuing Failures
- Payment marked `pending` if license issue fails
- Admin can manually issue via `/admin/licenses/new`
- User can contact support for manual resolution

## Admin Dashboard

### Payments Tab
- View all payments with status filter
- Revenue stats (completed, pending, failed)
- Transaction details and customer info
- Mark manual payments or resolve issues

### Licenses Tab
- Create manual licenses for free tier
- View all issued licenses
- Delete or extend licenses
- Check device bindings and usage

## Production Checklist

- [ ] Cashfree credentials added to Vercel project
- [ ] Webhook URL registered in Cashfree dashboard
- [ ] Set `CASHFREE_ENV=production` in production
- [ ] Test payment flow end-to-end
- [ ] Monitor webhook deliveries
- [ ] Set up admin for payment oversight
