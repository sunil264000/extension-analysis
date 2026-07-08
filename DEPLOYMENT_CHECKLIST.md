# Deployment Checklist - Lovable Infinity License Validator

Complete this checklist before going to production.

---

## Pre-Deployment (Local Testing)

### Code Setup
- [ ] Clone repository locally
- [ ] Run `pnpm install`
- [ ] Create `.env.local` with DATABASE_URL
- [ ] Generate BETTER_AUTH_SECRET: `openssl rand -base64 32`
- [ ] Add to `.env.local`
- [ ] Run `pnpm dev`

### Local Testing
- [ ] Sign up works at `/sign-up`
- [ ] Sign in works at `/sign-in`
- [ ] Admin dashboard loads at `/admin`
- [ ] Can view `/admin/licenses`
- [ ] Can view `/admin/customers`
- [ ] Can create tier at `/admin/tiers`
- [ ] License validation API returns valid response
- [ ] Usage tracking API works
- [ ] No console errors in browser

### Database
- [ ] Neon project created
- [ ] All tables created successfully
- [ ] Can query licenses table
- [ ] Foreign keys setup correctly
- [ ] Indexes created for performance

---

## Vercel Deployment

### Repository Setup
- [ ] Push code to GitHub/GitLab/Bitbucket
- [ ] Create Vercel project from Git
- [ ] Select correct branch
- [ ] Framework: Next.js selected automatically

### Environment Variables
- [ ] Add `DATABASE_URL` (from Neon)
- [ ] Add `BETTER_AUTH_SECRET` (your generated value)
- [ ] Don't add payment secrets yet (testing)
- [ ] Verify env vars in Vercel dashboard
- [ ] Deploy by pushing to main branch

### Initial Deployment
- [ ] Deployment succeeds (no errors)
- [ ] Preview URL works
- [ ] Can access `/admin` on preview
- [ ] Database connection verified
- [ ] No function errors in logs

### Domain Configuration
- [ ] Add custom domain in Vercel
- [ ] Configure DNS records
- [ ] SSL certificate auto-provisioned
- [ ] HTTPS enforced
- [ ] Domain working: https://your-domain.com

---

## Payment Gateway Setup

### Cashfree Configuration

**Account Setup:**
- [ ] Create Cashfree account: https://cashfree.com
- [ ] Verify merchant account
- [ ] KYC documents submitted
- [ ] Account activated

**API Configuration:**
- [ ] Get Client ID from dashboard
- [ ] Get Client Secret from dashboard
- [ ] Add to Vercel env vars:
  - `CASHFREE_CLIENT_ID`
  - `CASHFREE_CLIENT_SECRET`

**Webhook Configuration:**
- [ ] Go to Cashfree Dashboard → Settings → Webhooks
- [ ] Add webhook URL: `https://your-domain.com/api/webhooks/cashfree`
- [ ] Select event: `PAYMENT_SUCCESS_WEBHOOK`
- [ ] Save webhook
- [ ] Test webhook delivery

**Testing:**
- [ ] Make test payment
- [ ] Verify webhook triggered
- [ ] Check license generated in database
- [ ] Verify transaction in Cashfree dashboard

### Razorpay Configuration

**Account Setup:**
- [ ] Create Razorpay account: https://razorpay.com
- [ ] Verify merchant account
- [ ] Enable test mode first
- [ ] Get to live mode

**API Configuration:**
- [ ] Get Key ID from Settings → API Keys
- [ ] Get Key Secret from Settings → API Keys
- [ ] Add to Vercel env vars:
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`

**Webhook Configuration:**
- [ ] Go to Razorpay Dashboard → Settings → Webhooks
- [ ] Add webhook URL: `https://your-domain.com/api/webhooks/razorpay`
- [ ] Select events: `payment.authorized`, `payment.captured`
- [ ] Generate webhook secret
- [ ] Add to Vercel env: `RAZORPAY_WEBHOOK_SECRET`
- [ ] Save webhook

**Testing:**
- [ ] Make test payment in test mode
- [ ] Verify webhook triggered
- [ ] Check license generated
- [ ] Verify transaction logged

---

## License Tiers

### Tier Creation
- [ ] Create "Pro" tier:
  - [ ] Name: `pro`
  - [ ] Display: `Pro Plan`
  - [ ] Price: ₹999
  - [ ] Seats: 3
  - [ ] Usage/Day: 1000
  - [ ] Duration: 30 days
  - [ ] Features: Add at least 3

- [ ] Create "Enterprise" tier:
  - [ ] Name: `enterprise`
  - [ ] Display: `Enterprise`
  - [ ] Price: ₹4999
  - [ ] Seats: Unlimited (999)
  - [ ] Usage/Day: Unlimited (0)
  - [ ] Duration: 90 days
  - [ ] Features: All features

- [ ] Verify tiers appear in shop at `/shop`

---

## Admin Setup

### First Admin Account
- [ ] Sign up at `/sign-up` (first user = admin by default)
- [ ] Note down email and password
- [ ] Verify admin access to `/admin`
- [ ] Can create/manage licenses
- [ ] Can create/manage tiers

### Customer Test Account
- [ ] Create second test account
- [ ] Verify can access `/dashboard`
- [ ] Verify can view `/shop`
- [ ] Test manual license assignment

---

## API Testing

### License Validation
```bash
curl -X POST https://your-domain.com/api/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "LI-TEST-KEY-1234",
    "hardwareFingerprint": "test-device"
  }'
```
- [ ] Returns `{ valid: true, license: {...} }`

### Usage Tracking
```bash
curl -X POST https://your-domain.com/api/licenses/track-usage \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "LI-TEST-KEY-1234",
    "hardwareFingerprint": "test-device"
  }'
```
- [ ] Returns `{ success: true, usage: {...} }`

### License Generation (requires payment)
- [ ] Make test payment
- [ ] Verify webhook generates license
- [ ] Check license in database
- [ ] Test validation with new key

---

## Extension Integration

### Prerequisites
- [ ] Have extension code ready
- [ ] Extension compatible with extension modifications
- [ ] Test environment set up

### Configuration
- [ ] Copy `/lib/extension-api-client.ts` to extension
- [ ] Update API endpoint in extension:
  - Dev: `http://localhost:3000`
  - Prod: `https://your-domain.com`
- [ ] Build extension

### Testing
- [ ] Load extension in Chrome
- [ ] Enter test license key
- [ ] Extension validates against API
- [ ] Device fingerprint generated
- [ ] License stored locally
- [ ] Usage tracking works
- [ ] Expiry check works

---

## Monitoring & Logs

### Set Up Monitoring
- [ ] Enable error tracking (optional service)
- [ ] Configure alerts
- [ ] Test alert triggers

### Logs
- [ ] Access Vercel logs: Dashboard → Function Logs
- [ ] Check for errors
- [ ] Monitor payment webhook calls
- [ ] Monitor license validation calls

### Analytics
- [ ] Visit `/admin` dashboard
- [ ] Verify charts load
- [ ] Check revenue calculation
- [ ] Verify customer count

---

## Security Checklist

### API Security
- [ ] HTTPS enforced (no HTTP)
- [ ] CORS headers correct
- [ ] Rate limiting considered
- [ ] Input validation working
- [ ] SQL injection prevented (Drizzle ORM)

### Secrets Management
- [ ] No secrets in code
- [ ] All secrets in environment variables
- [ ] Secrets rotated from defaults
- [ ] Webhook secrets protected
- [ ] Database credentials secure

### Database
- [ ] Backups enabled (Neon automatic)
- [ ] Access restricted to app only
- [ ] No direct internet access
- [ ] Indexes optimized

### Authentication
- [ ] Sessions secure (Secure + HttpOnly flags)
- [ ] Password hashing enabled (Better Auth)
- [ ] Session timeout configured
- [ ] BETTER_AUTH_SECRET strong (32+ chars)

---

## Performance

### Database Performance
- [ ] Indexes created on query columns
- [ ] Query performance acceptable (<100ms)
- [ ] Connection pooling working (Neon)

### API Performance
- [ ] License validation <500ms
- [ ] Usage tracking <500ms
- [ ] Payment webhooks <2s

### Frontend Performance
- [ ] Pages load <2s
- [ ] Charts render smoothly
- [ ] No layout shift

---

## Production Readiness

### Final Checks
- [ ] All tests pass
- [ ] No console errors
- [ ] No warnings in logs
- [ ] Database working reliably
- [ ] Webhooks reliably triggered
- [ ] Payment processing tested
- [ ] License generation working
- [ ] Extension integration working

### Documentation
- [ ] README.md updated with prod URL
- [ ] SETUP_GUIDE.md reviewed
- [ ] Team onboarded
- [ ] Support procedures documented
- [ ] Runbooks created

### Monitoring
- [ ] Alerts configured
- [ ] Dashboards set up
- [ ] On-call rotation established
- [ ] Escalation procedures defined

---

## Go-Live

### Day Of
- [ ] Notify team members
- [ ] Have rollback plan ready
- [ ] Monitor closely first hour
- [ ] Check all payment webhooks
- [ ] Verify no errors in logs
- [ ] Test license creation
- [ ] Monitor customer usage

### First Week
- [ ] Daily log review
- [ ] Performance monitoring
- [ ] Customer feedback collection
- [ ] Bug fixes if needed
- [ ] Webhook reliability check

### First Month
- [ ] Revenue verification
- [ ] Usage analytics review
- [ ] Customer support preparation
- [ ] Tier adjustments if needed
- [ ] Performance optimization

---

## Post-Deployment

### Ongoing Tasks
- [ ] Monitor API performance
- [ ] Review error logs weekly
- [ ] Check payment webhook delivery
- [ ] Verify license generation
- [ ] Monitor customer churn

### Monthly Review
- [ ] Revenue report
- [ ] Customer metrics
- [ ] API usage statistics
- [ ] Error trends
- [ ] Performance metrics

### Quarterly Review
- [ ] Tier pricing optimization
- [ ] Feature additions
- [ ] Security updates
- [ ] Database optimization

---

## Rollback Plan

If issues occur, you can:

1. **Revert to last working version:**
   ```bash
   git revert <commit-hash>
   git push origin main
   # Vercel auto-deploys
   ```

2. **Emergency maintenance mode:**
   - Deploy with feature flag disabled
   - Manual API responses
   - Database transaction rollback

3. **Contact Support:**
   - Neon support: https://neon.tech/support
   - Vercel support: https://vercel.com/support
   - Payment gateway support lines

---

## Success Criteria

System is ready for production when:

- ✅ All local tests pass
- ✅ Deployment successful
- ✅ APIs responding <500ms
- ✅ Payment webhooks working
- ✅ License validation working
- ✅ Admin dashboard functional
- ✅ Extension integration tested
- ✅ Monitoring in place
- ✅ Team trained
- ✅ Support plan ready

---

## Quick Reference

### Important URLs
- Admin: `https://your-domain.com/admin`
- Shop: `https://your-domain.com/shop`
- Dashboard: `https://your-domain.com/dashboard`
- API: `https://your-domain.com/api/licenses/validate`

### Important Contacts
- Neon: https://neon.tech/support
- Vercel: https://vercel.com/support
- Cashfree: https://cashfree.com/support
- Razorpay: https://razorpay.com/support

### Emergency Procedures
- Check Vercel logs: Dashboard → Function Logs
- Check database: Neon console
- Rollback: `git revert` + `git push`
- Disable webhooks: Pause in payment gateway

---

## Sign-off

- [ ] Project Manager: _____________ Date: _______
- [ ] Technical Lead: _____________ Date: _______
- [ ] DevOps/Infrastructure: _____________ Date: _______
- [ ] QA Lead: _____________ Date: _______

---

Congratulations! You're ready to launch the Lovable Infinity License Validator in production! 🚀
