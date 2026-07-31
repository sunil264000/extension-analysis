# Admin Access Guide

## Your Admin Status

**Email**: ks.sunilkumar.264@gmail.com
**Role**: admin ✅
**Status**: Promoted successfully

You have been confirmed as an admin. Here's how to access the admin panel.

---

## Accessing Admin Panel

### URL
```
https://v0-unlimited-lovable.vercel.app/admin
```

### If You See "Access Denied" or Get Redirected

**This usually means session cache isn't updated. Do this:**

1. **Full Logout & Login**
   - Go to Dashboard (top right → Sign out)
   - Close all browser tabs with the site
   - Clear browser cookies and cache:
     - Press Ctrl+Shift+Delete (Windows/Linux) or Cmd+Shift+Delete (Mac)
     - Select "All time"
     - Check "Cookies and other site data"
     - Check "Cached images and files"
     - Click "Clear data"

2. **Log Back In**
   - Go to https://v0-unlimited-lovable.vercel.app
   - Sign in with ks.sunilkumar.264@gmail.com
   - Go to /admin
   - Should now show admin panel

3. **If Still Not Working**
   - Open incognito/private window
   - Sign in again
   - Try /admin in private window
   - If works in private, issue is cache

---

## Admin Panel Overview

### URL: `/admin`

**Main Dashboard** shows:
- Total Customers count
- Total Licenses count
- Total Revenue (₹)
- Transaction Count

**Quick Actions:**
- Extension Usage - View all prompts and flagged activity
- Manage Licenses - View and manage all licenses
- Manage Customers - View customer details and history
- License Tiers - Create and manage pricing tiers
- Payments - Track all payment transactions

---

## Admin Sections

### 1. Dashboard (`/admin`)
- Overview statistics
- Revenue and transaction data
- Quick navigation

### 2. Usage (`/admin/usage`)
- View all extension usage
- See prompts users send
- Review flagged activity
- Usage analytics

### 3. Licenses (`/admin/licenses`)
- View all licenses
- License key and status
- Customer associated
- Expiration dates
- Device binding info
- Create new licenses

### 4. Customers (`/admin/customers`)
- View all customers
- Email and purchase history
- Total spent
- License count
- Active status

### 5. Payments (`/admin/payments`)
- All payment transactions
- Customer email
- Amount paid
- Payment status
- Transaction date

### 6. Tiers (`/admin/tiers`)
- Create new pricing tiers
- Edit tier details
- Manage features
- Set max seats

---

## Monitoring & Diagnostics

### License Health Check API
```bash
curl https://v0-unlimited-lovable.vercel.app/api/admin/license-health
```

Returns health status of all licenses.

### System Health Check
```bash
curl https://v0-unlimited-lovable.vercel.app/api/health
```

Returns:
- System status
- License statistics
- Recent authorization failures
- API responsiveness

### License Diagnostics
```bash
curl https://v0-unlimited-lovable.vercel.app/api/admin/license-health?licenseId=UUID
```

Returns detailed diagnostics for specific license.

---

## Troubleshooting

### Problem: Can't access /admin panel

**Solution 1: Clear session cache**
1. Ctrl+Shift+Delete
2. Select "All time"
3. Clear cookies and cache
4. Sign back in

**Solution 2: Private/Incognito window**
1. Open incognito window
2. Sign in
3. Go to /admin
4. If works, regular window had stale cache

**Solution 3: Hard refresh**
1. Press Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)
2. This does hard refresh, clears cache
3. Try /admin again

### Problem: Role shows as "user" in API

**This means:**
- Database wasn't updated
- Session cache is stale
- Clear cache and re-login

**How to verify your role:**
```bash
# First, sign in and get your session
# Then check admin endpoints

curl https://v0-unlimited-lovable.vercel.app/api/admin/license-health \
  -H "Cookie: session=..." # Your session cookie
```

If you get 403, you're not admin in session.
Clear cache and re-login.

### Problem: Admin panel shows but no data

**Possible causes:**
1. API endpoints not deployed
2. Database connection issue
3. Permission denied on queries

**Check:**
- Go to /api/admin/license-health
- Should return JSON data
- If error, backend issue
- Check logs at Vercel

---

## Quick Commands

### Make Someone Admin (if needed)
```bash
# Via API
curl -X POST https://v0-unlimited-lovable.vercel.app/api/admin/promote-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# Via SQL
UPDATE "user" 
SET role = 'admin', "updatedAt" = NOW()
WHERE email = 'user@example.com'
RETURNING id, email, role;
```

### Check All Admins
```sql
SELECT id, email, name, role, "createdAt" 
FROM "user" 
WHERE role = 'admin'
ORDER BY "createdAt" DESC;
```

### Make Someone Regular User
```sql
UPDATE "user" 
SET role = 'user', "updatedAt" = NOW()
WHERE email = 'user@example.com'
RETURNING id, email, role;
```

---

## Admin Permissions

As an admin, you can:

✅ View all licenses
✅ View all customers
✅ View all payments
✅ View extension usage
✅ Manage license tiers
✅ Create new licenses
✅ Promote other users to admin
✅ Access diagnostic APIs
✅ Monitor system health

❌ Cannot: Delete customer accounts
❌ Cannot: Delete payments (audit trail)
❌ Cannot: Modify past transactions

---

## Session Management

### How Sessions Work
- Better Auth v1.6 handles sessions
- Sessions stored in database
- Session tokens in browser cookies
- Refresh happens automatically

### Session Issues
If you experience issues:

1. **Clear cookies:**
   - Chrome: Settings → Privacy → Clear browsing data → Cookies
   - Firefox: Settings → Privacy → Clear Data → Cookies

2. **Re-login:**
   - Sign out completely
   - Sign back in
   - Try admin panel again

3. **Check session:**
   - Open DevTools (F12)
   - Application → Cookies
   - Should see `session` or `better-auth` cookie
   - If missing, not logged in

---

## API Endpoints for Admins

### GET /api/admin
- Not implemented (use /admin page instead)

### GET /api/admin/license-health
- Check all licenses health
- Or specific license: ?licenseId=UUID

### GET /api/admin/license-diagnostics
- Detailed diagnostics for license

### GET /api/health
- System health status

### POST /api/admin/promote-admin
- Promote user to admin
- Body: { email: "user@example.com" }

---

## Documentation

For more information, see:

- `LICENSE_REVOCATION_FIX.md` - License system architecture
- `SYSTEM_FIXES_COMPLETE.md` - All system improvements
- `EXTENSION_SETUP_GUIDE.md` - Extension guide

---

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Clear browser cache and re-login
3. Try incognito/private window
4. Check browser console (F12) for errors
5. Review Vercel logs for backend errors

---

**Your admin access is active and ready to use!**

