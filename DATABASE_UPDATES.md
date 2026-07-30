# Database Updates

## July 9, 2026 - Premium Member Rebrand

### License Tier Display Name Changes
All paid tiers have been updated to show "Premium Member" status in the extension:

- `tier-1y` (365 days): "Premium Member"
- `tier-1m` (30 days): "Premium Member (Monthly)"
- `tier-7d` (7 days): "Premium Member (Weekly)"
- `tier-1d` (1 day): "Premium Member (Daily)"
- `trial-15min` (0 days): "Free Trial" (unchanged)

### License Fixes
- Fixed license `LI-CFEB9C37-F4E9-88FA-C388` tier assignment from trial-15min to tier-1y
  - This license had 737 days expiry but was incorrectly labeled as Free Trial
  - Now correctly displays as "Premium Member" in the extension

### Why This Change
- Purchased customers now see a consistent "Premium Member" label instead of generic tier names
- Creates clear distinction between free trial users and paying customers
- Improves branding and user experience in the extension UI
