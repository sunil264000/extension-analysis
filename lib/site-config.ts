// Central config for the marketing site. Prices are display-only here; the
// authoritative tiers live in the database (license_tiers) and drive the shop.

export const SITE = {
  name: 'Lovable Infinity',
  extensionVersion: 'v6.4.5',
  extensionDownload: '/lovable-infinity-patched.zip',
  // Update this to your real WhatsApp order link.
  whatsapp: 'https://wa.me/8801000000000',
}

export type PlanTier = {
  id: string
  name: string
  emoji: string
  days: string
  price: number
  currency: string
  featured?: boolean
}

// Mirrors the seeded license tiers. Keep in sync with the shop / admin.
// currency is a text prefix ("Tk") to avoid missing-glyph tofu for the Taka sign.
export const PLANS: PlanTier[] = [
  { id: '3d', name: '3 Days License', emoji: '📅', days: '3 days of full access', price: 150, currency: 'Tk ' },
  { id: '7d', name: '7 Days License', emoji: '🗓️', days: '7 days of full access', price: 300, currency: 'Tk ' },
  { id: '15d', name: '15 Days License', emoji: '📆', days: '15 days of full access', price: 700, currency: 'Tk ' },
  { id: '1m', name: '1 Month License', emoji: '👑', days: '30 days of full access', price: 1200, currency: 'Tk ', featured: true },
]

export const PLAN_FEATURES = ['Full access', 'Instant delivery', 'Auto-renew reminders', '24/7 support']
