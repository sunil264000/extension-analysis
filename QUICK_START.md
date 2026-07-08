# Quick Start Guide - 1 Hour to Production

## 5-Minute Overview

You now have:
- ✅ Complete backend (Next.js + Neon)
- ✅ License validation API
- ✅ Admin dashboard
- ✅ Customer portal
- ✅ Payment webhook handlers
- ✅ Extension integration files

All you need to do:
1. Deploy to Vercel (5 min)
2. Update extension files (5 min)
3. Test (10 min)
4. Go live (5 min)

---

## 10-Minute Deployment

### Deploy to Vercel

```bash
# Option 1: Use Vercel CLI
npm install -g vercel
cd /vercel/share/v0-project
vercel

# Option 2: Connect GitHub
# Push to GitHub, connect repo in Vercel dashboard
git add .
git commit -m "License validator system"
git push origin main
```

**Result:** Vercel gives you a URL like `https://your-app-name.vercel.app`

### Verify Deployment

Visit these URLs:
- `https://your-app-name.vercel.app` - Home page
- `https://your-app-name.vercel.app/admin` - Admin dashboard
- `https://your-app-name.vercel.app/shop` - License shop

You should see the UI loaded. If not, check Vercel logs for errors.

---

## 5-Minute Extension Update

### Get Modified Files

Your modified files are in:
```
/public/extension-integration/
├── modified-lovable-auth.js
└── modified-background.js
```

### Update Configuration

Edit both files, find this line:

```javascript
API_BASE: 'https://your-domain.vercel.app'
```

Change to your actual Vercel URL:

```javascript
API_BASE: 'https://your-app-name.vercel.app'
```

### Replace in Extension

In your Lovable Infinity extension folder:

```bash
# Backup originals
cp lovable-auth.js lovable-auth.js.backup
cp background.js background.js.backup

# Copy new versions
cp /path/to/modified-lovable-auth.js lovable-auth.js
cp /path/to/modified-background.js background.js
```

### Reload Extension

1. Open `chrome://extensions/`
2. Find Lovable Infinity
3. Click the ↻ **Reload** button

---

## 10-Minute Testing

### Test 1: Validate Endpoint Works

```bash
curl -X POST https://your-app-name.vercel.app/api/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"LI-TEST-1234-5678-9ABC","hardwareFingerprint":"fp_test"}'
```

Expected response:
```json
{
  "valid": false,
  "status": "not_found",
  "reason": "License not found"
}
```

This is correct! No test licenses exist yet.

### Test 2: Create Admin Account

1. Go to `https://your-app-name.vercel.app/sign-up`
2. Create account with your email
3. Go to `https://your-app-name.vercel.app/admin`
4. You should see empty admin dashboard

### Test 3: Create Test License Tier

1. Go to `/admin/tiers`
2. Click "Create Tier"
3. Fill in:
   - Name: `test`
   - Display Name: `Test Tier`
   - Price: `99`
   - Max Seats: `5`
   - Duration: `30`
   - Features: `["Feature1", "Feature2"]`
4. Click Save

### Test 4: Create Test License

1. Go to `/admin/licenses`
2. Click "Create License"
3. Fill in:
   - Email: `test@example.com`
   - Tier: `test`
4. Click Create

You'll see a generated license key like:
```
LI-ABCD-1234-EFGH-5678-IJKL
```

### Test 5: Activate in Extension

1. Open Lovable Infinity extension
2. Click "Activate License"
3. Paste the license key
4. Click Activate

You should see:
- ✓ Green checkmark badge
- "License activated successfully" message
- License details displayed

**If you see ✗ red X:**
- Check browser console (F12) for errors
- Check Vercel logs for API errors
- Verify API_BASE URL is correct

---

## Payment Gateway Setup (20 minutes)

### Cashfree Setup

1. Log in to Cashfree dashboard
2. Go to Settings → Webhooks
3. Add webhook:
   - URL: `https://your-app-name.vercel.app/api/webhooks/cashfree`
   - Events: `PAYMENT_SUCCESS`
4. Copy webhook secret and add to `.env.local`:
   ```
   CASHFREE_WEBHOOK_SECRET=your_secret
   ```
5. Redeploy to Vercel

### Razorpay Setup

1. Log in to Razorpay dashboard
2. Go to Settings → Webhooks
3. Add webhook:
   - URL: `https://your-app-name.vercel.app/api/webhooks/razorpay`
   - Events: `payment.authorized`
4. Copy key and secret to `.env.local`:
   ```
   RAZORPAY_KEY_ID=your_key
   RAZORPAY_KEY_SECRET=your_secret
   ```
5. Redeploy to Vercel

---

## Go Live Checklist

### Before Launch

- [ ] Vercel deployment working
- [ ] Admin dashboard accessible
- [ ] Extension validates test license
- [ ] Admin can create licenses
- [ ] Payment webhooks configured
- [ ] Error handling working
- [ ] Tested on multiple devices
- [ ] License expiry works
- [ ] Seat limits work
- [ ] Admin can suspend licenses

### Launch Checklist

- [ ] Update extension in Chrome Web Store
- [ ] Announce license shop to customers
- [ ] Set up customer support email
- [ ] Monitor Vercel logs for errors
- [ ] Test first real payment

### Ongoing

- [ ] Check Vercel logs daily
- [ ] Monitor license activation rate
- [ ] Track payment success rate
- [ ] Update admin dashboard as needed

---

## Troubleshooting Quick Fixes

### Problem: "License validation failed"

**Solution:**
1. Check API_BASE URL is correct
2. Run: `curl https://your-app-name.vercel.app/api/licenses/validate`
3. Look at Vercel function logs for error

### Problem: Extension shows ✗ red X

**Solution:**
1. Open developer console (F12)
2. Look for error messages
3. Check Vercel logs: `vercel logs --follow`
4. Verify DATABASE_URL is set in Vercel

### Problem: "License key not found"

**Solution:**
1. Create a test license via admin dashboard
2. Copy exact license key
3. Paste into extension carefully (no extra spaces)
4. Try activating again

### Problem: Webhook not firing

**Solution:**
1. Test payment gateway webhook URL directly
2. Check webhook secret is configured
3. Verify webhook event is enabled in payment gateway
4. Check Vercel function logs: `vercel logs /api/webhooks/cashfree --follow`

---

## Architecture at a Glance

```
┌─────────────────────┐
│   Chrome Extension  │
│  (User's Browser)   │
└──────────┬──────────┘
           │
    POST /api/licenses/validate
           │
    ┌──────▼────────────────┐
    │   Vercel Backend      │
    │  (Next.js + Neon)     │
    └──────┬────────────────┘
           │
    ┌──────▼────────────────┐
    │   PostgreSQL Database │
    │  (Neon Serverless)    │
    └───────────────────────┘
```

---

## Key URLs

| URL | Purpose |
|-----|---------|
| `/` | Home page |
| `/sign-in` | User login |
| `/sign-up` | User registration |
| `/shop` | Buy licenses |
| `/dashboard` | My licenses |
| `/admin` | Admin overview |
| `/admin/licenses` | Manage licenses |
| `/admin/customers` | Customer list |
| `/admin/payments` | Payment history |
| `/admin/tiers` | License tiers |
| `/api/licenses/validate` | License validation (used by extension) |
| `/api/licenses/track-usage` | Usage tracking (used by extension) |
| `/api/webhooks/cashfree` | Cashfree payment callback |
| `/api/webhooks/razorpay` | Razorpay payment callback |

---

## Database Quick Reference

### licenses table
```sql
SELECT * FROM licenses;  -- All active licenses
SELECT * FROM licenses WHERE status = 'expired';  -- Expired licenses
SELECT * FROM licenses WHERE customerId = 'xyz';  -- Customer's licenses
```

### usage_tracking table
```sql
SELECT * FROM usage_tracking WHERE date = CURRENT_DATE;  -- Today's usage
SELECT SUM(usageCount) FROM usage_tracking WHERE licenseId = 'xyz';  -- Total usage
```

### payments table
```sql
SELECT * FROM payments WHERE status = 'success';  -- Successful payments
SELECT SUM(amount) FROM payments WHERE status = 'success';  -- Total revenue
```

---

## Environment Variables

### Auto-Set by v0
```
DATABASE_URL         ← Neon connection (auto-provisioned)
BETTER_AUTH_SECRET   ← Session signing key (you must set this)
BETTER_AUTH_URL      ← Your deployment URL (auto)
```

### You Need to Add

For payment gateways (set in Vercel project settings):
```
CASHFREE_WEBHOOK_SECRET = your_cashfree_webhook_secret
RAZORPAY_KEY_ID = your_razorpay_key
RAZORPAY_KEY_SECRET = your_razorpay_secret
```

---

## Support Resources

**If you need help:**

1. **Extension not validating?**
   - Read: `EXTENSION_UPDATE_GUIDE.md`
   - Check: Browser console (F12)

2. **Payment webhook not working?**
   - Read: `PAYMENT_INTEGRATION_GUIDE.md`
   - Check: Vercel logs

3. **Database issues?**
   - Check: Neon dashboard
   - Read: Neon documentation

4. **Deployment issues?**
   - Check: Vercel deployment logs
   - Read: `DEPLOYMENT_CHECKLIST.md`

---

## You're All Set! 🚀

You now have:
- ✅ Production-ready backend
- ✅ Working license validation
- ✅ Admin dashboard
- ✅ Customer portal
- ✅ Payment integration ready
- ✅ Extension integration ready

**Total setup time: ~1 hour**
**Ready to launch:** Yes!

**Next: Read `FINAL_IMPLEMENTATION_SUMMARY.md` for full details.**
