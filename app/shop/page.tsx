import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getAvailableTiers } from '@/app/actions/customer'
import { isCashfreeConfigured } from '@/lib/cashfree'
import Link from 'next/link'
import { CheckCircle2, Infinity as InfinityIcon } from 'lucide-react'
import { CheckoutButton } from '@/components/shop/checkout-button'

function currencySymbol(code: string) {
  if (code === 'INR') return '₹'
  if (code === 'USD') return '$'
  return code + ' '
}

export default async function ShopPage() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      redirect('/sign-in')
    }

    const tiers = await getAvailableTiers()
    const paymentsReady = isCashfreeConfigured()
    // Hide the free trial tier from the paid shop grid.
    const paidTiers = tiers.filter((t) => Number(t.price) > 0)

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient">
              <InfinityIcon className="h-4 w-4 text-white" />
            </span>
            Unlimited Lovable
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.user.email}
            </span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="text-balance font-display text-4xl font-bold tracking-tight">
            Choose your <span className="text-gradient">license</span>
          </h1>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Unlimited prompts, no credit anxiety. Pick a duration and get your key
            instantly after payment.
          </p>
        </div>

        {!paymentsReady && (
          <div className="mx-auto mb-8 max-w-2xl rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-center text-sm text-amber-300">
            Online payments are not fully configured yet. Add your Cashfree API keys
            to enable instant checkout.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {paidTiers.map((tier) => {
            const featured = tier.durationDays >= 30
            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
                  featured ? 'border-brand ring-1 ring-brand/40' : 'border-border'
                }`}
              >
                {featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white">
                    Best value
                  </span>
                )}
                <h3 className="font-display text-lg font-semibold">{tier.displayName}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {currencySymbol(tier.currency)}
                    {Number(tier.price).toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {tier.durationDays}d
                  </span>
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {tier.features?.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {paymentsReady ? (
                    <CheckoutButton tierId={tier.id} featured={featured} />
                  ) : (
                    <button
                      disabled
                      className="w-full rounded-lg bg-secondary px-6 py-3 font-semibold text-muted-foreground opacity-60"
                    >
                      Coming soon
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {paidTiers.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No license plans available yet.
          </div>
        )}
      </main>
    </div>
  )
  } catch (error) {
    console.error('[v0] Shop page error:', error)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Shop</h1>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Something went wrong while loading the shop.'}
          </p>
          <Link href="/dashboard" className="text-brand hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }
}
