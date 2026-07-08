import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getAvailableTiers, initiatePayment } from '@/app/actions/customer'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

async function BuyButton({ tierId }: { tierId: string }) {
  const handleBuy = async () => {
    'use server'
    const payment = await initiatePayment(tierId)
    redirect(`/shop/checkout/${payment.paymentId}`)
  }

  return (
    <form action={handleBuy}>
      <button
        type="submit"
        className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold"
      >
        Get License
      </button>
    </form>
  )
}

export default async function ShopPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    redirect('/sign-in')
  }

  const tiers = await getAvailableTiers()

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="font-bold text-lg">
              Lovable Infinity
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm hover:text-primary">
                Dashboard
              </Link>
              <span className="text-sm text-muted-foreground">{session.user.email}</span>
              <form action="/api/auth/sign-out" method="POST">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">License Plans</h1>
          <p className="text-xl text-muted-foreground">
            Choose the perfect plan for your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="bg-card border rounded-lg overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
            >
              <div className="p-6 border-b">
                <h3 className="text-2xl font-bold mb-2">{tier.displayName}</h3>
                <p className="text-muted-foreground text-sm mb-4">{tier.description}</p>
                <div className="mb-2">
                  <span className="text-4xl font-bold">₹{tier.price}</span>
                  <span className="text-muted-foreground ml-2">/{tier.durationDays} days</span>
                </div>
              </div>

              <div className="flex-1 p-6 border-b">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Max {tier.maxSeats} seats</span>
                  </li>
                  {tier.maxUsageLimit && (
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">
                        {tier.maxUsageLimit.toLocaleString()} API calls/day
                      </span>
                    </li>
                  )}
                  {tier.features?.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6">
                <BuyButton tierId={tier.id} />
              </div>
            </div>
          ))}
        </div>

        {tiers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No license plans available yet</p>
          </div>
        )}
      </main>
    </div>
  )
}
