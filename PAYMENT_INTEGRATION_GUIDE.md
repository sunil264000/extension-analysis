# Payment Gateway Integration Guide

## Cashfree Integration

### Setup Steps

1. Create a Cashfree account at https://cashfree.com
2. Get your API credentials:
   - Client ID
   - Client Secret
3. Configure webhook in Cashfree dashboard:
   - Webhook URL: `https://your-domain.com/api/webhooks/cashfree`
   - Events to subscribe: `PAYMENT_SUCCESS_WEBHOOK`

### Environment Variables

Add these to your Vercel project settings:

```
CASHFREE_CLIENT_ID=your_client_id
CASHFREE_CLIENT_SECRET=your_client_secret
CASHFREE_WEBHOOK_SECRET=your_webhook_secret
```

### Webhook Payload Format

Cashfree sends payment success events with this structure:

```json
{
  "event": "PAYMENT_SUCCESS_WEBHOOK",
  "data": {
    "order": {
      "order_id": "ORDER-123",
      "order_amount": 99.99,
      "order_currency": "INR",
      "order_status": "PAID"
    },
    "payment": {
      "payment_id": "PAY-123",
      "payment_status": "SUCCESS"
    }
  }
}
```

### Frontend Integration

For Cashfree checkout, you'll need to:

1. Create a checkout endpoint that returns Cashfree session
2. Redirect user to Cashfree checkout
3. On success, user will be redirected back to your site
4. Webhook will automatically generate and activate license

---

## Razorpay Integration

### Setup Steps

1. Create a Razorpay account at https://razorpay.com
2. Get your API credentials:
   - Key ID
   - Key Secret
3. Configure webhook in Razorpay dashboard:
   - Webhook URL: `https://your-domain.com/api/webhooks/razorpay`
   - Events: `payment.authorized`, `payment.captured`
4. Generate webhook secret from dashboard

### Environment Variables

Add these to your Vercel project settings:

```
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Webhook Payload Format

Razorpay sends payment events with this structure:

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_123",
        "order_id": "order_123",
        "amount": 9999,
        "currency": "INR",
        "status": "captured"
      }
    }
  }
}
```

### Frontend Integration

For Razorpay checkout, you'll need to:

1. Initialize Razorpay with your Key ID
2. Create order on your backend
3. Show Razorpay checkout modal
4. On success, webhook will generate license
5. Poll `/api/licenses/generate` to get generated license key

---

## Payment Flow

### For Customers:

1. Customer visits `/shop`
2. Chooses license tier
3. Clicks "Get License" → redirects to `/shop/checkout/{paymentId}`
4. Checkout page initializes payment gateway
5. Customer completes payment
6. Payment gateway sends webhook to your server
7. Webhook:
   - Marks payment as `completed`
   - Generates unique license key
   - Creates license record in database
   - Links license to payment
8. Customer receives license key
9. Customer can view license in dashboard

---

## Checkout Page Template (Next.js)

Create `/app/shop/checkout/[paymentId]/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const paymentId = params.paymentId as string
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize payment gateway here
    // You'll need to:
    // 1. Fetch payment details from /api/payments/{paymentId}
    // 2. Initialize Razorpay or Cashfree checkout
    // 3. On success, show license key or redirect to dashboard
  }, [paymentId])

  return (
    <div className="min-h-screen flex items-center justify-center">
      {loading ? (
        <div>Initializing payment...</div>
      ) : (
        <div>
          {/* Payment gateway integration will render here */}
        </div>
      )}
    </div>
  )
}
```

---

## Testing Webhooks Locally

Use ngrok to expose your local server:

```bash
ngrok http 3000
# This gives you a public URL like https://abc123.ngrok.io

# Configure webhook to: https://abc123.ngrok.io/api/webhooks/cashfree
# or https://abc123.ngrok.io/api/webhooks/razorpay
```

Then use Postman to send test webhook payloads.

---

## License Generation API

After payment is completed, you can also manually generate a license:

```bash
POST /api/licenses/generate
Content-Type: application/json

{
  "transactionId": "ORDER-123",
  "customerId": "customer-uuid",
  "tierId": "tier-uuid"
}
```

Response:

```json
{
  "success": true,
  "licenseKey": "LI-XXXXXXXX-XXXX-XXXX-XXXX",
  "message": "License generated successfully"
}
```

---

## Database Schema for Payments

Payments table tracks all transactions:

```
- id: Payment identifier
- customerId: Link to customer
- licenseId: Generated license (null until webhook processes)
- tierId: License tier purchased
- amount: Payment amount
- currency: INR
- paymentGateway: 'cashfree' or 'razorpay'
- transactionId: External gateway transaction ID
- status: pending → completed
- paymentMethod: Credit card, UPI, etc.
- createdAt: Payment time
```

---

## Admin View

View all payments in admin dashboard at `/admin/payments`

You can see:
- Payment status
- Transaction IDs
- Amount and gateway
- Associated license
- Revenue analytics
