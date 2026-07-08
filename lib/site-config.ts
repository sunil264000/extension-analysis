// Central config for the marketing site. Prices are display-only here; the
// authoritative tiers live in the database (license_tiers) and drive the shop.

export const SITE = {
  name: 'Unlimited Lovable',
  extensionVersion: 'v6.7.0',
  extensionDownload: '/unlimited-lovable.zip',
  extensionSize: '1.0 MB',
  extensionUpdated: 'July 2026',
  browser: 'Chrome · Edge · Brave',
  owner: 'Sunil Kumar',
  // Update this to your real WhatsApp order link.
  whatsapp: 'https://wa.me/8801000000000',
}

// Highlights shipped in the current build — shown in the download section.
export const CHANGELOG: string[] = [
  'Server-authorized licensing with per-device binding',
  'Encrypted step-by-step automation protocol',
  'Instant kill-switch for revoked or expired keys',
  '9 one-click AI actions in the side panel',
  'Hardened, tamper-checked extension core',
]

export type PlanTier = {
  id: string
  name: string
  emoji: string
  days: string
  price: number
  currency: string
  featured?: boolean
}

// Mirrors the seeded license tiers (license_tiers). Keep in sync with the shop
// / admin. Charged in INR via Cashfree, so we display the rupee symbol.
export const PLANS: PlanTier[] = [
  { id: 'tier-1d', name: '1 Day License', emoji: '📅', days: '1 day of full access', price: 110, currency: '₹' },
  { id: 'tier-7d', name: '1 Week License', emoji: '🗓️', days: '7 days of full access', price: 650, currency: '₹' },
  { id: 'tier-1m', name: '1 Month License', emoji: '📆', days: '30 days of full access', price: 2199, currency: '₹' },
  { id: 'tier-1y', name: '1 Year License', emoji: '👑', days: '365 days of full access', price: 15000, currency: '₹', featured: true },
]

export const PLAN_FEATURES = [
  'Unlimited prompts on lovable.dev',
  'All 9 AI power tools',
  'Instant key delivery',
  'Priority support',
]
